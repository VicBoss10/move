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

// Registrar los scales y elementos
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
 * HumidityChartComponent (Presentation Component)
 *
 * Displays relative humidity trends over a 24-hour sliding window with hourly aggregation.
 *
 * Features:
 * - Single-series line chart showing humidity percentage (0-100%) over 24 hours
 * - 24-hour sliding window with hourly aggregation: calculates mean humidity per hour, null for empty slots
 * - Fetches latest sensor timestamp to determine time window range
 * - Query-based data loading from backend with start/end date filtering
 * - Chart.js line configuration: blue line (#3b82f6) with light semi-transparent fill
 * - Enhanced point styling: 5px radius, white border, blue hover state with larger radius
 * - Responsive layout: scrollable container on mobile (min-width 650px), full width on XL screens
 * - Legend display with point-style icons, positioned at top
 * - Tooltip with dark background, formatted percentage units, enhanced styling
 * - Grid styling: light blue-gray lines with reduced opacity, dark mode aware
 * - Y-axis: locked range 0-100%, blue title "Humedad (%)", percentage suffix on ticks
 * - X-axis: hourly labels (HH:00 format), max 12 ticks
 * - OnPush change detection with async pipe for data subscription
 * - Fallback: displays empty chart on data load error
 *
 * @selector app-humidity-chart
 * @standalone true
 * @imports CommonModule, BaseChartDirective
 * @example
 * <app-humidity-chart />
 */
@Component({
  selector: 'app-humidity-chart',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './humidity-chart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HumidityChartComponent {
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
   * Observable stream of aggregated chart data with hourly labels and averaged humidity values.
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
   * Default empty chart data returned when no sensor data is available.
   * @type {ChartConfiguration<'line'>['data']}
   * @private
   */
  private readonly defaultChartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: [],
  };

  /**
   * Chart.js configuration object for line chart styling and interactivity.
   * Defines responsive layout, legend positioning, tooltip formatting, and axis labels.
   * @type {ChartConfiguration<'line'>['options']}
   */
  readonly chartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: true,
    animation: {
      duration: 750,
      easing: 'easeInOutQuart',
    },
    interaction: {
      mode: 'index',
      intersect: false,
    },
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
          padding: 20,
          font: {
            size: 13,
            weight: 600,
          },
          color: '#374151',
        },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: '#fff',
        bodyColor: '#f1f5f9',
        borderColor: '#64748b',
        borderWidth: 1,
        padding: 16,
        displayColors: true,
        usePointStyle: true,
        boxPadding: 8,
        titleFont: {
          size: 14,
          weight: 600,
        },
        bodyFont: {
          size: 13,
        },
        callbacks: {
          label: function (context) {
            const value = context.parsed.y ?? 0;
            return `${context.dataset.label}: ${value.toFixed(1)}%`;
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
          color: 'rgba(203, 213, 225, 0.2)',
          lineWidth: 1,
        },
        ticks: {
          color: '#64748b',
          font: {
            size: 12,
            weight: 500,
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
          text: 'Humedad (%)',
          color: '#3b82f6',
          font: {
            weight: 700,
            size: 13,
          },
          padding: 12,
        },
        min: 0,
        max: 100,
        grid: {
          display: true,
          drawOnChartArea: true,
          drawTicks: false,
          color: 'rgba(203, 213, 225, 0.15)',
          lineWidth: 1,
        },
        ticks: {
          color: '#64748b',
          font: {
            size: 12,
            weight: 500,
          },
          padding: 8,
          callback: function (value) {
            return value + '%';
          },
        },
      },
    },
  };

  /**
   * Initializes component with service dependency and sets up data streams.
   * Triggers initialization of sensor data and chart data observables.
   * @param {SensorDataService} sensorDataService - Service for querying historical humidity sensor data
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
        console.error('Error cargando datos de humedad:', error);
        return of([]);
      }),
      shareReplay(1),
    );
  }

  /**
   * Transforms raw sensor data into hourly-aggregated chart data.
   * Groups readings by hour, calculates average humidity per hour, and creates 24 hourly slots.
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

        const slots: { start: Date; end: Date; label: string }[] = [];
        for (let i = this.HOURS_WINDOW - 1; i >= 0; i--) {
          const slotStart = new Date(latestSlotStart.getTime() - i * 3600000);
          const slotEnd = new Date(slotStart.getTime() + 3600000);
          const label = `${slotStart.getHours().toString().padStart(2, '0')}:00`;
          slots.push({ start: slotStart, end: slotEnd, label });
        }

        const labels = slots.map((s) => s.label);
        const humidityData: (number | null)[] = [];

        for (const slot of slots) {
          const slotData = parsedData.filter((d) => d._time >= slot.start && d._time < slot.end);
          if (slotData.length > 0) {
            const avg = slotData.reduce((sum, d) => sum + (d.humidity || 0), 0) / slotData.length;
            humidityData.push(Math.round(avg * 100) / 100);
          } else {
            humidityData.push(null);
          }
        }

        return {
          labels,
          datasets: [
            {
              label: 'Humedad Relativa (%)',
              data: humidityData,
              borderColor: '#3b82f6',
              backgroundColor: 'rgba(59, 130, 246, 0.08)',
              borderWidth: 3,
              fill: true,
              tension: 0.5,
              pointRadius: 5,
              pointHoverRadius: 8,
              pointBackgroundColor: '#3b82f6',
              pointBorderColor: '#ffffff',
              pointBorderWidth: 3,
              pointHoverBackgroundColor: '#1e40af',
              pointHoverBorderWidth: 3,
              yAxisID: 'y',
              segment: {
                borderColor: (ctx: Record<string, unknown>) => {
                  if (
                    (ctx['p0DataIndex'] as number | undefined) !== undefined &&
                    (ctx['p1DataIndex'] as number | undefined) !== undefined
                  ) {
                    return '#3b82f6';
                  }
                  return 'rgba(59, 130, 246, 0.5)';
                },
              } as Record<string, unknown>,
            },
          ],
        };
      }),
      shareReplay(1),
    );
  }
}
