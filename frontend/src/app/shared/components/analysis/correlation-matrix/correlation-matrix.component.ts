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

/**
 * Time period key for correlation analysis.
 * @typedef {'24h' | '7d' | '30d'} PeriodKey
 */
type PeriodKey = '24h' | '7d' | '30d';

/**
 * Environmental or traffic variable metadata.
 * @interface Variable
 * @property {string} key - Variable identifier (e.g., 'co2', 'vehicleCount').
 * @property {string} label - Full display label (e.g., 'CO₂').
 * @property {string} shortLabel - Abbreviated label for table headers.
 * @property {string} unit - Measurement unit (e.g., 'ppm', 'count').
 */
interface Variable {
  key: string;
  label: string;
  shortLabel: string;
  unit: string;
}

/**
 * Pearson correlation result for a matrix cell.
 * @interface CellResult
 * @property {number} r - Pearson correlation coefficient in range [-1, 1].
 * @property {number} n - Number of paired samples used in computation.
 * @property {string} label - Formatted correlation value for display.
 * @property {string} color - Tailwind background utility class.
 * @property {string} textColor - Tailwind text color utility class.
 */
interface CellResult {
  r: number;
  n: number;
  label: string;
  color: string;
  textColor: string;
}

/**
 * Environmental and traffic variables for correlation analysis.
 * @constant VARIABLES
 * @type {Variable[]}
 */
const VARIABLES: Variable[] = [
  { key: 'co2', label: 'CO₂', shortLabel: 'CO₂', unit: 'ppm' },
  { key: 'pm25', label: 'PM2.5', shortLabel: 'PM2.5', unit: 'µg/m³' },
  { key: 'pm10', label: 'PM10', shortLabel: 'PM10', unit: 'µg/m³' },
  { key: 'temperature', label: 'Temperatura', shortLabel: 'Temp', unit: '°C' },
  { key: 'humidity', label: 'Humedad', shortLabel: 'Hum.', unit: '%' },
  { key: 'co', label: 'CO', shortLabel: 'CO', unit: 'ppm' },
  { key: 'no2', label: 'NO₂', shortLabel: 'NO₂', unit: 'ppb' },
  { key: 'nh3', label: 'NH₃', shortLabel: 'NH₃', unit: 'ppb' },
  { key: 'vehicleCount', label: 'Vehículos', shortLabel: 'Veh.', unit: 'count' },
];

/**
 * Available time period options for correlation analysis.
 * @constant PERIODS
 * @type {Array<{key: PeriodKey, label: string}>}
 */
const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: '24h', label: 'Últimas 24h' },
  { key: '7d', label: 'Últimos 7 días' },
  { key: '30d', label: 'Últimos 30 días' },
];

/**
 * Time slot duration in milliseconds for each period.
 * Used to aggregate sensor and vehicle data into aligned intervals.
 * @constant SLOT_MS
 * @type {Record<PeriodKey, number>}
 */
const SLOT_MS: Record<PeriodKey, number> = {
  '24h': 3_600_000,
  '7d': 4 * 3_600_000,
  '30d': 24 * 3_600_000,
};

/**
 * CorrelationMatrixComponent
 *
 * Calculates and visualizes the Pearson correlation matrix between
 * 8 environmental variables (from sensor data) and vehicle traffic counts.
 * Data is aggregated into time-aligned slots to pair sensor readings
 * with vehicle detection counts within the same intervals.
 *
 * Features:
 * - Interactive matrix with color-coded correlation strength
 * - Selectable time periods (24h / 7d / 30d)
 * - Pearson coefficient computation with sample details
 * - Interpretation guide and color legend
 * - Full dark mode support
 *
 * @class CorrelationMatrixComponent
 * @implements {OnInit, OnDestroy}
 * @selector app-correlation-matrix
 * @standalone true
 * @imports CommonModule
 */
