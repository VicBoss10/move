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

// Register Chart.js scales and elements
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
 * GasesComparisonChartComponent (Presentation Component)
 *
 * Displays multi-series line chart comparing three gas concentrations (CO, NO₂, NH₃) over 24-hour sliding window.
 *
 * Features:
 * - Three-series line chart: CO (purple), NO₂ (amber), NH₃ (cyan) with distinct colors and units
 * - 24-hour sliding window with hourly aggregation: calculates mean concentration per hour, null for empty slots
 * - Fetches latest sensor timestamp to determine time window range
 * - Query-based data loading from backend with start/end date filtering
 * - Chart.js multi-line configuration: semi-transparent fill under each series, point markers
 * - Responsive layout: scrollable container on mobile (min-width 650px), full width on XL screens
 * - Legend display with point-style icons, positioned at top
 * - Tooltip with formatted units: CO (ppm), NO₂ (µg/m³), NH₃ (ppb), black background with white text
 * - Grid styling: light gray lines with reduced opacity, dark mode aware
 * - Y-axis title: "Concentration (µg/m³, ppm, ppb)" in cyan (NH₃ color), X-axis: hourly labels (HH:00 format)
 * - OnPush change detection with async pipe for data subscription
 * - Fallback: displays empty chart on data load error
 *
 * @selector app-gases-comparison-chart
 * @standalone true
 * @imports CommonModule, BaseChartDirective
 * @example
 * <app-gases-comparison-chart />
 */
@Component({
  selector: 'app-gases-comparison-chart',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './gases-comparison-chart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GasesComparisonChartComponent {
  /**
   * Reference to Chart.js canvas element for programmatic access.
   * @type {BaseChartDirective | undefined}
   */
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  /**
   * Time window in hours for data aggregation (24-hour sliding window).
   * @type {number}
   * @private
   */
  private readonly HOURS_WINDOW = 24;

  /**
   * Observable stream of aggregated multi-series chart data with hourly labels and averaged gas values.
   * @type {Observable<ChartConfiguration<'line'>['data']>}
   */
  chartData$!: Observable<ChartConfiguration<'line'>['data']>;

  /**
   * Observable stream of raw sensor data for the 24-hour window, fetched from backend.
   * @type {Observable<SensorData[]>}
   * @private
   */
  private sensorData$!: Observable<SensorData[]>;

  /**
   * Chart.js configuration object for multi-series line chart styling and interactivity.
   * Defines responsive layout, legend positioning, tooltip formatting, and axis labels.
   * @type {ChartConfiguration<'line'>['options']}
   */
  readonly chartOptions: ChartConfiguration<'line'>['options'] = {
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
            return label + ': ' + (value !== null ? value.toFixed(2) : 'N/A');
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
          maxTicksLimit: 24,
        },
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Concentration (µg/m³, ppm, ppb)',
          color: '#06b6d4',
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
          color: '#06b6d4',
        },
      },
    },
  };

  private readonly defaultChartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: [],
  };

  /**
   * Initializes component with service dependency and sets up data streams.
   * Triggers initialization of sensor data and chart data observables.
   * @param {SensorDataService} sensorDataService - Service for querying historical gas sensor data
   */
  constructor(private sensorDataService: SensorDataService) {
    this.initializeSensorData();
    this.initializeChartData();
  }

  /**
   * Fetches the latest sensor timestamp, then queries the backend for all sensor data
   * within the 24-hour window ending at that timestamp.
   * Errors are caught and return empty array for graceful fallback.
   * @private
   * @returns {void}
   */
  private initializeSensorData(): void {
    this.sensorData$ = this.sensorDataService.getLatest().pipe(
      switchMap((latest) => {
        const endTime = new Date(latest.timestamp);
        const startTime = new Date(endTime.getTime() - this.HOURS_WINDOW * 3600000);
        return this.sensorDataService.search({ start: startTime, end: endTime });
      }),
      catchError((error) => {
        console.error('Error cargando datos de gases:', error);
        return of([]);
      }),
      shareReplay(1),
    );
  }

  /**
   * Transforms raw sensor data into hourly-aggregated multi-series chart data.
   * Groups readings by hour for each gas, calculates average per hour, and creates 24 hourly slots.
   * Parses timestamps, filters invalid dates, and creates HH:00 format labels.
   * Returns default empty chart on zero or invalid data.
   * @private
   * @returns {void}
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

        // Create 24 hourly slots backwards from latest hour
        const slots: { start: Date; end: Date; label: string }[] = [];
        for (let i = this.HOURS_WINDOW - 1; i >= 0; i--) {
          const slotStart = new Date(latestSlotStart.getTime() - i * 3600000);
          const slotEnd = new Date(slotStart.getTime() + 3600000);
          const label = `${slotStart.getHours().toString().padStart(2, '0')}:00`;
          slots.push({ start: slotStart, end: slotEnd, label });
        }

        const labels = slots.map((s) => s.label);
        const coData: (number | null)[] = [];
        const no2Data: (number | null)[] = [];
        const nh3Data: (number | null)[] = [];

        for (const slot of slots) {
          const slotData = parsedData.filter((d) => d._time >= slot.start && d._time < slot.end);
          if (slotData.length > 0) {
            const avgCo = slotData.reduce((sum, d) => sum + (d.co || 0), 0) / slotData.length;
            const avgNo2 = slotData.reduce((sum, d) => sum + (d.no2 || 0), 0) / slotData.length;
            const avgNh3 = slotData.reduce((sum, d) => sum + (d.nh3 || 0), 0) / slotData.length;
            coData.push(Math.round(avgCo * 100) / 100);
            no2Data.push(Math.round(avgNo2 * 100) / 100);
            nh3Data.push(Math.round(avgNh3 * 100) / 100);
          } else {
            coData.push(null);
            no2Data.push(null);
            nh3Data.push(null);
          }
        }

        return {
          labels,
          datasets: [
            {
              label: 'CO (ppm)',
              data: coData,
              borderColor: '#8b5cf6',
              backgroundColor: 'rgba(139, 92, 246, 0.1)',
              borderWidth: 2,
              tension: 0.4,
              fill: true,
              pointBackgroundColor: '#8b5cf6',
              pointBorderColor: '#fff',
              pointBorderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 6,
            },
            {
              label: 'NO₂ (µg/m³)',
              data: no2Data,
              borderColor: '#f59e0b',
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              borderWidth: 2,
              tension: 0.4,
              fill: true,
              pointBackgroundColor: '#f59e0b',
              pointBorderColor: '#fff',
              pointBorderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 6,
            },
            {
              label: 'NH₃ (ppb)',
              data: nh3Data,
              borderColor: '#06b6d4',
              backgroundColor: 'rgba(6, 182, 212, 0.1)',
              borderWidth: 2,
              tension: 0.4,
              fill: true,
              pointBackgroundColor: '#06b6d4',
              pointBorderColor: '#fff',
              pointBorderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 6,
            },
          ],
        };
      }),
      shareReplay(1),
    );
  }
}
