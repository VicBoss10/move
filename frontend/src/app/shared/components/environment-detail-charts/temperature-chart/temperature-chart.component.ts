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
 * TemperatureChartComponent (Presentation Component)
 *
 * Displays a line chart visualization of temperature trends over a 24-hour sliding window with hourly aggregation.
 *
 * Features:
 * - Single orange line (#f97316) showing temperature progression in 24-hour backward sliding window from latest timestamp
 * - Hourly aggregation: creates 24 hourly slots, calculates average temperature per slot, rounds to 2 decimal places
 * - X-axis: hourly time labels (HH:00 format), maximum 12 ticks
 * - Y-axis: linear scale with unit label "Temperatura (°C)", dynamic range based on data values, no zero-lock
 * - Point styling: 5px radius default, 8px on hover, white 3px border, orange fill, color change to brown on hover
 * - Tooltip: dark background with temperature value formatted to 1 decimal place with °C unit
 * - Responsive: min-width 650px scrollable container on mobile, full width on XL screens
 * - Animation on load: 750ms fade-in with easeInOutQuart easing
 * - Data source: switchMap from latest timestamp to search within 24-hour window, filters valid dates, sorts ascending
 * - Error handling: returns empty dataset on service failure with console error logging
 * - OnPush change detection with async pipe subscription
 * - Fallback: displays empty chart on error
 *
 * Private observables:
 * - sensorData$: Observable<SensorData[]> - filtered and sorted historical data within 24-hour window
 * - chartData$: Observable<ChartConfiguration['data']> - prepared chart dataset and labels
 *
 * @selector app-temperature-chart
 * @standalone true
 * @imports CommonModule, BaseChartDirective
 * @example
 * <app-temperature-chart />
 */
@Component({
  selector: 'app-temperature-chart',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './temperature-chart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TemperatureChartComponent {
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  /**
   * Hours window for historical data aggregation (24-hour backward sliding window).
   * @type {number}
   * @private
   */
  private readonly HOURS_WINDOW = 24;

  /**
   * Observable emitting prepared chart dataset and labels with hourly aggregated temperature data.
   * @type {Observable<ChartConfiguration<'line'>['data']>}
   */
  chartData$!: Observable<ChartConfiguration<'line'>['data']>;

  /**
   * Observable stream of sensor data filtered within 24-hour window and sorted by timestamp.
   * @type {Observable<SensorData[]>}
   * @private
   */
  private sensorData$!: Observable<SensorData[]>;

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
            return `${context.dataset.label}: ${value.toFixed(1)}°C`;
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
          text: 'Temperatura (°C)',
          color: '#f97316',
          font: {
            weight: 700,
            size: 13,
          },
          padding: 12,
        },
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
        },
        beginAtZero: false,
      },
    },
  };

  private readonly defaultChartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: [],
  };

  constructor(private sensorDataService: SensorDataService) {
    this.initializeSensorData();
    this.initializeChartData();
  }

  /**
   * Initializes sensor data stream from latest timestamp and searches within 24-hour window.
   * Filters for valid dates, sorts by timestamp ascending, and caches result with shareReplay(1).
   * Returns empty array on error with console logging.
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
        console.error('Error loading temperature data:', error);
        return of([]);
      }),
      shareReplay(1),
    );
  }

  /**
   * Transforms sensor data into chart dataset with 24 hourly slots and aggregated temperature averages.
   * Creates hourly backward slots from latest timestamp, calculates mean temperature per slot rounded to 2 decimals.
   * Returns default empty dataset if no data available.
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
        const tempData: (number | null)[] = [];

        for (const slot of slots) {
          const slotData = parsedData.filter((d) => d._time >= slot.start && d._time < slot.end);
          if (slotData.length > 0) {
            const avg =
              slotData.reduce((sum, d) => sum + (d.temperature || 0), 0) / slotData.length;
            tempData.push(Math.round(avg * 100) / 100);
          } else {
            tempData.push(null);
          }
        }

        return {
          labels,
          datasets: [
            {
              label: 'Temperatura (°C)',
              data: tempData,
              borderColor: '#f97316',
              backgroundColor: 'rgba(249, 115, 22, 0.08)',
              borderWidth: 3,
              tension: 0.5,
              fill: true,
              pointBackgroundColor: '#f97316',
              pointBorderColor: '#fff',
              pointBorderWidth: 3,
              pointRadius: 5,
              pointHoverRadius: 8,
              pointHoverBackgroundColor: '#b45309',
              pointHoverBorderWidth: 3,
              yAxisID: 'y',
              segment: {
                borderColor: (ctx: Record<string, unknown>) => {
                  if (
                    (ctx['p0DataIndex'] as number | undefined) !== undefined &&
                    (ctx['p1DataIndex'] as number | undefined) !== undefined
                  ) {
                    return '#f97316';
                  }
                  return 'rgba(249, 115, 22, 0.5)';
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
