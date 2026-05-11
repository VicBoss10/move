import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { combineLatest, of, Subject } from 'rxjs';
import { catchError, switchMap, takeUntil } from 'rxjs/operators';
import { SensorDataService } from '../../../../core/services/sensor-data.service';
import { VehicleDetectedService } from '../../../../core/services/vehicle-detected.service';
import { SensorData } from '../../../../core/models/sensor-data.model';
import { VehicleDetected } from '../../../../core/models/vehicle.model';
import {
  PeriodRangeSelectorComponent,
  PeriodRange,
} from '../period-range-selector/period-range-selector.component';

interface Variable {
  key: string;
  label: string;
  shortLabel: string;
  unit: string;
}

interface CellResult {
  r: number;
  n: number;
  label: string;
  color: string;
  textColor: string;
}

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
 * CorrelationMatrixComponent
 *
 * Calculates and visualizes the Pearson correlation matrix between
 * 8 environmental variables and vehicle traffic counts.
 * Period is selected via the shared PeriodRangeSelectorComponent.
 * Slot size is derived automatically from the selected range duration.
 *
 * @selector app-correlation-matrix
 * @standalone true
 */
@Component({
  selector: 'app-correlation-matrix',
  standalone: true,
  imports: [CommonModule, PeriodRangeSelectorComponent],
  templateUrl: './correlation-matrix.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CorrelationMatrixComponent implements OnInit, OnDestroy {
  readonly variables = VARIABLES;

  private readonly load$ = new Subject<{ start: Date; end: Date }>();
  private readonly destroy$ = new Subject<void>();

  /** True once the user has selected at least one period. */
  hasPeriod = false;
  isLoading = false;
  hasError = false;
  errorMsg = '';
  matrix: CellResult[][] = [];
  sampleSize = 0;

  readonly legend = [
    { color: 'bg-emerald-600', text: 'Strong positive correlation (r ≥ 0.7)' },
    { color: 'bg-emerald-300', text: 'Moderate positive correlation (0.3 ≤ r < 0.7)' },
    { color: 'bg-gray-100 dark:bg-gray-700', text: 'No significant correlation (|r| < 0.3)' },
    { color: 'bg-blue-300', text: 'Moderate negative correlation (-0.7 < r ≤ -0.3)' },
    { color: 'bg-blue-600', text: 'Strong negative correlation (r ≤ -0.7)' },
  ];

  constructor(
    private readonly sensorDataService: SensorDataService,
    private readonly vehicleService: VehicleDetectedService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.load$
      .pipe(
        takeUntil(this.destroy$),
        switchMap(({ start, end }) => {
          this.isLoading = true;
          this.hasError = false;
          this.cdr.markForCheck();
          return this.loadAndCompute(start, end);
        }),
      )
      .subscribe(({ matrix, sampleSize }) => {
        this.matrix = matrix;
        this.sampleSize = sampleSize;
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
    this.hasPeriod = true;
    this.load$.next({ start: range.start, end: range.end });
  }

  private loadAndCompute(start: Date, end: Date) {
    const slot = this.slotFor(start, end);

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
   * Derives aggregation slot size from the selected range duration.
   * ≤ 2 days → 1h · ≤ 14 days → 4h · > 14 days → 1 day
   */
  private slotFor(start: Date, end: Date): number {
    const diffMs = end.getTime() - start.getTime();
    if (diffMs <= 2 * 24 * 3_600_000) return 3_600_000;
    if (diffMs <= 14 * 24 * 3_600_000) return 4 * 3_600_000;
    return 24 * 3_600_000;
  }

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

  isDiagonal(rowIdx: number, colIdx: number): boolean {
    return rowIdx === colIdx;
  }
}
