import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  OnInit,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, of, firstValueFrom } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';
import { SensorDataService } from '../../../../core/services/sensor-data.service';
import { DeviceService } from '../../../../core/services/device.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Device } from '../../../../core/models/device.model';

/**
 * Emitted value when the user selects a period.
 */
export type MetricKey = 'co2' | 'pm25' | 'pm10' | 'temperature' | 'humidity' | 'co' | 'no2' | 'nh3';

export interface MetricOption {
  key: MetricKey;
  label: string;
  unit: string;
}

export const METRICS: MetricOption[] = [
  { key: 'co2', label: 'CO₂', unit: 'ppm' },
  { key: 'pm25', label: 'PM2.5', unit: 'µg/m³' },
  { key: 'pm10', label: 'PM10', unit: 'µg/m³' },
  { key: 'temperature', label: 'Temperatura', unit: '°C' },
  { key: 'humidity', label: 'Humedad', unit: '%' },
  { key: 'co', label: 'CO', unit: 'ppm' },
  { key: 'no2', label: 'NO₂', unit: 'ppb' },
  { key: 'nh3', label: 'NH₃', unit: 'ppb' },
];

export interface PeriodRange {
  start: Date;
  end: Date;
  locationDeviceIds?: number[];
  metric: MetricKey;
}

interface QuickOption {
  key: string;
  label: string;
  hours: number;
}

const QUICK_OPTIONS: QuickOption[] = [
  { key: '24h', label: 'Últimas 24h', hours: 24 },
  { key: '7d', label: 'Últimos 7 días', hours: 168 },
  { key: '30d', label: 'Últimos 30 días', hours: 720 },
];

/**
 * PeriodRangeSelectorComponent (Stateful Component)
 *
 * Provides a dual-mode period selector for analysis components:
 * - Quick preset buttons (24h / 7d / 30d): emit immediately on click
 * - Custom date range: start + end date pickers with validation, emits on Apply
 *
 * Features:
 * - Mutually exclusive modes: selecting a quick option clears the date inputs and vice-versa
 * - Validation: end date must be >= start date; no future dates allowed
 * - Date picker bounds fetched from first/last sensor record (same pattern as history-filters)
 * - Emits PeriodRange { start, end } on user interaction only (no automatic emit on init)
 *
 * @selector app-period-range-selector
 * @standalone true
 * @imports FormsModule
 * @example
 * <app-period-range-selector (periodChange)="onPeriodChange($event)" />
 */
