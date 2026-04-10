/**
 * DeleteDataFormComponent
 *
 * Componente para eliminar datos masivos del sistema: datos de sensores y detecciones de vehículos.
 * Permite borrar todos los registros o por rango de fechas, con confirmación y feedback visual vía toast.
 *
 * Características:
 * - Consulta automática del primer y último registro para limitar los rangos válidos
 * - Eliminación total o por rango de fechas para sensores y vehículos
 * - Modal de confirmación antes de acciones destructivas
 * - Mensajes de éxito/error mediante ToastService
 * - Estados de carga y feedback reactivo con BehaviorSubject
 *
 * @selector app-delete-data-form
 * @standalone true
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
  // Sensor data section
  sensorMinDate = '';
  sensorMaxDate = '';
  sensorStartDate = '';
  sensorEndDate = '';
  sensorLoading$ = new BehaviorSubject<boolean>(false);
  sensorSuccess$ = new BehaviorSubject<string | null>(null);
  sensorError$ = new BehaviorSubject<string | null>(null);

  // Vehicles section
  vehicleMinDate = '';
  vehicleMaxDate = '';
  vehicleStartDate = '';
  vehicleEndDate = '';
  vehicleLoading$ = new BehaviorSubject<boolean>(false);
  vehicleSuccess$ = new BehaviorSubject<string | null>(null);
  vehicleError$ = new BehaviorSubject<string | null>(null);

  // Confirmation modal
  confirmVisible = false;
  confirmTitle = '';
  confirmDesc = '';
  private pendingAction: (() => void) | null = null;

  constructor(
    private sensorService: SensorDataService,
    private vehicleService: VehicleDetectedService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadSensorDateBounds();
    this.loadVehicleDateBounds();
  }

  private loadSensorDateBounds(): void {
    this.sensorService.getFirstRecord().subscribe({
      next: (r) => { this.sensorMinDate = this.toDateString(r.timestamp); this.cdr.markForCheck(); },
      error: () => {}
    });
    this.sensorService.getLastRecord().subscribe({
      next: (r) => { this.sensorMaxDate = this.toDateString(r.timestamp); this.cdr.markForCheck(); },
      error: () => {}
    });
  }

  private loadVehicleDateBounds(): void {
    this.vehicleService.getFirstRecord().subscribe({
      next: (r) => { this.vehicleMinDate = this.toDateString(r.timestamp); this.cdr.markForCheck(); },
      error: () => {}
    });
    this.vehicleService.getLastRecord().subscribe({
      next: (r) => { this.vehicleMaxDate = this.toDateString(r.timestamp); this.cdr.markForCheck(); },
      error: () => {}
    });
  }

  private toDateString(timestamp: any): string {
    if (!timestamp) return '';
    const d = new Date(timestamp);
    return d.toISOString().split('T')[0];
  }

  requestConfirm(title: string, desc: string, action: () => void): void {
    this.confirmTitle = title;
    this.confirmDesc = desc;
    this.pendingAction = action;
    this.confirmVisible = true;
    this.cdr.markForCheck();
  }

  confirmAction(): void {
    this.confirmVisible = false;
    if (this.pendingAction) {
      this.pendingAction();
      this.pendingAction = null;
    }
    this.cdr.markForCheck();
  }

  cancelConfirm(): void {
    this.confirmVisible = false;
    this.pendingAction = null;
    this.cdr.markForCheck();
  }

  // ── Sensor actions ─────────────────────────────────────────────────────────

  deleteSensorAll(): void {
    this.requestConfirm(
      'Eliminar todos los datos de sensores',
      'Esta acción borrará permanentemente todos los registros de sensores. No se puede deshacer.',
      () => this.executeSensorAll()
    );
  }

  private executeSensorAll(): void {
    this.sensorLoading$.next(true);
    this.sensorSuccess$.next(null);
    this.sensorError$.next(null);
    this.cdr.markForCheck();
    this.sensorService.deleteAll().pipe(
      finalize(() => this.sensorLoading$.next(false))
    ).subscribe({
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
      }
    });
  }

  deleteSensorByRange(): void {
    if (!this.sensorStartDate || !this.sensorEndDate) return;
    this.requestConfirm(
      'Eliminar datos de sensores por rango',
      `Se eliminarán permanentemente los registros entre ${this.sensorStartDate} y ${this.sensorEndDate}.`,
      () => this.executeSensorByRange()
    );
  }

  private executeSensorByRange(): void {
    this.sensorLoading$.next(true);
    this.sensorSuccess$.next(null);
    this.sensorError$.next(null);
    this.cdr.markForCheck();
    const start = new Date(this.sensorStartDate + 'T00:00:00');
    const end = new Date(this.sensorEndDate + 'T23:59:59');
    this.sensorService.deleteByDateRange(start, end).pipe(
      finalize(() => this.sensorLoading$.next(false))
    ).subscribe({
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
      }
    });
  }

  // ── Vehicle actions ─────────────────────────────────────────────────────────

  deleteVehicleAll(): void {
    this.requestConfirm(
      'Eliminar todas las detecciones de vehículos',
      'Esta acción borrará permanentemente todos los registros de vehículos detectados. No se puede deshacer.',
      () => this.executeVehicleAll()
    );
  }

  private executeVehicleAll(): void {
    this.vehicleLoading$.next(true);
    this.vehicleSuccess$.next(null);
    this.vehicleError$.next(null);
    this.cdr.markForCheck();
    this.vehicleService.deleteAll().pipe(
      finalize(() => this.vehicleLoading$.next(false))
    ).subscribe({
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
      }
    });
  }

  deleteVehicleByRange(): void {
    if (!this.vehicleStartDate || !this.vehicleEndDate) return;
    this.requestConfirm(
      'Eliminar detecciones por rango de fechas',
      `Se eliminarán permanentemente los registros entre ${this.vehicleStartDate} y ${this.vehicleEndDate}.`,
      () => this.executeVehicleByRange()
    );
  }

  private executeVehicleByRange(): void {
    this.vehicleLoading$.next(true);
    this.vehicleSuccess$.next(null);
    this.vehicleError$.next(null);
    this.cdr.markForCheck();
    const start = new Date(this.vehicleStartDate + 'T00:00:00');
    const end = new Date(this.vehicleEndDate + 'T23:59:59');
    this.vehicleService.deleteByDateRange(start, end).pipe(
      finalize(() => this.vehicleLoading$.next(false))
    ).subscribe({
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
      }
    });
  }
}
