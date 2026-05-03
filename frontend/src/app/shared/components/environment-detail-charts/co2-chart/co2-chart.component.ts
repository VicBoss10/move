import { Component, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import {
  ChartConfiguration,
  Chart as ChartJS,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Observable, of } from 'rxjs';
import { map, catchError, shareReplay, switchMap } from 'rxjs/operators';
import { SensorDataService } from '../../../../core/services/sensor-data.service';
import { SensorData } from '../../../../core/models/sensor-data.model';

ChartJS.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler,
);

/**
 * Co2ChartComponent (Presentation Component)
 *
 * Displays a dynamic line chart showing CO₂ concentration trends over the last 12 hours,
 * with hourly averages. Uses Chart.js for rendering with responsive, dark-mode-aware styling.
 *
 * Features:
 * - 12-hour sliding window of CO₂ data, grouped and averaged by hour
 * - Fetches latest sensor timestamp to determine time window range
 * - Query-based data loading from backend with start/end date filtering
 * - Hourly slot aggregation: calculates mean CO₂ per hour, null for empty slots
 * - Chart.js line configuration: red line (#ef4444) with semi-transparent fill, point markers
 * - Responsive layout: scrollable container on mobile (min-width 650px), full width on XL screens
 * - Legend display with point-style icons, positioned at top
 * - Tooltip with formatted ppm units and black background with white text
 * - Grid styling: light gray lines with reduced opacity, dark mode aware
 * - Y-axis title: "CO₂ (ppm)" in red, X-axis: hourly labels (HH:00 format)
 * - OnPush change detection with async pipe for data subscription
 * - Fallback: displays empty chart on data load error
 *
 * @selector app-co2-chart
 * @standalone true
 * @imports CommonModule, BaseChartDirective
 * @example
 * <app-co2-chart />
 */
@Component({
  selector: 'app-co2-chart',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './co2-chart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Co2ChartComponent {
  /**
   * Reference to Chart.js canvas element for programmatic access.
   * @type {BaseChartDirective | undefined}
   */
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  /**
   * Time window in hours for data aggregation (12-hour sliding window).
   * @type {number}
   * @private
   */
  private readonly HOURS_WINDOW = 12;

  /**
   * Observable stream of aggregated chart data with hourly labels and averaged CO₂ values.
   * @type {Observable<ChartConfiguration<'line'>['data']>}
   */
  chartData$!: Observable<ChartConfiguration<'line'>['data']>;

  /**
   * Observable stream of raw sensor data for the 12-hour window, fetched from backend.
   * @type {Observable<SensorData[]>}
   * @private
   */
  private sensorData$!: Observable<SensorData[]>;

  /**
   * Chart.js configuration object for line chart styling and interactivity.
   * Defines responsive layout, legend positioning, tooltip formatting, and axis labels.
   * @type {ChartConfiguration<'line'>['options']}
   */
  chartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: true,
    layout: {
      padding: {
        left: 20,
        right: 20,
        top: 0,
        bottom: 0,
      },
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 12,
            weight: 500,
          },
          color: '#6B7280',
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        padding: 12,
        displayColors: true,
        callbacks: {
          label: function (context) {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return label + ': ' + (value !== null ? value.toFixed(1) : 'N/A') + ' ppm';
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: true,
          drawOnChartArea: true,
          drawTicks: false,
          color: 'rgba(107, 114, 128, 0.1)',
        },
        ticks: {
          color: '#6B7280',
          font: {
            size: 11,
          },
          maxTicksLimit: 12,
        },
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'CO₂ (ppm)',
          color: '#ef4444',
          font: {
            weight: 'bold',
          },
        },
        grid: {
          display: true,
          drawOnChartArea: true,
          drawTicks: false,
          color: 'rgba(107, 114, 128, 0.1)',
        },
        ticks: {
          color: '#ef4444',
        },
      },
    },
  };

  /**
   * Default empty chart data returned when no sensor data is available.
   * @type {ChartConfiguration<'line'>['data']}
   * @private
   */
  private readonly defaultChartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: [],
  };

  /**
   * Initializes component with service dependencies and sets up data streams.
   * Triggers initialization of sensor data observable and chart data observable.
   * @param {SensorDataService} sensorDataService - Service for querying historical CO₂ sensor data
   */
  constructor(private sensorDataService: SensorDataService) {
    this.initializeSensorData();
    this.initializeChartData();
  }

  /**
   * Fetches the latest sensor timestamp, then queries the backend for all sensor data
   * within the 12-hour window ending at that timestamp.
   * Errors are caught and return empty array for graceful fallback.
   * @private
   */
  private initializeSensorData(): void {
    this.sensorData$ = this.sensorDataService.getLatest().pipe(
      switchMap((latest) => {
        const endTime = new Date(latest.timestamp);
        const startTime = new Date(endTime.getTime() - this.HOURS_WINDOW * 3600000);
        return this.sensorDataService.search({ start: startTime, end: endTime });
      }),
      catchError((error) => {
        console.error('Error cargando datos de CO₂:', error);
        return of([]);
      }),
      shareReplay(1),
    );
  }

  /**
   * Transforms raw sensor data into hourly-aggregated chart data.
   * Groups readings by hour, calculates average CO₂ per hour, and creates 12 hourly slots.
   * Parses timestamps, filters invalid dates, and creates HH:00 format labels.
   * Returns default empty chart on zero or invalid data.
   * @private
   */
  private initializeChartData(): void {
    this.chartData$ = this.sensorData$.pipe(
      map((data: SensorData[]) => {
        if (!data || data.length === 0) {
          return this.defaultChartData;
        }

        const parsedData = data
          .map((d) => ({ ...d, _time: new Date(d.timestamp) }))
          .filter((d) => !isNaN(d._time.getTime()))
          .sort((a, b) => a._time.getTime() - b._time.getTime());

        if (parsedData.length === 0) {
          return this.defaultChartData;
        }

        const latestTime = parsedData[parsedData.length - 1]._time;
        const latestSlotStart = new Date(
          latestTime.getFullYear(),
          latestTime.getMonth(),
          latestTime.getDate(),
          latestTime.getHours(),
          0,
          0,
          0,
        );

        const slots: { start: Date; end: Date; label: string }[] = [];
        for (let i = this.HOURS_WINDOW - 1; i >= 0; i--) {
          const slotStart = new Date(latestSlotStart.getTime() - i * 3600000);
          const slotEnd = new Date(slotStart.getTime() + 3600000);
          const label = `${slotStart.getHours().toString().padStart(2, '0')}:00`;
          slots.push({ start: slotStart, end: slotEnd, label });
        }

        const labels = slots.map((s) => s.label);
        const co2Data: (number | null)[] = [];

        for (const slot of slots) {
          const slotData = parsedData.filter((d) => d._time >= slot.start && d._time < slot.end);
          if (slotData.length > 0) {
            const avg = slotData.reduce((sum, d) => sum + (d.co2 || 0), 0) / slotData.length;
            co2Data.push(Math.round(avg * 100) / 100);
          } else {
            co2Data.push(null);
          }
        }

        return {
          labels,
          datasets: [
            {
              label: 'CO₂ (ppm)',
              data: co2Data,
              borderColor: '#ef4444',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              borderWidth: 2,
              tension: 0.4,
              fill: true,
              pointBackgroundColor: '#ef4444',
              pointBorderColor: '#fff',
              pointBorderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 6,
              yAxisID: 'y',
            },
          ],
        };
      }),
      shareReplay(1),
    );
  }
}
