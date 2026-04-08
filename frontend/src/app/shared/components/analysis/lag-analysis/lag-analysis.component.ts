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

// ── Types ─────────────────────────────────────────────────────────────────────

type MetricKey = 'co2' | 'pm25' | 'pm10' | 'temperature' | 'humidity' | 'co' | 'no2' | 'nh3';
type PeriodKey = '3d' | '7d' | '30d';

interface MetricOption {
  key: MetricKey;
  label: string;
  unit: string;
  color: string;
}

interface LagResult {
  lag: number;        // shift in slots (negative = vehicles lead pollutant)
  lagHours: number;   // human-readable lag in hours
  r: number;          // cross-correlation at this lag
}

interface LagSummary {
  bestLag: LagResult;
  interpretation: string;
  results: LagResult[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const METRICS: MetricOption[] = [
  { key: 'co2',         label: 'CO₂',        unit: 'ppm',    color: '#ef4444' },
  { key: 'pm25',        label: 'PM2.5',       unit: 'µg/m³', color: '#a855f7' },
  { key: 'pm10',        label: 'PM10',        unit: 'µg/m³', color: '#f97316' },
  { key: 'temperature', label: 'Temperatura', unit: '°C',     color: '#eab308' },
  { key: 'humidity',    label: 'Humedad',     unit: '%',      color: '#3b82f6' },
  { key: 'co',         label: 'CO',          unit: 'ppm',    color: '#6b7280' },
  { key: 'no2',        label: 'NO₂',         unit: 'ppb',    color: '#22c55e' },
  { key: 'nh3',        label: 'NH₃',         unit: 'ppb',    color: '#14b8a6' },
];

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: '3d',  label: 'Últimos 3 días'  },
  { key: '7d',  label: 'Últimos 7 días'  },
  { key: '30d', label: 'Últimos 30 días' },
];

/** Slot size = 1 hour for all periods (lag steps in hours) */
const SLOT_MS = 3_600_000;

/** Max lag to evaluate in each direction (±slots) */
const MAX_LAG = 12;

/**
 * LagAnalysisComponent (Smart Component)
 *
 * Calcula la correlación cruzada (CCF) entre el conteo horario de vehículos
 * y el promedio horario de un contaminante ambiental, evaluando rezagos
 * desde −MAX_LAG h hasta +MAX_LAG h.
 *
 * Un lag negativo (k < 0) significa que los vehículos anticipan el cambio
 * en el contaminante k horas después.
 * Un lag positivo (k > 0) significa que el contaminante sube antes que el tráfico.
 *
 * Visualización: gráfico de barras (correlación vs. lag) + tabla de valores
 * + card interpretativa del lag óptimo.
 *
 * @selector app-lag-analysis
 * @standalone true
 */
