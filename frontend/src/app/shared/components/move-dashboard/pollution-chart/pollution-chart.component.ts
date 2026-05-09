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
import { SensorDataService } from '../../../../core/services/sensor-data.service';
import { SensorData } from '../../../../core/models/sensor-data.model';
import { Observable, of } from 'rxjs';
import { map, catchError, shareReplay, tap } from 'rxjs/operators';

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
 * PollutionChartComponent (Presentation Component)
 *
 * Displays a dual-line chart with PM2.5 and PM10 particle concentration trends over the last 12 hours,
 * averaged by hour. Uses independent Y axes for different scales. Connected to SensorDataService for
 * real-time backend data. Includes footer statistics with average PM2.5 and PM10 values.
 *
 * Features:
 * - Dual-line chart: PM2.5 and PM10 with independent Y axes (red and orange colors)
 * - 12-hour time window with hourly averaging and dynamic slot generation
 * - Reactive data updates from backend via Observable pattern
 * - Dark mode support with configurable colors
 * - Responsive layout with maintainAspectRatio and custom scrolling
 * - shareReplay pattern for efficiency and shared subscriptions
 * - OnPush change detection for performance
 * - Error handling with empty array fallback
 * - Average calculations for PM2.5 and PM10 displayed in footer statistics cards
 *
 * @selector app-pollution-chart
 * @standalone true
 * @imports CommonModule, BaseChartDirective
 * @example
 * <app-pollution-chart />
 */
@Component({
  selector: 'app-pollution-chart',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './pollution-chart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PollutionChartComponent {
  isLoading = true;

  /**
   * Reference to Chart.js canvas element for programmatic access.
   * @type {BaseChartDirective | undefined}
   */
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  /**
   * Observable stream of aggregated chart data with hourly labels and averaged PM2.5/PM10 values.
   * @type {Observable<ChartConfiguration<'line'>['data']>}
   */
  chartData$!: Observable<ChartConfiguration<'line'>['data']>;

  /**
   * Observable stream of average PM2.5 concentration (µg/m³) over 12-hour window.
   * @type {Observable<number>}
   */
  avgPm25$!: Observable<number>;
  avgPm10$!: Observable<number>;
  hasData$!: Observable<boolean>;

  /**
   * Observable stream of raw sensor data for the 12-hour window, fetched from backend.
   * @type {Observable<SensorData[]>}
   * @private
   */
  private sensorData$!: Observable<SensorData[]>;

  /**
   * Time window in hours for data aggregation (12-hour sliding window).
   * @type {number}
   * @private
   */
  private readonly HOURS_WINDOW = 12;

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
   * Chart.js configuration object for dual-axis line chart styling and interactivity.
   * Defines responsive layout, legend positioning, tooltip formatting, and dual Y axes labels.
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
            return label + ': ' + (value !== null ? value.toFixed(1) : 'N/A');
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
          text: 'PM 2.5 (µg/m³)',
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
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        title: {
          display: true,
          text: 'PM 10 (µg/m³)',
          color: '#f59e0b',
          font: {
            weight: 'bold',
          },
        },
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          color: '#f59e0b',
        },
      },
    },
  };

  /**
   * Initializes component with service dependencies and sets up data streams.
   * Triggers initialization of sensor data observable, chart data observable, and average observables.
   * @param {SensorDataService} sensorDataService - Service for querying historical sensor data
   */
  constructor(private sensorDataService: SensorDataService) {
    this.initializeSensorData();
    this.initializeChartData();
    this.initializeAverages();
  }

  private initializeSensorData(): void {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - this.HOURS_WINDOW * 3600000);
    this.sensorData$ = this.sensorDataService.search({ start: startTime, end: endTime }).pipe(
      tap(() => (this.isLoading = false)),
      catchError((error) => {
        console.error('Error loading particle data:', error);
        this.isLoading = false;
        return of([]);
      }),
      shareReplay(1),
    );

    this.hasData$ = this.sensorData$.pipe(
      map((data) => data.length > 0),
      shareReplay(1),
    );
  }

  /**
   * Transforms raw sensor data into hourly-aggregated chart data with dual datasets (PM2.5 and PM10).
   * Groups readings by hour, calculates average values per hour, and creates 12 hourly slots.
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

        const pm25Data: (number | null)[] = [];
        const pm10Data: (number | null)[] = [];

        for (const slot of slots) {
          const slotData = parsedData.filter((d) => d._time >= slot.start && d._time < slot.end);

          if (slotData.length > 0) {
            const avgPm25 = slotData.reduce((sum, d) => sum + (d.pm25 || 0), 0) / slotData.length;
            const avgPm10 = slotData.reduce((sum, d) => sum + (d.pm10 || 0), 0) / slotData.length;
            pm25Data.push(Math.round(avgPm25 * 100) / 100);
            pm10Data.push(Math.round(avgPm10 * 100) / 100);
          } else {
            pm25Data.push(null);
            pm10Data.push(null);
          }
        }

        return {
          labels,
          datasets: [
            {
              label: 'PM 2.5 (µg/m³)',
              data: pm25Data,
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
            {
              label: 'PM 10 (µg/m³)',
              data: pm10Data,
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
              yAxisID: 'y1',
            },
          ],
        };
      }),
      shareReplay(1),
    );
  }

  /**
   * Calculates average PM2.5 and PM10 values from sensor data for footer statistics display.
   * Creates separate observables for each particle type, returns 0 if no valid data exists.
   * Called internally by constructor after chart data initialization.
   * @private
   * @returns {void}
   */
  private initializeAverages(): void {
    this.avgPm25$ = this.sensorData$.pipe(
      map((data: SensorData[]) => {
        if (!data || data.length === 0) return 0;
        const values = data.filter((d) => d.pm25 != null).map((d) => d.pm25);
        if (values.length === 0) return 0;
        return values.reduce((a: number, b: number) => a + b, 0) / values.length;
      }),
      shareReplay(1),
    );

    this.avgPm10$ = this.sensorData$.pipe(
      map((data: SensorData[]) => {
        if (!data || data.length === 0) return 0;
        const values = data.filter((d) => d.pm10 != null).map((d) => d.pm10);
        if (values.length === 0) return 0;
        return values.reduce((a: number, b: number) => a + b, 0) / values.length;
      }),
      shareReplay(1),
    );
  }
}
