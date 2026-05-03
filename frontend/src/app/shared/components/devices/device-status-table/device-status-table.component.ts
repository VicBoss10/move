import { Component, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Observable, of, Subject } from 'rxjs';
import { catchError, switchMap, startWith } from 'rxjs/operators';
import {
  DeviceStatusService,
  DeviceStatusInfo,
} from '../../../../core/services/device-status.service';
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
 * DeviceStatusTableComponent (Smart Component)
 *
 * Displays real-time status of all registered devices (sensors and cameras) with edit and delete capabilities.
 * Manages device metadata (name, state, location) and camera-specific configuration (stream type, source URL).
 *
 * Features:
 * - Grid card layout showing device status (online/offline), location, activity timestamp, data point count
 * - Inline edit modal for device name, state, location, and camera streaming parameters
 * - Delete confirmation modal with cascade delete (camera/sensor → device)
 * - Device type detection (CAMERA vs SENSOR) with conditional camera configuration fields
 * - Status indicators: color-coded badges for ACTIVE, INACTIVE, ERROR, MAINTENANCE, FAILING states
 * - Reactive device list refresh via Subject trigger after edit/delete operations
 * - Camera-specific edit flow: fetches camera data by device ID, updates device and camera in sequence
 * - Sensor-specific delete flow: fetches and deletes sensor before device deletion
 * - Dark mode support via Tailwind CSS dark: prefix
 * - OnPush change detection with manual ChangeDetectorRef triggers
 *
 * @selector app-device-status-table
 * @standalone true
 * @imports CommonModule, ReactiveFormsModule, ModalComponent
 * @example
 * <app-device-status-table />
 */