@Component({
  selector: 'app-lag-analysis',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseChartDirective],
  templateUrl: './lag-analysis.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LagAnalysisComponent implements OnInit, OnDestroy {

  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  readonly metrics = METRICS;
  readonly periods = PERIODS;

  // ── State ──────────────────────────────────────────────────────────────────

  private readonly filter$ = new BehaviorSubject<{ period: PeriodKey; metric: MetricKey }>({
    period: '7d',
    metric: 'co2',
  });
  private readonly destroy$ = new Subject<void>();

  isLoading = true;
  hasError  = false;
  errorMsg  = '';

  summary: LagSummary | null = null;

  chartData: ChartConfiguration<'bar'>['data']        = { labels: [], datasets: [] };
  chartOptions: ChartConfiguration<'bar'>['options']  = this.buildChartOptions(METRICS[0]);

  // ── Accessors ──────────────────────────────────────────────────────────────

  get currentFilter() { return this.filter$.value; }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  constructor(
    private readonly sensorDataService: SensorDataService,
    private readonly vehicleService: VehicleDetectedService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.filter$
      .pipe(
        takeUntil(this.destroy$),
        switchMap(f => {
          this.isLoading = true;
          this.hasError  = false;
          this.cdr.markForCheck();
          return this.loadAndCompute(f.period, f.metric);
        }),
      )
      .subscribe(({ summary, chartData, chartOptions }) => {
        this.summary      = summary;
        this.chartData    = chartData;
        this.chartOptions = chartOptions;
        this.isLoading    = false;
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── User interactions ──────────────────────────────────────────────────────

  setPeriod(p: PeriodKey): void  { this.filter$.next({ ...this.filter$.value, period: p }); }
  setMetric(m: MetricKey): void  { this.filter$.next({ ...this.filter$.value, metric: m }); }

  // ── Data pipeline ──────────────────────────────────────────────────────────

  private loadAndCompute(period: PeriodKey, metricKey: MetricKey) {
    const end   = new Date();
    const hours = { '3d': 72, '7d': 168, '30d': 720 }[period];
    const start = new Date(end.getTime() - hours * 3_600_000);
    const metricOption = METRICS.find(m => m.key === metricKey)!;

    const sensor$ = this.sensorDataService
      .search({ start, end, size: 10000 })
      .pipe(catchError(() => of<SensorData[]>([])));

    const vehicle$ = this.vehicleService
      .search({ start, end })
      .pipe(catchError(() => of<VehicleDetected[]>([])));

    return combineLatest([sensor$, vehicle$]).pipe(
      catchError(err => {
        console.error('[LagAnalysis] Error:', err);
        this.hasError = true;
        this.errorMsg = 'Error al cargar los datos. Intenta nuevamente.';
        this.isLoading = false;
        this.cdr.markForCheck();
        return of(null);
      }),
      switchMap(result => {
        if (!result) {
          return of({ summary: null as unknown as LagSummary, chartData: { labels: [], datasets: [] } as ChartConfiguration<'bar'>['data'], chartOptions: this.buildChartOptions(metricOption) });
        }

        const [sensorData, vehicleData] = result;

        // Build hourly time slots
        const slotOrigin = Math.floor(start.getTime() / SLOT_MS) * SLOT_MS;
        const slotCount  = Math.ceil((end.getTime() - slotOrigin) / SLOT_MS);

        const pollutant: number[] = [];
        const vehicles:  number[] = [];

        for (let i = 0; i < slotCount; i++) {
          const sStart = slotOrigin + i * SLOT_MS;
          const sEnd   = sStart + SLOT_MS;

          const inSensor = sensorData.filter(d => {
            const t = new Date(d.timestamp).getTime();
            return t >= sStart && t < sEnd;
          });
          const vCount = vehicleData.filter(v => {
            const t = new Date(v.timestamp).getTime();
            return t >= sStart && t < sEnd;
          }).length;

          const avg = inSensor.length > 0
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

        // Best lag = highest |r|
        const bestLag = results.reduce((best, cur) =>
          Math.abs(cur.r) > Math.abs(best.r) ? cur : best,
        );

        const interpretation = this.interpret(bestLag, metricOption.label);
        const summary: LagSummary = { bestLag, interpretation, results };

        // Build chart
        const labels   = results.map(r => `${r.lag >= 0 ? '+' : ''}${r.lag}h`);
        const barColors = results.map(r =>
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
              data: results.map(r => Math.round(r.r * 1000) / 1000),
              backgroundColor: barColors,
              borderColor: barColors.map(c => c.replace('0.55', '1').replace('0.4', '0.8')),
              borderWidth: 1,
              borderRadius: 4,
            },
          ],
        };

        return of({ summary, chartData, chartOptions: this.buildChartOptions(metricOption) });
      }),
    );
  }

  // ── Cross-correlation ──────────────────────────────────────────────────────

  /**
   * Pearson correlation between x and y shifted by k positions.
   * k > 0 → y leads x  |  k < 0 → x leads y
   */
  private crossCorrelation(x: number[], y: number[], k: number): number {
    const n = x.length;
    if (n < 4) return 0;

    // Build shifted pairs
    const pairs: [number, number][] = [];
    for (let i = 0; i < n; i++) {
      const j = i + k;
      if (j < 0 || j >= n) continue;
      pairs.push([x[i], y[j]]);
    }
    if (pairs.length < 2) return 0;

    const xs = pairs.map(p => p[0]);
    const ys = pairs.map(p => p[1]);
    const m  = xs.length;

    const mx = xs.reduce((a, b) => a + b, 0) / m;
    const my = ys.reduce((a, b) => a + b, 0) / m;

    let num = 0, dx2 = 0, dy2 = 0;
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

  // ── Interpretation text ────────────────────────────────────────────────────

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

  // ── Chart options ──────────────────────────────────────────────────────────

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
            label: ctx => ` r = ${(ctx.parsed.y as number).toFixed(3)}`,
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
          max:  1,
          grid: { color: 'rgba(107,114,128,0.1)' },
          ticks: { color: '#6B7280', stepSize: 0.2 },
        },
      },
    };
  }

  /** Color for the best-lag badge */
  badgeClass(r: number): string {
    if (Math.abs(r) >= 0.5) return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
    if (Math.abs(r) >= 0.3) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
    return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
  }

  /** Row color for results table */
  rowClass(r: number, isOptimal: boolean): string {
    if (isOptimal) return 'bg-amber-50 dark:bg-amber-900/10 font-semibold';
    return '';
  }
}
