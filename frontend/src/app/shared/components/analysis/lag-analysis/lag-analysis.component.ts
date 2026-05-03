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
  BarController,
  BarElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
} from 'chart.js';
import { SensorDataService } from '../../../../core/services/sensor-data.service';
import { VehicleDetectedService } from '../../../../core/services/vehicle-detected.service';
import { SensorData } from '../../../../core/models/sensor-data.model';
import { VehicleDetected } from '../../../../core/models/vehicle.model';

ChartJS.register(BarController, BarElement, LinearScale, CategoryScale, Tooltip, Legend);

/**
 * Environmental metric key type.
 * @typedef {'co2' | 'pm25' | 'pm10' | 'temperature' | 'humidity' | 'co' | 'no2' | 'nh3'} MetricKey
 */
type MetricKey = 'co2' | 'pm25' | 'pm10' | 'temperature' | 'humidity' | 'co' | 'no2' | 'nh3';

/**
 * Time period key type.
 * @typedef {'3d' | '7d' | '30d'} PeriodKey
 */
type PeriodKey = '3d' | '7d' | '30d';

/**
 * Metric display configuration.
 * @interface MetricOption
 * @property {MetricKey} key - Metric identifier.
 * @property {string} label - Display label with Unicode.
 * @property {string} unit - Measurement unit.
 * @property {string} color - Hex color for charts.
 */
interface MetricOption {
  key: MetricKey;
  label: string;
  unit: string;
  color: string;
}

/**
 * Cross-correlation result at a specific lag.
 * @interface LagResult
 * @property {number} lag - Lag in time slots (negative = vehicles lead).
 * @property {number} lagHours - Lag in hours.
 * @property {number} r - Pearson correlation coefficient.
 */
interface LagResult {
  lag: number;
  lagHours: number;
  r: number;
}

/**
 * Summary of lag analysis with best result and interpretation.
 * @interface LagSummary
 * @property {LagResult} bestLag - Lag with highest |r|.
 * @property {string} interpretation - Human-readable interpretation.
 * @property {LagResult[]} results - All lag results.
 */
interface LagSummary {
  bestLag: LagResult;
  interpretation: string;
  results: LagResult[];
}

/**
 * Available environmental metrics.
 * @constant METRICS
 * @type {MetricOption[]}
 */
const METRICS: MetricOption[] = [
  { key: 'co2', label: 'CO₂', unit: 'ppm', color: '#ef4444' },
  { key: 'pm25', label: 'PM2.5', unit: 'µg/m³', color: '#a855f7' },
  { key: 'pm10', label: 'PM10', unit: 'µg/m³', color: '#f97316' },
  { key: 'temperature', label: 'Temperatura', unit: '°C', color: '#eab308' },
  { key: 'humidity', label: 'Humedad', unit: '%', color: '#3b82f6' },
  { key: 'co', label: 'CO', unit: 'ppm', color: '#6b7280' },
  { key: 'no2', label: 'NO₂', unit: 'ppb', color: '#22c55e' },
  { key: 'nh3', label: 'NH₃', unit: 'ppb', color: '#14b8a6' },
];

/**
 * Available analysis periods.
 * @constant PERIODS
 * @type {Array<{key: PeriodKey, label: string}>}
 */
const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: '3d', label: 'Últimos 3 días' },
  { key: '7d', label: 'Últimos 7 días' },
  { key: '30d', label: 'Últimos 30 días' },
];

/**
 * Time slot duration in milliseconds (1 hour).
 * @constant SLOT_MS
 */
const SLOT_MS = 3_600_000;

/**
 * Maximum lag to evaluate in each direction (±12 hours).
 * @constant MAX_LAG
 */
const MAX_LAG = 12;

