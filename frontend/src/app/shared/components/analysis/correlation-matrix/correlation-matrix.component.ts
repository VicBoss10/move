import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { BehaviorSubject, combineLatest, of, Subject } from 'rxjs';
import { catchError, switchMap, takeUntil } from 'rxjs/operators';
import { SensorDataService } from '../../../../core/services/sensor-data.service';
import { VehicleDetectedService } from '../../../../core/services/vehicle-detected.service';
import { SensorData } from '../../../../core/models/sensor-data.model';
import { VehicleDetected } from '../../../../core/models/vehicle.model';

// ── Types ─────────────────────────────────────────────────────────────────────

type PeriodKey = '24h' | '7d' | '30d';

interface Variable {
  key: string;
  label: string;
  shortLabel: string;
  unit: string;
}

interface CellResult {
  r: number;           // Pearson coefficient [-1, 1]
  n: number;           // sample size
  label: string;       // formatted value
  color: string;       // Tailwind bg class
  textColor: string;   // Tailwind text class
}

// ── Constants ─────────────────────────────────────────────────────────────────

const VARIABLES: Variable[] = [
  { key: 'co2',           label: 'CO₂',          shortLabel: 'CO₂',   unit: 'ppm'     },
  { key: 'pm25',          label: 'PM2.5',         shortLabel: 'PM2.5', unit: 'µg/m³'  },
  { key: 'pm10',          label: 'PM10',          shortLabel: 'PM10',  unit: 'µg/m³'  },
  { key: 'temperature',   label: 'Temperatura',   shortLabel: 'Temp',  unit: '°C'      },
  { key: 'humidity',      label: 'Humedad',       shortLabel: 'Hum.',  unit: '%'       },
  { key: 'co',            label: 'CO',            shortLabel: 'CO',    unit: 'ppm'     },
  { key: 'no2',           label: 'NO₂',           shortLabel: 'NO₂',   unit: 'ppb'     },
  { key: 'nh3',           label: 'NH₃',           shortLabel: 'NH₃',   unit: 'ppb'     },
  { key: 'vehicleCount',  label: 'Vehículos',     shortLabel: 'Veh.',  unit: 'count'   },
];

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: '24h', label: 'Últimas 24h'    },
  { key: '7d',  label: 'Últimos 7 días' },
  { key: '30d', label: 'Últimos 30 días'},
];

// interval size used to pair sensor ↔ vehicle readings
const SLOT_MS: Record<PeriodKey, number> = {
  '24h': 3_600_000,       // 1 h
  '7d':  4 * 3_600_000,   // 4 h
  '30d': 24 * 3_600_000,  // 1 day
};

/**
 * CorrelationMatrixComponent (Smart Component)
 *
 * Calcula y visualiza la matriz de correlación de Pearson entre:
 * - 8 variables ambientales (sensor_data)
 * - conteo de vehículos detectados (vehicles_detected)
 *
 * Los datos se agregan en slots temporales para parear mediciones de
 * sensores con conteos de vehículos en el mismo intervalo.
 *
 * Características:
 * - Matriz interactiva con tonos de color (correlación fuerte/moderada/nula)
 * - Selección de período (24h/7d/30d)
 * - Cálculo de Pearson con detalle de muestra
 * - Leyenda interpretativa
 * - Dark mode support
 *
 * @selector app-correlation-matrix
 * @standalone true
 * @imports CommonModule
 * @returns Matriz de correlación interactiva
 *
 * @example
 * <app-correlation-matrix />
 */
