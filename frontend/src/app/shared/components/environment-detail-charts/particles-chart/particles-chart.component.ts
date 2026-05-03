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
 * ParticlesChartComponent (Presentation Component)
 *
 * Displays a comparative line chart for PM2.5 and PM10 particle concentrations over a 24-hour sliding window with hourly aggregation.
 *
 * Features:
 * - Dual-line chart: indigo line for PM2.5 (#6366f1), orange line for PM10 (#f97316)
 * - Semi-transparent gradient fills (0.1 opacity) beneath each line for visual depth
 * - 24-hour sliding window with hourly aggregation calculated from backend data
 * - Enhanced point styling: 4px radius default, 6px on hover, white border, color-coded fill
 * - Dynamic legend with point style symbols (usePointStyle: true)
 * - Responsive grid layout with automatic overflow scrolling on small screens (min-width 650px)
 * - Max-height 380px with responsive sizing
 * - Tooltip with fixed 1 decimal format for both series
 * - X-axis shows hourly labels (HH:00 format) with max 12 ticks
 * - Y-axis displays "Partículas (µg/m³)" title with grid overlay
 * - Fade-in animation on chart load (CSS @keyframes)
 * - Chart.js Line controller with OnPush change detection and async pipe subscription
 * - Fallback: displays zero-state on data load error
 *
 * @selector app-particles-chart
 * @standalone true
 * @imports CommonModule, BaseChartDirective
 * @example
 * <app-particles-chart />
 */
@Component({
  selector: 'app-particles-chart',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './particles-chart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParticlesChartComponent {
  /**
   * Reference to ng2-charts BaseChartDirective for programmatic chart control.
   * @type {BaseChartDirective | undefined}
   */
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  /**
   * Time window in hours for chart data aggregation (24-hour sliding window).
   * @type {number}
   * @private
   */
  private readonly HOURS_WINDOW = 24;

  /**
   * Observable stream of Chart.js line chart configuration data with PM2.5 and PM10 datasets.
   * @type {Observable<ChartConfiguration<'line'>['data']>}
   */
  chartData$!: Observable<ChartConfiguration<'line'>['data']>;

  /**
   * Observable stream of current PM2.5 and PM10 values from latest sensor reading.
   * @type {Observable<{ pm25: number; pm10: number }>}
   */
  pmValues$!: Observable<{
    pm25: number;
    pm10: number;
  }>;

  /**
   * Shared Observable of historical sensor data for the 24-hour window with hourly aggregation.
   * @type {Observable<SensorData[]>}
   * @private
   */
  private sensorData$!: Observable<SensorData[]>;

  /**
   * Readonly Chart.js configuration object for line chart styling and interaction.
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
          text: 'Particles (µg/m³)',
          color: '#6B7280',
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
          color: '#6B7280',
        },
      },
    },
  };

  /**
   * Default zero-state chart data returned on error.
   * @type {ChartConfiguration<'line'>['data']}
   * @private
   */
  private readonly defaultChartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: [],
  };

  /**
   * Initializes component with service dependency and sets up three data streams.
   * Triggers initialization of sensor data, chart data, and current PM values observables.
   * @param {SensorDataService} sensorDataService - Service for querying particle sensor data
   */
  constructor(private sensorDataService: SensorDataService) {
    this.initializeSensorData();
    this.initializeChartData();
    this.initializePMValues();
  }

  /**
   * Retrieves latest sensor timestamp to establish time window, then queries backend for 24-hour range.
   * Uses switchMap to switch to search observable once latest reading is obtained.
   * Handles timestamp parsing errors with fallback to empty array.
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
        console.error('Error loading particle data:', error);
        return of([]);
      }),
      shareReplay(1),
    );
  }

  /**
   * Transforms sensor data into Chart.js line chart configuration by grouping into hourly slots and averaging.
   * Creates 24 hourly slots backward from latest timestamp hour.
   * Calculates average PM2.5 and PM10 per slot; null for empty slots.
   * Values rounded to 2 decimal places; returns zero-state on empty or invalid data.
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
              label: 'PM2.5 (µg/m³)',
              data: pm25Data,
              borderColor: '#6366f1',
              backgroundColor: 'rgba(99, 102, 241, 0.1)',
              borderWidth: 2,
              tension: 0.4,
              fill: true,
              pointBackgroundColor: '#6366f1',
              pointBorderColor: '#fff',
              pointBorderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 6,
              yAxisID: 'y',
            },
            {
              label: 'PM10 (µg/m³)',
              data: pm10Data,
              borderColor: '#f97316',
              backgroundColor: 'rgba(249, 115, 22, 0.1)',
              borderWidth: 2,
              tension: 0.4,
              fill: true,
              pointBackgroundColor: '#f97316',
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

  /**
   * Initializes observable of current PM2.5 and PM10 values from latest sensor reading.
   * Rounds values to 1 decimal place; returns zero-state on error.
   * @private
   * @returns {void}
   */
  private initializePMValues(): void {
    this.pmValues$ = this.sensorDataService.getLatest().pipe(
      map((latestData: SensorData) => ({
        pm25: Math.round((latestData?.pm25 || 0) * 10) / 10,
        pm10: Math.round((latestData?.pm10 || 0) * 10) / 10,
      })),
      catchError(() =>
        of({
          pm25: 0,
          pm10: 0,
        }),
      ),
      shareReplay(1),
    );
  }
}