/**
 * LagAnalysisComponent
 *
 * Calculates and visualizes cross-correlation (CCF) between hourly vehicle counts
 * and hourly-averaged environmental metric, evaluating lags from −12h to +12h.
 *
 * A negative lag (k < 0) indicates vehicles predict the pollutant change k hours ahead.
 * A positive lag (k > 0) indicates the pollutant rises before vehicle traffic increases.
 *
 * Features:
 * - Bar chart: correlation coefficient vs. lag
 * - Detailed results table with strength and direction
 * - Best lag interpretation card
 * - Selectable period (3d/7d/30d) and metric
 * - Full dark mode support
 *
 * @class LagAnalysisComponent
 * @implements {OnInit, OnDestroy}
 * @selector app-lag-analysis
 * @standalone true
 * @imports CommonModule, FormsModule, BaseChartDirective
 */
@Component({
  selector: 'app-lag-analysis',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseChartDirective],
  templateUrl: './lag-analysis.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LagAnalysisComponent implements OnInit, OnDestroy {
  /**
   * Reference to chart directive for dynamic updates.
   */
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  /**
   * Available metrics for analysis.
   * @readonly
   */
  readonly metrics = METRICS;

  /**
   * Available time periods.
   * @readonly
   */
  readonly periods = PERIODS;

  /**
   * Current filter state (period and metric).
   * @private
   */
  private readonly filter$ = new BehaviorSubject<{ period: PeriodKey; metric: MetricKey }>({
    period: '7d',
    metric: 'co2',
  });

  /**
   * Subject for cleanup on component destruction.
   * @private
   */
  private readonly destroy$ = new Subject<void>();

  /**
   * True while loading data and computing correlations.
   */
  isLoading = true;

  /**
   * True if an error occurred during data loading.
   */
  hasError = false;

  /**
   * Error message to display.
   */
  errorMsg = '';

  /**
   * Lag analysis summary with best lag and interpretation.
   */
  summary: LagSummary | null = null;

  /**
   * Chart data configuration.
   */
  chartData: ChartConfiguration<'bar'>['data'] = { labels: [], datasets: [] };

  /**
   * Chart options configuration.
   */
  chartOptions: ChartConfiguration<'bar'>['options'] = this.buildChartOptions(METRICS[0]);

  /**
   * Current filter values.
   * @returns {{period: PeriodKey, metric: MetricKey}} Filter state.
   */
  get currentFilter() {
    return this.filter$.value;
  }

  constructor(
    private readonly sensorDataService: SensorDataService,
    private readonly vehicleService: VehicleDetectedService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  /**
   * Initializes reactive data pipeline.
   * Subscribes to filter changes and reloads analysis.
   */
  ngOnInit(): void {
    this.filter$
      .pipe(
        takeUntil(this.destroy$),
        switchMap((f) => {
          this.isLoading = true;
          this.hasError = false;
          this.cdr.markForCheck();
          return this.loadAndCompute(f.period, f.metric);
        }),
      )
      .subscribe(({ summary, chartData, chartOptions }) => {
        this.summary = summary;
        this.chartData = chartData;
        this.chartOptions = chartOptions;
        this.isLoading = false;
        this.cdr.markForCheck();
      });
  }

  /**
   * Cleans up resources on component destruction.
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Updates the selected period and triggers recomputation.
   *
   * @param {PeriodKey} p - New period key.
   */
  setPeriod(p: PeriodKey): void {
    this.filter$.next({ ...this.filter$.value, period: p });
  }

  /**
   * Updates the selected metric and triggers recomputation.
   *
   * @param {MetricKey} m - New metric key.
   */
  setMetric(m: MetricKey): void {
    this.filter$.next({ ...this.filter$.value, metric: m });
  }

  /**
   * Loads sensor and vehicle data, aggregates into hourly slots,
   * and computes cross-correlation at each lag.
   *
   * @private
   * @param {PeriodKey} period - Analysis period.
   * @param {MetricKey} metricKey - Metric for correlation analysis.
   * @returns {Observable} Observable with summary, chart data, and options.
   */
  private loadAndCompute(period: PeriodKey, metricKey: MetricKey) {
    const end = new Date();
    const hours = { '3d': 72, '7d': 168, '30d': 720 }[period];
    const start = new Date(end.getTime() - hours * 3_600_000);
    const metricOption = METRICS.find((m) => m.key === metricKey)!;

    const sensor$ = this.sensorDataService
      .search({ start, end, size: 10000 })
      .pipe(catchError(() => of<SensorData[]>([])));

    const vehicle$ = this.vehicleService
      .search({ start, end })
      .pipe(catchError(() => of<VehicleDetected[]>([])));

    return combineLatest([sensor$, vehicle$]).pipe(
      catchError((err) => {
        console.error('[LagAnalysis] Error:', err);
        this.hasError = true;
        this.errorMsg = 'Error al cargar los datos. Intenta nuevamente.';
        this.isLoading = false;
        this.cdr.markForCheck();
        return of(null);
      }),
      switchMap((result) => {
        if (!result) {
          return of({
            summary: null as unknown as LagSummary,
            chartData: { labels: [], datasets: [] } as ChartConfiguration<'bar'>['data'],
            chartOptions: this.buildChartOptions(metricOption),
          });
        }

        const [sensorData, vehicleData] = result;

        const slotOrigin = Math.floor(start.getTime() / SLOT_MS) * SLOT_MS;
        const slotCount = Math.ceil((end.getTime() - slotOrigin) / SLOT_MS);

        const pollutant: number[] = [];
        const vehicles: number[] = [];

        for (let i = 0; i < slotCount; i++) {
          const sStart = slotOrigin + i * SLOT_MS;
          const sEnd = sStart + SLOT_MS;

          const inSensor = sensorData.filter((d) => {
            const t = new Date(d.timestamp).getTime();
            return t >= sStart && t < sEnd;
          });
          const vCount = vehicleData.filter((v) => {
            const t = new Date(v.timestamp).getTime();
            return t >= sStart && t < sEnd;
          }).length;

          const avg =
            inSensor.length > 0
              ? inSensor.reduce((s, d) => s + ((d[metricKey] as number) ?? 0), 0) / inSensor.length
              : 0;

          pollutant.push(avg);
          vehicles.push(vCount);
        }

        // Cross-correlation: r at lag k means vehicles[t] corr pollutant[t+k]
        const results: LagResult[] = [];
        for (let k = -MAX_LAG; k <= MAX_LAG; k++) {
          const r = this.crossCorrelation(vehicles, pollutant, k);
          results.push({ lag: k, lagHours: k, r });
        }

        const bestLag = results.reduce((best, cur) =>
          Math.abs(cur.r) > Math.abs(best.r) ? cur : best,
        );

        const interpretation = this.interpret(bestLag, metricOption.label);
        const summary: LagSummary = { bestLag, interpretation, results };

        const labels = results.map((r) => `${r.lag >= 0 ? '+' : ''}${r.lag}h`);
        const barColors = results.map((r) =>
          r.lag === bestLag.lag
            ? metricOption.color
            : r.r > 0.3
              ? 'rgba(16,185,129,0.55)'
              : r.r < -0.3
                ? 'rgba(99,102,241,0.55)'
                : 'rgba(156,163,175,0.4)',
        );

        const chartData: ChartConfiguration<'bar'>['data'] = {
          labels,
          datasets: [
            {
              label: `Cross-correlation vehículos → ${metricOption.label}`,
              data: results.map((r) => Math.round(r.r * 1000) / 1000),
              backgroundColor: barColors,
              borderColor: barColors.map((c) => c.replace('0.55', '1').replace('0.4', '0.8')),
              borderWidth: 1,
              borderRadius: 4,
            },
          ],
        };

        return of({ summary, chartData, chartOptions: this.buildChartOptions(metricOption) });
      }),
    );
  }

  /**
   * Computes Pearson correlation between x and y with y shifted by k positions.
   * A negative k shifts y backward (y leads x). Positive k shifts y forward (x leads y).
   *
   * @private
   * @param {number[]} x - First variable (vehicle counts).
   * @param {number[]} y - Second variable (pollutant values).
   * @param {number} k - Lag shift in slots.
   * @returns {number} Pearson correlation coefficient.
   */
  private crossCorrelation(x: number[], y: number[], k: number): number {
    const n = x.length;
    if (n < 4) return 0;

    const pairs: [number, number][] = [];
    for (let i = 0; i < n; i++) {
      const j = i + k;
      if (j < 0 || j >= n) continue;
      pairs.push([x[i], y[j]]);
    }
    if (pairs.length < 2) return 0;

    const xs = pairs.map((p) => p[0]);
    const ys = pairs.map((p) => p[1]);
    const m = xs.length;

    const mx = xs.reduce((a, b) => a + b, 0) / m;
    const my = ys.reduce((a, b) => a + b, 0) / m;

    let num = 0,
      dx2 = 0,
      dy2 = 0;
    for (let i = 0; i < m; i++) {
      const dx = xs[i] - mx;
      const dy = ys[i] - my;
      num += dx * dy;
      dx2 += dx * dx;
      dy2 += dy * dy;
    }

    const den = Math.sqrt(dx2 * dy2);
    return den === 0 ? 0 : num / den;
  }

  /**
   * Generates human-readable interpretation of the best lag result.
   *
   * @private
   * @param {LagResult} best - Best lag result.
   * @param {string} metricLabel - Name of the metric being analyzed.
   * @returns {string} Interpretation text.
   */
  private interpret(best: LagResult, metricLabel: string): string {
    const absR = Math.abs(best.r);
    const strength = absR >= 0.5 ? 'significativa' : absR >= 0.3 ? 'moderada' : 'débil';

    if (best.lag === 0) {
      return `La correlación ${strength} (r = ${best.r.toFixed(2)}) entre vehículos y ${metricLabel} es instantánea; no se detecta rezago.`;
    }
    if (best.lag < 0) {
      return `Correlación ${strength} (r = ${best.r.toFixed(2)}) con rezago de ${Math.abs(best.lagHours)} h: el tráfico vehicular anticipa el cambio en ${metricLabel} hacia el futuro.`;
    }
    return `Correlación ${strength} (r = ${best.r.toFixed(2)}) con rezago de +${best.lagHours} h: ${metricLabel} cambia antes que el tráfico vehicular (posible causalidad inversa u otro factor).`;
  }

  /**
   * Builds chart options with metric-specific styling.
   *
   * @private
   * @param {MetricOption} m - Metric for chart configuration.
   * @returns {ChartConfiguration<'bar'>['options']} Chart.js options object.
   */
  private buildChartOptions(m: MetricOption): ChartConfiguration<'bar'>['options'] {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: { usePointStyle: true, padding: 16, font: { size: 12 }, color: '#6B7280' },
        },
        tooltip: {
          backgroundColor: 'rgba(0,0,0,0.82)',
          titleColor: '#fff',
          bodyColor: '#e5e7eb',
          borderColor: '#374151',
          borderWidth: 1,
          padding: 12,
          callbacks: {
            label: (ctx) => ` r = ${(ctx.parsed.y as number).toFixed(3)}`,
          },
        },
      },
      scales: {
        x: {
          display: true,
          title: { display: true, text: 'Rezago (horas)', color: '#6B7280', font: { size: 11 } },
          grid: { display: false },
          ticks: { color: '#6B7280', font: { size: 10 } },
        },
        y: {
          display: true,
          title: { display: true, text: 'Correlación (r)', color: '#6B7280', font: { size: 11 } },
          min: -1,
          max: 1,
          grid: { color: 'rgba(107,114,128,0.1)' },
          ticks: { color: '#6B7280', stepSize: 0.2 },
        },
      },
    };
  }

  /**
   * Returns Tailwind classes for best-lag badge based on correlation strength.
   *
   * @param {number} r - Correlation coefficient.
   * @returns {string} Tailwind class string.
   */
  badgeClass(r: number): string {
    if (Math.abs(r) >= 0.5)
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
    if (Math.abs(r) >= 0.3)
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
    return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
  }

  /**
   * Returns Tailwind classes for results table rows.
   * Highlights the optimal lag row.
   *
   * @param {number} r - Correlation coefficient (unused, kept for consistency).
   * @param {boolean} isOptimal - True if this is the best lag row.
   * @returns {string} Tailwind class string.
   */
  rowClass(r: number, isOptimal: boolean): string {
    if (isOptimal) return 'bg-amber-50 dark:bg-amber-900/10 font-semibold';
    return '';
  }
}
