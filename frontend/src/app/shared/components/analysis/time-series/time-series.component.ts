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

// ── Types ─────────────────────────────────────────────────────────────────────

type MetricKey = 'co2' | 'pm25' | 'pm10' | 'temperature' | 'humidity' | 'co' | 'no2' | 'nh3';
type PeriodKey = '24h' | '7d' | '30d';
type GranularityKey = 'hour' | '4h' | 'day';

interface MetricOption {
  key: MetricKey;
  label: string;
  unit: string;
  border: string;
  bg: string;
}

interface FilterState {
  period: PeriodKey;
  metric: MetricKey;
}

interface TimeSlot {
  start: Date;
  end: Date;
  label: string;
}

interface TimeSeriesStats {
  metricMin: number;
  metricAvg: number;
  metricMax: number;
  vehicleTotal: number;
  metricOption: MetricOption;
}

// ── Constants ─────────────────────────────────────────────────────────────────

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

const VEHICLE_BORDER = '#6366f1';
const VEHICLE_BG = 'rgba(99, 102, 241, 0.08)';

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

  // ── State ──────────────────────────────────────────────────────────────────

  private readonly filters$ = new BehaviorSubject<FilterState>({
    period: '24h',
    metric: 'co2',
  });

  private readonly destroy$ = new Subject<void>();

  isLoading = true;
  hasError = false;
  errorMsg = '';

  chartData: ChartConfiguration<'line'>['data'] = { labels: [], datasets: [] };
  chartOptions: ChartConfiguration<'line'>['options'] = this.buildChartOptions(METRICS[0]);
  stats: TimeSeriesStats | null = null;

  // ── Accessors ──────────────────────────────────────────────────────────────

  get currentFilter(): FilterState {
    return this.filters$.value;
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  constructor(
    private readonly sensorDataService: SensorDataService,
    private readonly vehicleService: VehicleDetectedService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── User interactions ──────────────────────────────────────────────────────

  setPeriod(period: PeriodKey): void {
    this.filters$.next({ ...this.filters$.value, period });
  }

  setMetric(metric: MetricKey): void {
    this.filters$.next({ ...this.filters$.value, metric });
  }

  // ── Data pipeline ──────────────────────────────────────────────────────────

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

  // ── Chart options factory ──────────────────────────────────────────────────

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

  // ── Time utilities ─────────────────────────────────────────────────────────

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