@Component({
  selector: 'app-device-status-table',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ModalComponent],
  templateUrl: './device-status-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeviceStatusTableComponent {
  /**
   * Stream of all registered devices with current status information.
   * @type {Observable<DeviceStatusInfo[]>}
   */
  devices$: Observable<DeviceStatusInfo[]>;

  /**
   * Stream of all available locations for device assignment.
   * @type {Observable<Location[]>}
   */
  locations$: Observable<Location[]>;

  /**
   * Subject triggering device list refresh after edit/delete operations.
   * @type {Subject<void>}
   * @private
   */
  private refresh$ = new Subject<void>();

  /**
   * Device currently being edited or null if modal is closed.
   * @type {DeviceStatusInfo | null}
   */
  editingDevice: DeviceStatusInfo | null = null;

  /**
   * Associated camera data for device being edited (camera devices only).
   * @type {Camera | null}
   */
  editingCamera: Camera | null = null;

  /**
   * Reactive form for device edit modal (name, state, locationId, streamType, source).
   * @type {FormGroup}
   */
  editForm: FormGroup;

  /**
   * Loading state indicator for edit save operation.
   * @type {boolean}
   */
  editSaving = false;

  /**
   * Device targeted for deletion or null if modal is closed.
   * @type {DeviceStatusInfo | null}
   */
  deleteTarget: DeviceStatusInfo | null = null;

  /**
   * Loading state indicator for delete operation.
   * @type {boolean}
   */
  deleteSaving = false;

  /**
   * Exported DeviceType enum for template access.
   * @type {typeof DeviceType}
   */
  readonly DeviceType = DeviceType;

  /**
   * Exported DeviceState enum for template access.
   * @type {typeof DeviceState}
   */
  readonly DeviceState = DeviceState;

  /**
   * Available stream type options for camera configuration.
   * @type {Array<{id: StreamType, label: string}>}
   */
  readonly streamTypes = [
    { id: StreamType.RTSP, label: 'RTSP Stream' },
    { id: StreamType.URL, label: 'HTTP/HTTPS URL' },
    { id: StreamType.USB, label: 'Dispositivo USB' },
    { id: StreamType.YOUTUBE, label: 'YouTube' },
  ];

  /**
   * Initializes component with service dependencies and sets up reactive data streams.
   * Creates edit form with validators and configures device list refresh on demand.
   * @param {DeviceStatusService} deviceStatusService - Service providing device status information
   * @param {DeviceService} deviceService - Service for device CRUD operations
   * @param {LocationService} locationService - Service for location list retrieval
   * @param {CameraService} cameraService - Service for camera-specific operations
   * @param {SensorService} sensorService - Service for sensor-specific operations
   * @param {ToastService} toastService - Service for displaying user notifications
   * @param {FormBuilder} fb - Angular FormBuilder for reactive form creation
   * @param {ChangeDetectorRef} cdr - Change detection reference for manual triggering in OnPush mode
   */
  constructor(
    private deviceStatusService: DeviceStatusService,
    private deviceService: DeviceService,
    private locationService: LocationService,
    private cameraService: CameraService,
    private sensorService: SensorService,
    private toastService: ToastService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
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
          }),
        ),
      ),
    );

    this.locations$ = this.locationService.getAll().pipe(catchError(() => of([])));
  }

  /**
   * Opens edit modal and populates form with selected device data.
   * For camera devices, fetches associated camera configuration (stream type, source).
   * @param {DeviceStatusInfo} device - Device to edit
   */
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

  /**
   * Closes edit modal and clears editing state.
   */
  closeEdit(): void {
    this.editingDevice = null;
    this.editingCamera = null;
    this.cdr.markForCheck();
  }

  /**
   * Saves edited device data via API call.
   * For camera devices, updates device and camera sequentially.
   * For sensor devices, updates device only.
   * Refreshes device list and displays toast notification on success.
   */
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
    const saveOp$: Observable<unknown> = this.editingCamera
      ? this.deviceService.update(devicePayload).pipe(
          switchMap(() => {
            const cameraPayload: Camera = {
              id: this.editingCamera!.id,
              device: {
                id: this.editingDevice!.id,
                name,
                type: this.editingDevice!.type,
                state,
                location: {
                  ...devicePayload.location,
                  description: devicePayload.location.description ?? null,
                },
              },
              streamType: streamType as StreamType,
              source,
            };
            return this.cameraService.update(cameraPayload);
          }),
        )
      : this.deviceService.update(devicePayload);

    saveOp$.subscribe({
      next: () => {
        this.toastService.success(
          `El dispositivo "${deviceName}" ha sido actualizado.`,
          'Dispositivo actualizado',
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

  /**
   * Opens delete confirmation modal for selected device.
   * @param {DeviceStatusInfo} device - Device to delete
   */
  openDelete(device: DeviceStatusInfo): void {
    this.deleteTarget = device;
    this.deleteSaving = false;
    this.cdr.markForCheck();
  }

  /**
   * Closes delete confirmation modal.
   */
  closeDelete(): void {
    this.deleteTarget = null;
    this.cdr.markForCheck();
  }

  /**
   * Confirms and executes device deletion via API call.
   * For camera devices, deletes camera record then device.
   * For sensor devices, deletes sensor record then device.
   * Refreshes device list and displays toast notification on success.
   */
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
          switchMap(() => this.deviceService.delete(deviceId)),
        )
      : this.sensorService.getSensorByDeviceId(deviceId).pipe(
          switchMap((sensor) => this.sensorService.delete(sensor.id)),
          switchMap(() => this.deviceService.delete(deviceId)),
        );

    deleteOp$.subscribe({
      next: () => {
        this.toastService.success(
          `El dispositivo "${name}" ha sido eliminado.`,
          'Dispositivo eliminado',
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

  /**
   * Returns Tailwind CSS classes for status badge background and text color.
   * Maps device state enum to visual styling.
   * @param {string} status - Device status value
   * @returns {string} Tailwind CSS class string
   */
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

  /**
   * Returns icon character (filled or hollow circle) for status badge.
   * @param {string} status - Device status value
   * @returns {string} Icon character
   */
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

  /**
   * Returns localized display text for status value.
   * @param {string} status - Device status value
   * @returns {string} Localized status text
   */
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

  /**
   * Returns localized display text for device type.
   * @param {string} type - Device type value
   * @returns {string} Localized device type text
   */
  getDeviceTypeText(type: string): string {
    const texts: Record<string, string> = {
      SENSOR: 'Sensor',
      CAMERA: 'Cámara',
      THERMAL: 'Térmico',
    };
    return texts[type] || type;
  }
}