@Component({
  selector: 'app-correlation-matrix',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './correlation-matrix.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CorrelationMatrixComponent implements OnInit, OnDestroy {

  readonly variables = VARIABLES;
  readonly periods   = PERIODS;

  // ── State ──────────────────────────────────────────────────────────────────

  private readonly period$ = new BehaviorSubject<PeriodKey>('7d');
  private readonly destroy$ = new Subject<void>();

  isLoading  = true;
  hasError   = false;
  errorMsg   = '';

  /** matrix[row][col] = CellResult */
  matrix: CellResult[][] = [];

  /** number of paired time-slots used for computation */
  sampleSize = 0;

  /** legend entries */
  readonly legend = [
    { color: 'bg-emerald-600',  text: 'Correlación positiva fuerte  (r ≥ 0.7)' },
    { color: 'bg-emerald-300',  text: 'Correlación positiva moderada (0.3 ≤ r < 0.7)' },
    { color: 'bg-gray-100 dark:bg-gray-700', text: 'Sin correlación significativa (|r| < 0.3)' },
    { color: 'bg-blue-300',     text: 'Correlación negativa moderada (-0.7 < r ≤ -0.3)' },
    { color: 'bg-blue-600',     text: 'Correlación negativa fuerte  (r ≤ -0.7)' },
  ];

  // ── Accessors ──────────────────────────────────────────────────────────────

  get currentPeriod(): PeriodKey {
    return this.period$.value;
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  constructor(
    private readonly sensorDataService: SensorDataService,
    private readonly vehicleService: VehicleDetectedService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.period$
      .pipe(
        takeUntil(this.destroy$),
        switchMap((period) => {
          this.isLoading = true;
          this.hasError  = false;
          this.cdr.markForCheck();
          return this.loadAndCompute(period);
        }),
      )
      .subscribe(({ matrix, sampleSize }) => {
        this.matrix     = matrix;
        this.sampleSize = sampleSize;
        this.isLoading  = false;
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── User interactions ──────────────────────────────────────────────────────

  setPeriod(p: PeriodKey): void {
    this.period$.next(p);
  }

  // ── Data pipeline ──────────────────────────────────────────────────────────

  private loadAndCompute(period: PeriodKey) {
    const end   = new Date();
    const ms    = { '24h': 24, '7d': 7 * 24, '30d': 30 * 24 }[period] * 3_600_000;
    const start = new Date(end.getTime() - ms);
    const slot  = SLOT_MS[period];

    const sensor$ = this.sensorDataService
      .search({ start, end, size: 10000 })
      .pipe(catchError(() => of<SensorData[]>([])));

    const vehicle$ = this.vehicleService
      .search({ start, end })
      .pipe(catchError(() => of<VehicleDetected[]>([])));

    return combineLatest([sensor$, vehicle$]).pipe(
      catchError(err => {
        console.error('[CorrelationMatrix] Error cargando datos:', err);
        this.hasError = true;
        this.errorMsg = 'Error al cargar los datos. Intenta nuevamente.';
        this.isLoading = false;
        this.cdr.markForCheck();
        return of(null);
      }),
      switchMap(result => {
        if (!result) {
          return of({ matrix: [] as CellResult[][], sampleSize: 0 });
        }

        const [sensorData, vehicleData] = result;

        // Build aligned time slots
        const slotStart = Math.floor(start.getTime() / slot) * slot;
        const slotCount = Math.ceil((end.getTime() - slotStart) / slot);

        // For each slot aggregate sensor averages + vehicle count
        const rows: Record<string, number>[] = [];

        for (let i = 0; i < slotCount; i++) {
          const sStart = slotStart + i * slot;
          const sEnd   = sStart + slot;

          const inSlotSensor = sensorData.filter(d => {
            const t = new Date(d.timestamp).getTime();
            return t >= sStart && t < sEnd;
          });

          const vehicleCount = vehicleData.filter(v => {
            const t = new Date(v.timestamp).getTime();
            return t >= sStart && t < sEnd;
          }).length;

          if (inSlotSensor.length === 0 && vehicleCount === 0) continue;

          const avg = (key: keyof SensorData) =>
            inSlotSensor.length === 0
              ? 0
              : inSlotSensor.reduce((s, d) => s + ((d[key] as number) ?? 0), 0) / inSlotSensor.length;

          rows.push({
            co2:          avg('co2'),
            pm25:         avg('pm25'),
            pm10:         avg('pm10'),
            temperature:  avg('temperature'),
            humidity:     avg('humidity'),
            co:           avg('co'),
            no2:          avg('no2'),
            nh3:          avg('nh3'),
            vehicleCount,
          });
        }

        const n = rows.length;
        const keys = VARIABLES.map(v => v.key);

        // Compute Pearson matrix
        const matrix: CellResult[][] = keys.map(rowKey =>
          keys.map(colKey => {
            if (rowKey === colKey) {
              return { r: 1, n, label: '1.00', ...this.cellStyle(1) } as CellResult;
            }
            const r = this.pearson(rows.map(r => r[rowKey]), rows.map(r => r[colKey]));
            return {
              r,
              n,
              label: isNaN(r) ? '—' : r.toFixed(2),
              ...this.cellStyle(r),
            };
          }),
        );

        return of({ matrix, sampleSize: n });
      }),
    );
  }

  // ── Statistics ─────────────────────────────────────────────────────────────

  /**
   * Pearson correlation coefficient between two arrays.
   */
  private pearson(xs: number[], ys: number[]): number {
    const n = xs.length;
    if (n < 2) return NaN;

    const meanX = xs.reduce((a, b) => a + b, 0) / n;
    const meanY = ys.reduce((a, b) => a + b, 0) / n;

    let num = 0, denX = 0, denY = 0;
    for (let i = 0; i < n; i++) {
      const dx = xs[i] - meanX;
      const dy = ys[i] - meanY;
      num  += dx * dy;
      denX += dx * dx;
      denY += dy * dy;
    }

    const den = Math.sqrt(denX * denY);
    return den === 0 ? 0 : num / den;
  }

  // ── Styling ────────────────────────────────────────────────────────────────

  private cellStyle(r: number): { color: string; textColor: string } {
    if (isNaN(r))  return { color: 'bg-gray-100 dark:bg-gray-700', textColor: 'text-gray-400' };
    if (r >=  0.7) return { color: 'bg-emerald-600',               textColor: 'text-white'     };
    if (r >=  0.3) return { color: 'bg-emerald-200 dark:bg-emerald-900/50', textColor: 'text-emerald-900 dark:text-emerald-200' };
    if (r <= -0.7) return { color: 'bg-blue-600',                  textColor: 'text-white'     };
    if (r <= -0.3) return { color: 'bg-blue-200 dark:bg-blue-900/50',       textColor: 'text-blue-900 dark:text-blue-200' };
    return { color: 'bg-gray-100 dark:bg-gray-700', textColor: 'text-gray-500 dark:text-gray-400' };
  }

  /** True if diagonal (self-correlation) */
  isDiagonal(rowIdx: number, colIdx: number): boolean {
    return rowIdx === colIdx;
  }
}
