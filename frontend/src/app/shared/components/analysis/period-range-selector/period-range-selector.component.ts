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
import { SensorDataService } from '../../../../core/services/sensor-data.service';

/**
 * Emitted value when the user selects a period.
 */
export interface PeriodRange {
  start: Date;
  end: Date;
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

  constructor(
    private readonly sensorDataService: SensorDataService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadDateBounds();
  }

  /**
   * Activates a quick preset, clears custom inputs, and emits the resolved range immediately.
   */
  selectQuick(key: string): void {
    this.selectedQuick = key;
    this.startDate = '';
    this.endDate = '';
    this.dateError = '';

    const option = QUICK_OPTIONS.find((o) => o.key === key)!;
    const end = new Date();
    const start = new Date(end.getTime() - option.hours * 3_600_000);

    this.periodChange.emit({ start, end });
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
   * Validates the custom date range and emits if valid.
   * Errors are displayed inline and no event is emitted on failure.
   */
  applyCustomRange(): void {
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

    this.periodChange.emit({ start, end });
    this.cdr.markForCheck();
  }

  /**
   * Resets all state (both quick selection and date inputs) without emitting.
   */
  clearCustomRange(): void {
    this.selectedQuick = null;
    this.startDate = '';
    this.endDate = '';
    this.dateError = '';
    this.cdr.markForCheck();
  }

  /**
   * Loads the earliest and latest sensor record timestamps to constrain the date pickers.
   * Silently ignores errors (pickers remain unconstrained).
   */
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