@Component({
  selector: 'app-correlation-matrix',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './correlation-matrix.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CorrelationMatrixComponent implements OnInit, OnDestroy {
  /**
   * List of variables included in correlation analysis.
   * @readonly
   */
  readonly variables = VARIABLES;

  /**
   * Available time period options.
   * @readonly
   */
  readonly periods = PERIODS;

  /**
   * Currently selected analysis period.
   * @private
   */
  private readonly period$ = new BehaviorSubject<PeriodKey>('7d');

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
   * Error message to display to user.
   */
  errorMsg = '';

  /**
   * Correlation matrix: matrix[row][col] = CellResult.
   */
  matrix: CellResult[][] = [];

  /**
   * Number of time slots with data used in Pearson computation.
   */
  sampleSize = 0;

  /**
   * Color legend entries explaining correlation strength ranges.
   * @readonly
   */
  readonly legend = [
    { color: 'bg-emerald-600', text: 'Strong positive correlation (r ≥ 0.7)' },
    { color: 'bg-emerald-300', text: 'Moderate positive correlation (0.3 ≤ r < 0.7)' },
    { color: 'bg-gray-100 dark:bg-gray-700', text: 'No significant correlation (|r| < 0.3)' },
    { color: 'bg-blue-300', text: 'Moderate negative correlation (-0.7 < r ≤ -0.3)' },
    { color: 'bg-blue-600', text: 'Strong negative correlation (r ≤ -0.7)' },
  ];

  /**
   * Currently selected analysis period.
   * @returns {PeriodKey} Period key ('24h', '7d', or '30d').
   */
  get currentPeriod(): PeriodKey {
    return this.period$.value;
  }

  constructor(
    private readonly sensorDataService: SensorDataService,
    private readonly vehicleService: VehicleDetectedService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  /**
   * Initializes reactive data pipeline.
   * Subscribes to period changes and reloads correlation matrix.
   */
  ngOnInit(): void {
    this.period$
      .pipe(
        takeUntil(this.destroy$),
        switchMap((period) => {
          this.isLoading = true;
          this.hasError = false;
          this.cdr.markForCheck();
          return this.loadAndCompute(period);
        }),
      )
      .subscribe(({ matrix, sampleSize }) => {
        this.matrix = matrix;
        this.sampleSize = sampleSize;
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
   * Updates the analysis period and triggers matrix recalculation.
   *
   * @param {PeriodKey} p - New period key.
   */
  setPeriod(p: PeriodKey): void {
    this.period$.next(p);
  }

  /**
   * Loads sensor data and vehicle detections, aligns into time slots,
   * and computes Pearson correlation matrix.
   *
   * @private
   * @param {PeriodKey} period - Analysis period.
   * @returns {Observable<{matrix: CellResult[][], sampleSize: number}>} Correlation matrix and sample count.
   */
  private loadAndCompute(period: PeriodKey) {
    const end = new Date();
    const ms = { '24h': 24, '7d': 7 * 24, '30d': 30 * 24 }[period] * 3_600_000;
    const start = new Date(end.getTime() - ms);
    const slot = SLOT_MS[period];

    const sensor$ = this.sensorDataService
      .search({ start, end, size: 10000 })
      .pipe(catchError(() => of<SensorData[]>([])));

    const vehicle$ = this.vehicleService
      .search({ start, end })
      .pipe(catchError(() => of<VehicleDetected[]>([])));

    return combineLatest([sensor$, vehicle$]).pipe(
      catchError((err) => {
        console.error('[CorrelationMatrix] Error loading data:', err);
        this.hasError = true;
        this.errorMsg = 'Error loading data. Please try again.';
        this.isLoading = false;
        this.cdr.markForCheck();
        return of(null);
      }),
      switchMap((result) => {
        if (!result) {
          return of({ matrix: [] as CellResult[][], sampleSize: 0 });
        }

        const [sensorData, vehicleData] = result;

        const slotStart = Math.floor(start.getTime() / slot) * slot;
        const slotCount = Math.ceil((end.getTime() - slotStart) / slot);

        const rows: Record<string, number>[] = [];

        for (let i = 0; i < slotCount; i++) {
          const sStart = slotStart + i * slot;
          const sEnd = sStart + slot;

          const inSlotSensor = sensorData.filter((d) => {
            const t = new Date(d.timestamp).getTime();
            return t >= sStart && t < sEnd;
          });

          const vehicleCount = vehicleData.filter((v) => {
            const t = new Date(v.timestamp).getTime();
            return t >= sStart && t < sEnd;
          }).length;

          if (inSlotSensor.length === 0 && vehicleCount === 0) continue;

          const avg = (key: keyof SensorData) =>
            inSlotSensor.length === 0
              ? 0
              : inSlotSensor.reduce((s, d) => s + ((d[key] as number) ?? 0), 0) /
                inSlotSensor.length;

          rows.push({
            co2: avg('co2'),
            pm25: avg('pm25'),
            pm10: avg('pm10'),
            temperature: avg('temperature'),
            humidity: avg('humidity'),
            co: avg('co'),
            no2: avg('no2'),
            nh3: avg('nh3'),
            vehicleCount,
          });
        }

        const n = rows.length;
        const keys = VARIABLES.map((v) => v.key);

        const matrix: CellResult[][] = keys.map((rowKey) =>
          keys.map((colKey) => {
            if (rowKey === colKey) {
              return { r: 1, n, label: '1.00', ...this.cellStyle(1) } as CellResult;
            }
            const r = this.pearson(
              rows.map((r) => r[rowKey]),
              rows.map((r) => r[colKey]),
            );
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

  /**
   * Computes the Pearson correlation coefficient between two numeric arrays.
   *
   * @private
   * @param {number[]} xs - First variable values.
   * @param {number[]} ys - Second variable values.
   * @returns {number} Correlation coefficient in range [-1, 1], or NaN if n < 2.
   */
  private pearson(xs: number[], ys: number[]): number {
    const n = xs.length;
    if (n < 2) return NaN;

    const meanX = xs.reduce((a, b) => a + b, 0) / n;
    const meanY = ys.reduce((a, b) => a + b, 0) / n;

    let num = 0,
      denX = 0,
      denY = 0;
    for (let i = 0; i < n; i++) {
      const dx = xs[i] - meanX;
      const dy = ys[i] - meanY;
      num += dx * dy;
      denX += dx * dx;
      denY += dy * dy;
    }

    const den = Math.sqrt(denX * denY);
    return den === 0 ? 0 : num / den;
  }

  /**
   * Returns Tailwind utility classes for matrix cell styling
   * based on correlation strength.
   *
   * @private
   * @param {number} r - Pearson coefficient.
   * @returns {Object} Object with 'color' and 'textColor' Tailwind classes.
   */
  private cellStyle(r: number): { color: string; textColor: string } {
    if (isNaN(r)) return { color: 'bg-gray-100 dark:bg-gray-700', textColor: 'text-gray-400' };
    if (r >= 0.7) return { color: 'bg-emerald-600', textColor: 'text-white' };
    if (r >= 0.3)
      return {
        color: 'bg-emerald-200 dark:bg-emerald-900/50',
        textColor: 'text-emerald-900 dark:text-emerald-200',
      };
    if (r <= -0.7) return { color: 'bg-blue-600', textColor: 'text-white' };
    if (r <= -0.3)
      return {
        color: 'bg-blue-200 dark:bg-blue-900/50',
        textColor: 'text-blue-900 dark:text-blue-200',
      };
    return { color: 'bg-gray-100 dark:bg-gray-700', textColor: 'text-gray-500 dark:text-gray-400' };
  }

  /**
   * Determines if a matrix cell is on the diagonal (self-correlation).
   *
   * @param {number} rowIdx - Row index.
   * @param {number} colIdx - Column index.
   * @returns {boolean} True if row and column indices match.
   */
  isDiagonal(rowIdx: number, colIdx: number): boolean {
    return rowIdx === colIdx;
  }
}
