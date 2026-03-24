import { Component, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Observable, of, Subject } from 'rxjs';
import { map, catchError, switchMap, startWith } from 'rxjs/operators';
import { DeviceStatusService, DeviceStatusInfo } from '../../../../core/services/device-status.service';
import { DeviceService } from '../../../../core/services/device.service';
import { LocationService } from '../../../../core/services/location.service';
import { CameraService } from '../../../../core/services/camera.service';
import { SensorService } from '../../../../core/services/sensor.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Device, DeviceType, DeviceState } from '../../../../core/models/device.model';
import { Camera, StreamType } from '../../../../core/models/camera.model';
import { Location } from '../../../../core/models/location.model';
import { ModalComponent } from '../../ui/modal/modal.component';

/**
 * DeviceStatusTableComponent (Shared/Smart Component)
 *
 * Muestra el estado actual de todos los dispositivos registrados.
 * Permite editar nombre/estado/ubicación y eliminar dispositivos.
 *
 * @selector app-device-status-table
 * @standalone true
 */
@Component({
  selector: 'app-device-status-table',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ModalComponent],
  templateUrl: './device-status-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeviceStatusTableComponent {
  devices$: Observable<DeviceStatusInfo[]>;
  locations$: Observable<Location[]>;

  private refresh$ = new Subject<void>();

  // Edit state
  editingDevice: DeviceStatusInfo | null = null;
  editingCamera: Camera | null = null;
  editForm: FormGroup;
  editSaving = false;

  // Delete state
  deleteTarget: DeviceStatusInfo | null = null;
  deleteSaving = false;

  readonly DeviceType = DeviceType;
  readonly DeviceState = DeviceState;

  readonly streamTypes = [
    { id: StreamType.RTSP, label: 'RTSP Stream' },
    { id: StreamType.URL, label: 'HTTP/HTTPS URL' },
    { id: StreamType.USB, label: 'Dispositivo USB' },
    { id: StreamType.YOUTUBE, label: 'YouTube' },
  ];

  constructor(
    private deviceStatusService: DeviceStatusService,
    private deviceService: DeviceService,
    private locationService: LocationService,
    private cameraService: CameraService,
    private sensorService: SensorService,
    private toastService: ToastService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    this.editForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      state: [DeviceState.ACTIVE, Validators.required],
      locationId: [null, Validators.required],
      streamType: [''],
      source: [''],
    });

    this.devices$ = this.refresh$.pipe(
      startWith(null as null),
      switchMap(() =>
        this.deviceStatusService.getDeviceStatuses().pipe(
          catchError((error) => {
            console.error('Error loading device statuses:', error);
            return of([]);
          })
        )
      )
    );

    this.locations$ = this.locationService.getAll().pipe(
      catchError(() => of([]))
    );
  }

  // ─── Edit ────────────────────────────────────────────────────────────────

  openEdit(device: DeviceStatusInfo): void {
    this.editSaving = false;

    if (device.type === DeviceType.CAMERA) {
      this.cameraService.getCameraByDeviceId(device.id).subscribe({
        next: (camera) => {
          this.editingCamera = camera;
          this.editingDevice = device;
          this.editForm.reset({
            name: device.name,
            state: device.status,
            locationId: device.location.id,
            streamType: camera.streamType,
            source: camera.source,
          });
          this.cdr.markForCheck();
        },
        error: () => {
          this.toastService.error('No se pudieron cargar los datos de la cámara.', 'Error');
        },
      });
    } else {
      this.editingCamera = null;
      this.editingDevice = device;
      this.editForm.reset({
        name: device.name,
        state: device.status,
        locationId: device.location.id,
        streamType: '',
        source: '',
      });
      this.cdr.markForCheck();
    }
  }

  closeEdit(): void {
    this.editingDevice = null;
    this.editingCamera = null;
    this.cdr.markForCheck();
  }

  saveEdit(): void {
    if (this.editForm.invalid || !this.editingDevice) return;
    this.editSaving = true;
    this.cdr.markForCheck();

    const { name, state, locationId, streamType, source } = this.editForm.value;
    const devicePayload: Device = {
      id: this.editingDevice.id,
      name,
      type: this.editingDevice.type,
      state: state as DeviceState,
      location: { id: +locationId, latitude: 0, longitude: 0 },
    };

    const deviceName = name;
    const saveOp$: Observable<any> = this.editingCamera
      ? this.deviceService.update(devicePayload).pipe(
          switchMap(() => {
            const cameraPayload: Camera = {
              id: this.editingCamera!.id,
              device: {
                id: this.editingDevice!.id,
                name,
                type: this.editingDevice!.type,
                state,
                location: { ...devicePayload.location, description: devicePayload.location.description ?? null },
              },
              streamType: streamType as StreamType,
              source,
            };
            return this.cameraService.update(cameraPayload);
          })
        )
      : this.deviceService.update(devicePayload);

    saveOp$.subscribe({
      next: () => {
        this.toastService.success(
          `El dispositivo "${deviceName}" ha sido actualizado.`,
          'Dispositivo actualizado'
        );
        this.editingDevice = null;
        this.editingCamera = null;
        this.editSaving = false;
        this.refresh$.next();
        this.cdr.markForCheck();
      },
      error: () => {
        this.editSaving = false;
        this.toastService.error('No se pudo actualizar el dispositivo.', 'Error');
        this.cdr.markForCheck();
      },
    });
  }

  // ─── Delete ──────────────────────────────────────────────────────────────

  openDelete(device: DeviceStatusInfo): void {
    this.deleteTarget = device;
    this.deleteSaving = false;
    this.cdr.markForCheck();
  }

  closeDelete(): void {
    this.deleteTarget = null;
    this.cdr.markForCheck();
  }

  confirmDelete(): void {
    if (!this.deleteTarget) return;
    this.deleteSaving = true;
    this.cdr.markForCheck();

    const name = this.deleteTarget.name;
    const deviceId = this.deleteTarget.id;
    const isCamera = this.deleteTarget.type === DeviceType.CAMERA;

    const deleteOp$ = isCamera
      ? this.cameraService.getCameraByDeviceId(deviceId).pipe(
          switchMap((camera) => this.cameraService.delete(camera.id)),
          switchMap(() => this.deviceService.delete(deviceId))
        )
      : this.sensorService.getSensorByDeviceId(deviceId).pipe(
          switchMap((sensor) => this.sensorService.delete(sensor.id)),
          switchMap(() => this.deviceService.delete(deviceId))
        );

    deleteOp$.subscribe({
      next: () => {
        this.toastService.success(
          `El dispositivo "${name}" ha sido eliminado.`,
          'Dispositivo eliminado'
        );
        this.deleteTarget = null;
        this.deleteSaving = false;
        this.refresh$.next();
        this.cdr.markForCheck();
      },
      error: () => {
        this.deleteSaving = false;
        this.toastService.error('No se pudo eliminar el dispositivo.', 'Error');
        this.cdr.markForCheck();
      },
    });
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      INACTIVE: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
      ERROR: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      MAINTENANCE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      FAILING: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    };
    return colors[status] || colors['INACTIVE'];
  }

  getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      ACTIVE: '●',
      INACTIVE: '○',
      ERROR: '●',
      MAINTENANCE: '●',
      FAILING: '●',
    };
    return icons[status] || '○';
  }

  getStatusText(status: string): string {
    const texts: Record<string, string> = {
      ACTIVE: 'Activo',
      INACTIVE: 'Inactivo',
      ERROR: 'Error',
      MAINTENANCE: 'Mantenimiento',
      FAILING: 'Con fallas',
    };
    return texts[status] || 'Desconocido';
  }

  getDeviceTypeText(type: string): string {
    const texts: Record<string, string> = {
      SENSOR: 'Sensor',
      CAMERA: 'Cámara',
      THERMAL: 'Térmico',
    };
    return texts[type] || type;
  }
}
