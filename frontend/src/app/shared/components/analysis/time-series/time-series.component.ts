import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BehaviorSubject, combineLatest, of, Subject } from 'rxjs';
import { catchError, switchMap, takeUntil } from 'rxjs/operators';
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
import { VehicleDetectedService } from '../../../../core/services/vehicle-detected.service';
import { SensorData } from '../../../../core/models/sensor-data.model';
import { VehicleDetected } from '../../../../core/models/vehicle.model';

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
 * Environmental metric key type for time series analysis.
 * Represents available air quality and weather parameters.
 * @typedef {('co2' | 'pm25' | 'pm10' | 'temperature' | 'humidity' | 'co' | 'no2' | 'nh3')} MetricKey
 */
type MetricKey = 'co2' | 'pm25' | 'pm10' | 'temperature' | 'humidity' | 'co' | 'no2' | 'nh3';

/**
 * Time period key for data aggregation and analysis.
 * @typedef {('24h' | '7d' | '30d')} PeriodKey
 */
type PeriodKey = '24h' | '7d' | '30d';

/**
 * Time granularity key for slot-based aggregation.
 * @typedef {('hour' | '4h' | 'day')} GranularityKey
 */
type GranularityKey = 'hour' | '4h' | 'day';

/**
 * Configuration and styling for a single environmental metric.
 * @interface MetricOption
 * @property {MetricKey} key - Unique identifier for the metric
 * @property {string} label - Human-readable display label (e.g., 'CO₂')
 * @property {string} unit - Measurement unit (e.g., 'ppm', 'µg/m³')
 * @property {string} border - Hex color for line and axis text
 * @property {string} bg - RGBA background color for line fill area
 */
interface MetricOption {
  key: MetricKey;
  label: string;
  unit: string;
  border: string;
  bg: string;
}

/**
 * Current filter state for period and metric selection.
 * @interface FilterState
 * @property {PeriodKey} period - Selected time period
 * @property {MetricKey} metric - Selected environmental metric
 */
interface FilterState {
  period: PeriodKey;
  metric: MetricKey;
}

/**
 * Time slot for data aggregation (hourly, 4-hourly, or daily).
 * @interface TimeSlot
 * @property {Date} start - Start of the time slot
 * @property {Date} end - End of the time slot
 * @property {string} label - Human-readable slot label for display
 */
interface TimeSlot {
  start: Date;
  end: Date;
  label: string;
}

/**
 * Aggregated statistics for time series visualization.
 * @interface TimeSeriesStats
 * @property {number} metricMin - Minimum metric value in period
 * @property {number} metricAvg - Average metric value in period
 * @property {number} metricMax - Maximum metric value in period
 * @property {number} vehicleTotal - Total vehicle detections in period
 * @property {MetricOption} metricOption - Configuration for displayed metric
 */
interface TimeSeriesStats {
  metricMin: number;
  metricAvg: number;
  metricMax: number;
  vehicleTotal: number;
  metricOption: MetricOption;
}

/**
 * Catalog of available environmental metrics.
 * Each metric includes display label, unit, and color coding for charts.
 * @type {MetricOption[]}
 * @const
 */
const METRICS: MetricOption[] = [
  { key: 'co2', label: 'CO₂', unit: 'ppm', border: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
  { key: 'pm25', label: 'PM2.5', unit: 'µg/m³', border: '#a855f7', bg: 'rgba(168, 85, 247, 0.1)' },
  { key: 'pm10', label: 'PM10', unit: 'µg/m³', border: '#f97316', bg: 'rgba(249, 115, 22, 0.1)' },
  {
    key: 'temperature',
    label: 'Temperatura',
    unit: '°C',
    border: '#eab308',
    bg: 'rgba(234, 179, 8, 0.1)',
  },
  {
    key: 'humidity',
    label: 'Humedad',
    unit: '%',
    border: '#3b82f6',
    bg: 'rgba(59, 130, 246, 0.1)',
  },
  { key: 'co', label: 'CO', unit: 'ppm', border: '#6b7280', bg: 'rgba(107, 114, 128, 0.1)' },
  { key: 'no2', label: 'NO₂', unit: 'ppb', border: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)' },
  { key: 'nh3', label: 'NH₃', unit: 'ppb', border: '#14b8a6', bg: 'rgba(20, 184, 166, 0.1)' },
];

/**
 * Color value for vehicle detection line in charts.
 * @type {string}
 * @const
 */
const VEHICLE_BORDER = '#6366f1';

/**
 * RGBA background color for vehicle detection line fill area.
 * @type {string}
 * @const
 */
const VEHICLE_BG = 'rgba(99, 102, 241, 0.08)';

/**
 * Available time periods for data aggregation and filtering.
 * @type {{key: PeriodKey; label: string}[]}
 * @const
 */
const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: '24h', label: 'Últimas 24h' },
  { key: '7d', label: 'Últimos 7 días' },
  { key: '30d', label: 'Últimos 30 días' },
];

