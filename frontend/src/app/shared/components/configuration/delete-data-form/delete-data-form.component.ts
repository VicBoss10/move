/**
 * DeleteDataFormComponent (Smart Component)
 *
 * Manages bulk deletion of sensor data and vehicle detection records with confirmation workflows.
 * Supports total deletion or date-range bounded deletion for both data types.
 *
 * Features:
 * - Auto-loaded first/last record timestamps for min/max date constraints
 * - Total deletion or date-range bounded deletion for sensors and vehicles
 * - Destructive action confirmation modal with warning messages
 * - Reactive loading and success/error state management via BehaviorSubject
 * - Toast notifications for user feedback
 * - Independent sensor and vehicle data management sections
 * - Date input field validation and constraint binding
 * - Dark mode support
 * - OnPush change detection with manual ChangeDetectorRef triggers
 *
 * @selector app-delete-data-form
 * @standalone true
 * @imports CommonModule, FormsModule
 * @example
 * <app-delete-data-form />
 */
import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SensorDataService } from '../../../../core/services/sensor-data.service';
import { VehicleDetectedService } from '../../../../core/services/vehicle-detected.service';
import { BehaviorSubject } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-delete-data-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './delete-data-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeleteDataFormComponent implements OnInit {
  sensorMinDate = '';
  sensorMaxDate = '';
  sensorStartDate = '';
  sensorEndDate = '';
  sensorLoading$ = new BehaviorSubject<boolean>(false);
  sensorSuccess$ = new BehaviorSubject<string | null>(null);
  sensorError$ = new BehaviorSubject<string | null>(null);

  vehicleMinDate = '';
  vehicleMaxDate = '';
  vehicleStartDate = '';
  vehicleEndDate = '';
  vehicleLoading$ = new BehaviorSubject<boolean>(false);
  vehicleSuccess$ = new BehaviorSubject<string | null>(null);
  vehicleError$ = new BehaviorSubject<string | null>(null);

  confirmVisible = false;
  confirmTitle = '';
  confirmDesc = '';
  private pendingAction: (() => void) | null = null;

  /**
   * Initializes component with service dependencies.
   * @param {SensorDataService} sensorService - Service managing sensor data operations
   * @param {VehicleDetectedService} vehicleService - Service managing vehicle detection data operations
   * @param {ToastService} toastService - Service for displaying user notifications
   * @param {ChangeDetectorRef} cdr - Change detection reference for manual triggering in OnPush mode
   */
  constructor(
    private sensorService: SensorDataService,
    private vehicleService: VehicleDetectedService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef,
  ) {}

  /**
   * Component initialization lifecycle hook.
   * Loads first and last timestamps for both sensor and vehicle data to constrain date inputs.
   */
  ngOnInit(): void {
    this.loadSensorDateBounds();
    this.loadVehicleDateBounds();
  }

  /**
   * Loads first and last sensor data record timestamps to constrain date picker min/max.
   * Silently fails on error (no message if no records exist).
   * @private
   */
  private loadSensorDateBounds(): void {
    this.sensorService.getFirstRecord().subscribe({
      next: (r) => {
        this.sensorMinDate = this.toDateString(r.timestamp);
        this.cdr.markForCheck();
      },
      error: () => {},
    });
    this.sensorService.getLastRecord().subscribe({
      next: (r) => {
        this.sensorMaxDate = this.toDateString(r.timestamp);
        this.cdr.markForCheck();
      },
      error: () => {},
    });
  }

  /**
   * Loads first and last vehicle detection record timestamps to constrain date picker min/max.
   * Silently fails on error (no message if no records exist).
   * @private
   */
  private loadVehicleDateBounds(): void {
    this.vehicleService.getFirstRecord().subscribe({
      next: (r) => {
        this.vehicleMinDate = this.toDateString(r.timestamp);
        this.cdr.markForCheck();
      },
      error: () => {},
    });
    this.vehicleService.getLastRecord().subscribe({
      next: (r) => {
        this.vehicleMaxDate = this.toDateString(r.timestamp);
        this.cdr.markForCheck();
      },
      error: () => {},
    });
  }

  /**
   * Converts timestamp to ISO 8601 date string (YYYY-MM-DD) for date input binding.
   * @param {string | number | Date | null | undefined} timestamp - Timestamp to convert
   * @returns {string} ISO date string or empty string if null
   * @private
   */
  private toDateString(timestamp: string | number | Date | null | undefined): string {
    if (!timestamp) return '';
    const d = new Date(timestamp);
    return d.toISOString().split('T')[0];
  }

  /**
   * Opens confirmation modal with custom title and description.
   * Stores pending action callback to execute if user confirms.
   * @param {string} title - Modal header title
   * @param {string} desc - Modal body description/warning message
   * @param {() => void} action - Callback function to execute on confirmation
   */
  requestConfirm(title: string, desc: string, action: () => void): void {
    this.confirmTitle = title;
    this.confirmDesc = desc;
    this.pendingAction = action;
    this.confirmVisible = true;
    this.cdr.markForCheck();
  }

  /**
   * Executes pending action and closes confirmation modal.
   */
  confirmAction(): void {
    this.confirmVisible = false;
    if (this.pendingAction) {
      this.pendingAction();
      this.pendingAction = null;
    }
    this.cdr.markForCheck();
  }

  /**
   * Cancels pending action and closes confirmation modal.
   */
  cancelConfirm(): void {
    this.confirmVisible = false;
    this.pendingAction = null;
    this.cdr.markForCheck();
  }

  /**
   * Initiates total sensor data deletion with confirmation modal.
   */
  deleteSensorAll(): void {
    this.requestConfirm(
      'Eliminar todos los datos de sensores',
      'Esta acción borrará permanentemente todos los registros de sensores. No se puede deshacer.',
      () => this.executeSensorAll(),
    );
  }

  /**
   * Executes total sensor data deletion with loading state and error handling.
   * Resets date bounds and clears input fields on success.
   * @private
   */
  private executeSensorAll(): void {
    this.sensorLoading$.next(true);
    this.sensorSuccess$.next(null);
    this.sensorError$.next(null);
    this.cdr.markForCheck();
    this.sensorService
      .deleteAll()
      .pipe(finalize(() => this.sensorLoading$.next(false)))
      .subscribe({
        next: () => {
          const msg = 'Todos los datos de sensores han sido eliminados correctamente.';
          this.sensorSuccess$.next(msg);
          this.toastService.success(msg, 'Éxito');
          this.sensorMinDate = '';
          this.sensorMaxDate = '';
          this.sensorStartDate = '';
          this.sensorEndDate = '';
          this.cdr.markForCheck();
        },
        error: (err) => {
          const msg = 'Error al eliminar: ' + (err?.message ?? 'Error desconocido');
          this.sensorError$.next(msg);
          this.toastService.error(msg, 'Error');
          this.cdr.markForCheck();
        },
      });
  }

  /**
   * Initiates sensor data deletion by date range with confirmation modal.
   * Validates both start and end dates are selected before proceeding.
   */
  deleteSensorByRange(): void {
    if (!this.sensorStartDate || !this.sensorEndDate) return;
    this.requestConfirm(
      'Eliminar datos de sensores por rango',
      `Se eliminarán permanentemente los registros entre ${this.sensorStartDate} y ${this.sensorEndDate}.`,
      () => this.executeSensorByRange(),
    );
  }

  /**
   * Executes sensor data deletion by date range with loading state and error handling.
   * Converts date strings to ISO timestamps with time bounds (start: 00:00:00, end: 23:59:59).
   * Reloads date bounds on success.
   * @private
   */
  private executeSensorByRange(): void {
    this.sensorLoading$.next(true);
    this.sensorSuccess$.next(null);
    this.sensorError$.next(null);
    this.cdr.markForCheck();
    const start = new Date(this.sensorStartDate + 'T00:00:00');
    const end = new Date(this.sensorEndDate + 'T23:59:59');
    this.sensorService
      .deleteByDateRange(start, end)
      .pipe(finalize(() => this.sensorLoading$.next(false)))
      .subscribe({
        next: () => {
          const msg = `Datos entre ${this.sensorStartDate} y ${this.sensorEndDate} eliminados correctamente.`;
          this.sensorSuccess$.next(msg);
          this.toastService.success(msg, 'Éxito');
          this.sensorStartDate = '';
          this.sensorEndDate = '';
          this.loadSensorDateBounds();
          this.cdr.markForCheck();
        },
        error: (err) => {
          const msg = 'Error al eliminar: ' + (err?.message ?? 'Error desconocido');
          this.sensorError$.next(msg);
          this.toastService.error(msg, 'Error');
          this.cdr.markForCheck();
        },
      });
  }

  /**
   * Initiates total vehicle detection data deletion with confirmation modal.
   */
  deleteVehicleAll(): void {
    this.requestConfirm(
      'Eliminar todas las detecciones de vehículos',
      'Esta acción borrará permanentemente todos los registros de vehículos detectados. No se puede deshacer.',
      () => this.executeVehicleAll(),
    );
  }

  /**
   * Executes total vehicle detection data deletion with loading state and error handling.
   * Resets date bounds and clears input fields on success.
   * @private
   */
  private executeVehicleAll(): void {
    this.vehicleLoading$.next(true);
    this.vehicleSuccess$.next(null);
    this.vehicleError$.next(null);
    this.cdr.markForCheck();
    this.vehicleService
      .deleteAll()
      .pipe(finalize(() => this.vehicleLoading$.next(false)))
      .subscribe({
        next: () => {
          const msg = 'Todas las detecciones de vehículos han sido eliminadas correctamente.';
          this.vehicleSuccess$.next(msg);
          this.toastService.success(msg, 'Éxito');
          this.vehicleMinDate = '';
          this.vehicleMaxDate = '';
          this.vehicleStartDate = '';
          this.vehicleEndDate = '';
          this.cdr.markForCheck();
        },
        error: (err) => {
          const msg = 'Error al eliminar: ' + (err?.message ?? 'Error desconocido');
          this.vehicleError$.next(msg);
          this.toastService.error(msg, 'Error');
          this.cdr.markForCheck();
        },
      });
  }

  /**
   * Initiates vehicle detection data deletion by date range with confirmation modal.
   * Validates both start and end dates are selected before proceeding.
   */
  deleteVehicleByRange(): void {
    if (!this.vehicleStartDate || !this.vehicleEndDate) return;
    this.requestConfirm(
      'Eliminar detecciones por rango de fechas',
      `Se eliminarán permanentemente los registros entre ${this.vehicleStartDate} y ${this.vehicleEndDate}.`,
      () => this.executeVehicleByRange(),
    );
  }

  /**
   * Executes vehicle detection data deletion by date range with loading state and error handling.
   * Converts date strings to ISO timestamps with time bounds (start: 00:00:00, end: 23:59:59).
   * Reloads date bounds on success.
   * @private
   */
  private executeVehicleByRange(): void {
    this.vehicleLoading$.next(true);
    this.vehicleSuccess$.next(null);
    this.vehicleError$.next(null);
    this.cdr.markForCheck();
    const start = new Date(this.vehicleStartDate + 'T00:00:00');
    const end = new Date(this.vehicleEndDate + 'T23:59:59');
    this.vehicleService
      .deleteByDateRange(start, end)
      .pipe(finalize(() => this.vehicleLoading$.next(false)))
      .subscribe({
        next: () => {
          const msg = `Registros entre ${this.vehicleStartDate} y ${this.vehicleEndDate} eliminados correctamente.`;
          this.vehicleSuccess$.next(msg);
          this.toastService.success(msg, 'Éxito');
          this.vehicleStartDate = '';
          this.vehicleEndDate = '';
          this.loadVehicleDateBounds();
          this.cdr.markForCheck();
        },
        error: (err) => {
          const msg = 'Error al eliminar: ' + (err?.message ?? 'Error desconocido');
          this.vehicleError$.next(msg);
          this.toastService.error(msg, 'Error');
          this.cdr.markForCheck();
        },
      });
  }
}