@Component({
  selector: 'app-period-range-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './period-range-selector.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PeriodRangeSelectorComponent implements OnInit {
  /** Emits when the user selects a quick option or applies a custom range. */
  @Output() periodChange = new EventEmitter<PeriodRange>();

  /** Available quick-period options shown as buttons. */
  readonly quickOptions = QUICK_OPTIONS;

  /** Key of the currently active quick option, null when custom mode is active. */
  selectedQuick: string | null = null;

  /** Start date string in YYYY-MM-DD format for the custom date picker. */
  startDate: string = '';

  /** End date string in YYYY-MM-DD format for the custom date picker. */
  endDate: string = '';

  /** Minimum selectable date (first available sensor record) in YYYY-MM-DD format. */
  minDate: string = '';

  /** Maximum selectable date (last available sensor record) in YYYY-MM-DD format. */
  maxDate: string = '';

  /** Validation error message shown below the date inputs. Empty when valid. */
  dateError: string = '';

  /** Observable stream of unique locations aggregated from devices. */
  locations$!: Observable<{ locationId: number; label: string; deviceIds: number[] }[]>;

  /** Currently selected location ID (empty string = all locations). */
  selectedLocationId: string = '';

  /** Currently selected metric key. */
  selectedMetric: MetricKey = 'co2';

  /** Available metrics for the parameter selector. */
  readonly metrics = METRICS;

  /** True while a data-existence check is in progress (blocks duplicate submissions). */
  isValidating = false;

  private locationDeviceMap = new Map<number, number[]>();

  constructor(
    private readonly sensorDataService: SensorDataService,
    private readonly deviceService: DeviceService,
    private readonly toastService: ToastService,
    private readonly cdr: ChangeDetectorRef,
  ) {
    this.initializeLocations();
  }

  ngOnInit(): void {
    this.loadDateBounds();
  }

  /**
   * Activates a quick preset, fills the date inputs, validates that data exists,
   * and emits the resolved range. Shows a warning toast if no data is found.
   */
  async selectQuick(key: string): Promise<void> {
    if (this.isValidating) return;

    this.selectedQuick = key;
    this.dateError = '';

    const option = QUICK_OPTIONS.find((o) => o.key === key)!;
    const end = new Date();
    const start = new Date(end.getTime() - option.hours * 3_600_000);

    this.startDate = this.toDateString(start);
    this.endDate = this.toDateString(end);

    this.isValidating = true;
    this.cdr.markForCheck();

    const check = await firstValueFrom(
      this.sensorDataService.search({ start, end, size: 1 }).pipe(catchError(() => of([]))),
    );

    this.isValidating = false;

    if (check.length === 0) {
      this.toastService.show('No hay datos de sensores en el período seleccionado.', {
        title: 'Sin datos',
        variant: 'warning',
      });
      this.cdr.markForCheck();
      return;
    }

    this.periodChange.emit({ start, end, locationDeviceIds: this.resolveLocationDeviceIds(), metric: this.selectedMetric });
    this.cdr.markForCheck();
  }

  /**
   * Called when either date input changes. Deactivates any quick option
   * and clears any previous validation error.
   */
  onDateChange(): void {
    this.selectedQuick = null;
    this.dateError = '';
    this.cdr.markForCheck();
  }

  /**
   * Validates the custom date range, checks that data exists, and emits if valid.
   * Errors are displayed inline; a toast is shown when the period has no sensor data.
   */
  async applyCustomRange(): Promise<void> {
    if (this.isValidating) return;

    this.dateError = '';

    if (!this.startDate || !this.endDate) {
      this.dateError = 'Debes seleccionar tanto la fecha de inicio como la de fin.';
      this.cdr.markForCheck();
      return;
    }

    const start = new Date(this.startDate + 'T00:00:00');
    const end = new Date(this.endDate + 'T23:59:59');

    if (start > end) {
      this.dateError = 'La fecha de inicio no puede ser posterior a la fecha de fin.';
      this.cdr.markForCheck();
      return;
    }

    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (end > today) {
      this.dateError = 'La fecha de fin no puede ser en el futuro.';
      this.cdr.markForCheck();
      return;
    }

    this.isValidating = true;
    this.cdr.markForCheck();

    const check = await firstValueFrom(
      this.sensorDataService.search({ start, end, size: 1 }).pipe(catchError(() => of([]))),
    );

    this.isValidating = false;

    if (check.length === 0) {
      this.toastService.show('No hay datos de sensores en el período seleccionado.', {
        title: 'Sin datos',
        variant: 'warning',
      });
      this.cdr.markForCheck();
      return;
    }

    this.periodChange.emit({ start, end, locationDeviceIds: this.resolveLocationDeviceIds(), metric: this.selectedMetric });
    this.cdr.markForCheck();
  }

  /**
   * Resets all state (both quick selection and date inputs) without emitting.
   */
  clearCustomRange(): void {
    this.selectedQuick = null;
    this.startDate = '';
    this.endDate = '';
    this.selectedLocationId = '';
    this.selectedMetric = 'co2';
    this.dateError = '';
    this.cdr.markForCheck();
  }

  /**
   * Loads the earliest and latest sensor record timestamps to constrain the date pickers.
   * Silently ignores errors (pickers remain unconstrained).
   */
  private initializeLocations(): void {
    this.locations$ = this.deviceService.getAll().pipe(
      catchError(() => of([])),
      map((devices: Device[]) => {
        const locationMap = new Map<number, { label: string; deviceIds: number[] }>();
        for (const device of devices) {
          const locId = device.location.id;
          if (!locationMap.has(locId)) {
            locationMap.set(locId, { label: device.location.description || `Location ${locId}`, deviceIds: [] });
          }
          locationMap.get(locId)!.deviceIds.push(device.id);
        }
        this.locationDeviceMap.clear();
        locationMap.forEach((value, key) => this.locationDeviceMap.set(key, value.deviceIds));
        return Array.from(locationMap.entries()).map(([locationId, { label, deviceIds }]) => ({ locationId, label, deviceIds }));
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
  }

  private resolveLocationDeviceIds(): number[] | undefined {
    if (!this.selectedLocationId) return undefined;
    const id = Number(this.selectedLocationId);
    return isNaN(id) ? undefined : this.locationDeviceMap.get(id);
  }

  private loadDateBounds(): void {
    this.sensorDataService.getFirstRecord().subscribe({
      next: (r) => {
        this.minDate = this.toDateString(r.timestamp);
        this.cdr.markForCheck();
      },
      error: () => {},
    });

    this.sensorDataService.getLastRecord().subscribe({
      next: (r) => {
        this.maxDate = this.toDateString(r.timestamp);
        this.cdr.markForCheck();
      },
      error: () => {},
    });
  }

  /**
   * Converts any timestamp value to YYYY-MM-DD string for date input binding.
   */
  private toDateString(timestamp: string | number | Date | null | undefined): string {
    if (!timestamp) return '';
    const d = new Date(timestamp);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