/**
 * TimeSeriesComponent (Smart Component)
 *
 * Visualiza la evolución temporal de un contaminante ambiental
 * superpuesto con el conteo de vehículos detectados en el mismo período.
 * Permite identificar correlaciones entre tráfico y calidad del aire.
 *
 * Características:
 * - Gráfico de líneas dual-eje (contaminante izq. / vehículos der.)
 * - Filtros: período (24h/7d/30d) + métrica seleccionable
 * - Estadísticas: min/avg/max del contaminante + total de vehículos
 * - Agregación horaria/4h/diaria según el período
 * - Dark mode support
 *
 * @selector app-time-series
 * @standalone true
 * @imports CommonModule, FormsModule, BaseChartDirective
 * @returns Gráfico de series de tiempo con filtros
 *
 * @example
 * <app-time-series />
 */
@Component({
  selector: 'app-time-series',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseChartDirective],
  templateUrl: './time-series.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimeSeriesComponent implements OnInit, OnDestroy {
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  readonly metrics = METRICS;
  readonly periods = PERIODS;

  /**
   * Observable emitting current filter state (period and metric selection).
   * @type {BehaviorSubject<FilterState>}
   * @private
   */
  private readonly filters$ = new BehaviorSubject<FilterState>({
    period: '24h',
    metric: 'co2',
  });

  /**
   * Subject for managing subscriptions and cleanup on component destruction.
   * @type {Subject<void>}
   * @private
   */
  private readonly destroy$ = new Subject<void>();

  /**
   * Loading state indicator.
   * @type {boolean}
   */
  isLoading = true;

  /**
   * Error flag for data loading failures.
   * @type {boolean}
   */
  hasError = false;

  /**
   * Error message displayed to user when hasError is true.
   * @type {string}
   */
  errorMsg = '';

  /**
   * Chart.js data configuration for dual-axis line chart.
   * @type {ChartConfiguration<'line'>['data']}
   */
  chartData: ChartConfiguration<'line'>['data'] = { labels: [], datasets: [] };

  /**
   * Chart.js options configuration for responsive and styled line chart.
   * @type {ChartConfiguration<'line'>['options']}
   */
  chartOptions: ChartConfiguration<'line'>['options'] = this.buildChartOptions(METRICS[0]);

  /**
   * Aggregated statistics for the current time series (min/avg/max/total).
   * @type {TimeSeriesStats | null}
   */
  stats: TimeSeriesStats | null = null;

  /**
   * Returns the current filter state (period and metric).
   * @returns {FilterState} Current filter values
   */
  get currentFilter(): FilterState {
    return this.filters$.value;
  }

  /**
   * Initializes the component with service dependencies.
   * @param {SensorDataService} sensorDataService - Sensor measurement service
   * @param {VehicleDetectedService} vehicleService - Vehicle detection service
   * @param {ChangeDetectorRef} cdr - Angular change detection reference
   */
  constructor(
    private readonly sensorDataService: SensorDataService,
    private readonly vehicleService: VehicleDetectedService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  /**
   * Initializes data pipeline and subscriptions on component creation.
   * Subscribes to filter changes and loads time series data accordingly.
   */
  ngOnInit(): void {
    this.filters$
      .pipe(
        takeUntil(this.destroy$),
        switchMap((filters) => {
          this.isLoading = true;
          this.hasError = false;
          this.cdr.markForCheck();
          return this.fetchAndAggregate(filters);
        }),
      )
      .subscribe(({ chartData, chartOptions, stats }) => {
        this.chartData = chartData;
        this.chartOptions = chartOptions;
        this.stats = stats;
        this.isLoading = false;
        this.cdr.markForCheck();
      });
  }

  /**
   * Cleanup lifecycle hook.
   * Unsubscribes from all observables via destroy$ subject.
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Updates the period filter and triggers data reload.
   * @param {PeriodKey} period - Time period ('24h', '7d', or '30d')
   */
  setPeriod(period: PeriodKey): void {
    this.filters$.next({ ...this.filters$.value, period });
  }

  /**
   * Updates the metric filter and triggers data reload.
   * @param {MetricKey} metric - Environmental metric key
   */
  setMetric(metric: MetricKey): void {
    this.filters$.next({ ...this.filters$.value, metric });
  }

  /**
   * Fetches sensor and vehicle data, aggregates into time slots, and computes statistics.
   * Returns chart data and aggregated stats for the selected period and metric.
   * @param {FilterState} filters - Current filter state (period and metric)
   * @returns {Observable<{chartData: ChartConfiguration<'line'>['data']; chartOptions: ChartConfiguration<'line'>['options']; stats: TimeSeriesStats}>} Time series chart configuration and statistics
   * @private
   */
  private fetchAndAggregate(filters: FilterState) {
    const { start, end, granularity } = this.periodConfig(filters.period);
    const metricOption = METRICS.find((m) => m.key === filters.metric)!;

    const sensor$ = this.sensorDataService
      .search({ start, end, size: 10000 })
      .pipe(catchError(() => of<SensorData[]>([])));

    const vehicles$ = this.vehicleService
      .search({ start, end })
      .pipe(catchError(() => of<VehicleDetected[]>([])));

    return combineLatest([sensor$, vehicles$])
      .pipe(
        catchError((err) => {
          console.error('[TimeSeries] Error cargando datos:', err);
          this.hasError = true;
          this.errorMsg = 'Error al cargar los datos. Intenta nuevamente.';
          this.isLoading = false;
          this.cdr.markForCheck();
          return of(null);
        }),
      )
      .pipe(
        switchMap((result) => {
          if (!result) {
            return of({
              chartData: { labels: [], datasets: [] } as ChartConfiguration<'line'>['data'],
              chartOptions: this.buildChartOptions(metricOption),
              stats: null as unknown as TimeSeriesStats,
            });
          }

          const [sensorData, vehicleData] = result;
          const slots = this.buildSlots(start, end, granularity);

          // Aggregate sensor metric per slot (average)
          const metricPoints: (number | null)[] = slots.map((slot) => {
            const inSlot = sensorData.filter(
              (d) =>
                new Date(d.timestamp).getTime() >= slot.start.getTime() &&
                new Date(d.timestamp).getTime() < slot.end.getTime(),
            );
            if (inSlot.length === 0) return null;
            const sum = inSlot.reduce((acc, d) => acc + ((d[filters.metric] as number) ?? 0), 0);
            return Math.round((sum / inSlot.length) * 100) / 100;
          });

          // Aggregate vehicle count per slot
          const vehicleCounts: number[] = slots.map(
            (slot) =>
              vehicleData.filter(
                (v) =>
                  new Date(v.timestamp).getTime() >= slot.start.getTime() &&
                  new Date(v.timestamp).getTime() < slot.end.getTime(),
              ).length,
          );

          const labels = slots.map((s) => s.label);

          const chartData: ChartConfiguration<'line'>['data'] = {
            labels,
            datasets: [
              {
                label: `${metricOption.label} (${metricOption.unit})`,
                data: metricPoints,
                borderColor: metricOption.border,
                backgroundColor: metricOption.bg,
                borderWidth: 2,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: metricOption.border,
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 3,
                pointHoverRadius: 6,
                yAxisID: 'y',
                spanGaps: true,
              },
              {
                label: 'Vehículos detectados',
                data: vehicleCounts,
                borderColor: VEHICLE_BORDER,
                backgroundColor: VEHICLE_BG,
                borderWidth: 2,
                tension: 0.3,
                fill: false,
                pointBackgroundColor: VEHICLE_BORDER,
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 3,
                pointHoverRadius: 6,
                yAxisID: 'y1',
                spanGaps: true,
              },
            ],
          };

          // Compute stats
          const validMetric = metricPoints.filter((v): v is number => v !== null);
          const metricMin = validMetric.length ? Math.min(...validMetric) : 0;
          const metricMax = validMetric.length ? Math.max(...validMetric) : 0;
          const metricAvg = validMetric.length
            ? Math.round((validMetric.reduce((a, b) => a + b, 0) / validMetric.length) * 100) / 100
            : 0;
          const vehicleTotal = vehicleCounts.reduce((a, b) => a + b, 0);

          const stats: TimeSeriesStats = {
            metricMin,
            metricAvg,
            metricMax,
            vehicleTotal,
            metricOption,
          };

          return of({ chartData, chartOptions: this.buildChartOptions(metricOption), stats });
        }),
      );
  }

  /**
   * Builds and configures Chart.js options for dual-axis line chart display.
   * Includes separate Y-axes for metric values and vehicle counts, legend, tooltips, and responsive sizing.
   * @param {MetricOption} m - Metric configuration for left Y-axis labeling and color
   * @returns {ChartConfiguration<'line'>['options']} Chart.js options object
   * @private
   */
  private buildChartOptions(m: MetricOption): ChartConfiguration<'line'>['options'] {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            usePointStyle: true,
            padding: 16,
            font: { size: 12, weight: 500 },
            color: '#6B7280',
          },
        },
        tooltip: {
          backgroundColor: 'rgba(0,0,0,0.82)',
          titleColor: '#fff',
          bodyColor: '#e5e7eb',
          borderColor: '#374151',
          borderWidth: 1,
          padding: 12,
        },
      },
      scales: {
        x: {
          display: true,
          grid: { display: true, color: 'rgba(107,114,128,0.1)', drawTicks: false },
          ticks: { color: '#6B7280', font: { size: 11 }, maxTicksLimit: 16 },
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: `${m.label} (${m.unit})`,
            color: m.border,
            font: { weight: 'bold' },
          },
          grid: { display: true, color: 'rgba(107,114,128,0.1)', drawTicks: false },
          ticks: { color: m.border },
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          title: {
            display: true,
            text: 'Vehículos',
            color: VEHICLE_BORDER,
            font: { weight: 'bold' },
          },
          grid: { drawOnChartArea: false },
          ticks: { color: VEHICLE_BORDER, stepSize: 1 },
        },
      },
    };
  }

  /**
   * Determines time boundaries and granularity level for the selected period.
   * Returns adjusted date range (now - N days) and appropriate time slot granularity.
   * @param {PeriodKey} period - Time period ('24h', '7d', or '30d')
   * @returns {{start: Date; end: Date; granularity: GranularityKey}} Time range and granularity
   * @private
   */
  private periodConfig(period: PeriodKey): { start: Date; end: Date; granularity: GranularityKey } {
    const end = new Date();
    switch (period) {
      case '7d':
        return { start: new Date(end.getTime() - 7 * 24 * 3_600_000), end, granularity: '4h' };
      case '30d':
        return { start: new Date(end.getTime() - 30 * 24 * 3_600_000), end, granularity: 'day' };
      default:
        return { start: new Date(end.getTime() - 24 * 3_600_000), end, granularity: 'hour' };
    }
  }

  /**
   * Generates sequential time slots from start to end date at specified granularity.
   * Aligns slot boundaries to granularity boundaries (e.g., start of hour for 'hour').
   * @param {Date} start - Start of time range
   * @param {Date} end - End of time range
   * @param {GranularityKey} granularity - Slot size ('hour', '4h', or 'day')
   * @returns {TimeSlot[]} Array of time slots with labels
   * @private
   */
  private buildSlots(start: Date, end: Date, granularity: GranularityKey): TimeSlot[] {
    const slotMs: Record<GranularityKey, number> = {
      hour: 3_600_000,
      '4h': 4 * 3_600_000,
      day: 24 * 3_600_000,
    };
    const ms = slotMs[granularity];

    // Align to floor of granularity
    let cursor = new Date(Math.floor(start.getTime() / ms) * ms);
    const slots: TimeSlot[] = [];

    while (cursor.getTime() < end.getTime()) {
      const slotEnd = new Date(cursor.getTime() + ms);
      slots.push({ start: cursor, end: slotEnd, label: this.slotLabel(cursor, granularity) });
      cursor = slotEnd;
    }

    return slots;
  }

  /**
   * Generates human-readable label for a time slot based on granularity.
   * Formats as "day weekday HH:MM" for hourly, "day HH" for 4-hourly, and "dd Mon" for daily.
   * @param {Date} d - Date marking the start of the time slot
   * @param {GranularityKey} granularity - Time granularity level
   * @returns {string} Formatted label for display in chart
   * @private
   */
  private slotLabel(d: Date, granularity: GranularityKey): string {
    switch (granularity) {
      case 'day':
        return d.toLocaleDateString('es', { day: '2-digit', month: 'short' });
      case '4h': {
        const day = d.toLocaleDateString('es', { weekday: 'short', day: '2-digit' });
        const hour = d.getHours().toString().padStart(2, '0');
        return `${day} ${hour}h`;
      }
      default:
        return `${d.getHours().toString().padStart(2, '0')}:00`;
    }
  }
}
