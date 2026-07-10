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
import { combineLatest, of, Subject } from 'rxjs';
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
import {
  PeriodRangeSelectorComponent,
  PeriodRange,
} from '../period-range-selector/period-range-selector.component';

ChartJS.register(BarController, BarElement, LinearScale, CategoryScale, Tooltip, Legend);

/**
 * Environmental metric key type.
 */
type MetricKey = 'co2' | 'pm25' | 'pm10' | 'temperature' | 'humidity' | 'co' | 'no2' | 'nh3';

/**
 * Metric display configuration.
 */
interface MetricOption {
  key: MetricKey;
  label: string;
  unit: string;
  color: string;
}

/**
 * Cross-correlation result at a specific lag.
 */
interface LagResult {
  lag: number;
  lagHours: number;
  r: number;
}

/**
 * Summary of lag analysis with best result and interpretation.
 */
interface LagSummary {
  bestLag: LagResult;
  interpretation: string;
  results: LagResult[];
}

/**
 * Available environmental metrics.
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

/** Time slot duration in milliseconds (1 hour). */
const SLOT_MS = 3_600_000;

/** Maximum lag to evaluate in each direction (±12 hours). */
const MAX_LAG = 12;

/**
 * LagAnalysisComponent
 *
 * Calculates and visualizes cross-correlation (CCF) between hourly vehicle counts
 * and hourly-averaged environmental metric, evaluating lags from −12h to +12h.
 * Period is selected via the shared PeriodRangeSelectorComponent.
 *
 * @selector app-lag-analysis
 * @standalone true
 */
@Component({
  selector: 'app-lag-analysis',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseChartDirective, PeriodRangeSelectorComponent],
  templateUrl: './lag-analysis.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LagAnalysisComponent implements OnInit, OnDestroy {
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  readonly metrics = METRICS;

  private readonly load$ = new Subject<{ start: Date; end: Date; metric: MetricKey }>();
  private readonly destroy$ = new Subject<void>();
  private currentRange: { start: Date; end: Date } | null = null;

  /** True once the user has selected at least one period. */
  hasPeriod = false;
  /** Currently selected metric key (bound to the metric select). */
  currentMetric: MetricKey = 'co2';
  isLoading = false;
  hasError = false;
  errorMsg = '';
  summary: LagSummary | null = null;
  chartData: ChartConfiguration<'bar'>['data'] = { labels: [], datasets: [] };
  chartOptions: ChartConfiguration<'bar'>['options'] = this.buildChartOptions(METRICS[0]);

  constructor(
    private readonly sensorDataService: SensorDataService,
    private readonly vehicleService: VehicleDetectedService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.load$
      .pipe(
        takeUntil(this.destroy$),
        switchMap((f) => {
          this.isLoading = true;
          this.hasError = false;
          this.cdr.markForCheck();
          return this.loadAndCompute(f.start, f.end, f.metric);
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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Called by PeriodRangeSelectorComponent when the user selects or applies a period. */
  onPeriodChange(range: PeriodRange): void {
    this.currentRange = range;
    this.currentMetric = range.metric;
    this.hasPeriod = true;
    this.load$.next({ start: range.start, end: range.end, metric: range.metric });
  }

  /**
   * Loads sensor and vehicle data, aggregates into hourly slots,
   * and computes cross-correlation at each lag.
   */
  private loadAndCompute(start: Date, end: Date, metricKey: MetricKey) {
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
              : NaN;

          pollutant.push(avg);
          vehicles.push(vCount);
        }

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

  private crossCorrelation(x: number[], y: number[], k: number): number {
    const n = x.length;
    if (n < 4) return 0;

    const pairs: [number, number][] = [];
    for (let i = 0; i < n; i++) {
      const j = i + k;
      if (j < 0 || j >= n) continue;
      if (!Number.isFinite(y[j])) continue;
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

  private interpret(best: LagResult, metricLabel: string): string {
    const absR = Math.abs(best.r);
    const strength = absR >= 0.5 ? 'significativa' : absR >= 0.3 ? 'moderada' : 'débil';

    if (best.lag === 0) {
      return `La correlación ${strength} (r = ${best.r.toFixed(2)}) entre vehículos y ${metricLabel} es instantánea; no se detecta rezago.`;
    }
    if (best.lag > 0) {
      return `Correlación ${strength} (r = ${best.r.toFixed(2)}) con rezago de +${best.lagHours} h: el tráfico vehicular anticipa el cambio en ${metricLabel} ${best.lagHours} h después.`;
    }
    return `Correlación ${strength} (r = ${best.r.toFixed(2)}) con rezago de ${best.lagHours} h: ${metricLabel} cambia antes que el tráfico vehicular (posible causalidad inversa u otro factor).`;
  }

  private buildChartOptions(_m: MetricOption): ChartConfiguration<'bar'>['options'] {
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

  badgeClass(r: number): string {
    if (Math.abs(r) >= 0.5)
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
    if (Math.abs(r) >= 0.3)
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
    return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
  }

  rowClass(_r: number, isOptimal: boolean): string {
    if (isOptimal) return 'bg-amber-50 dark:bg-amber-900/10 font-semibold';
    return '';
  }
}
