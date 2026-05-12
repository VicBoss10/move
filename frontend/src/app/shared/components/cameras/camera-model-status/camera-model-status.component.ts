import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { CameraService } from '../../../../core/services/camera.service';
import { ToastService } from '../../../../core/services/toast.service';
import { DeviceService } from '../../../../core/services/device.service';
import { ModalComponent } from '../../ui/modal/modal.component';

/**
 * Vehicle detection model information and status.
 * @interface ModelInfo
 * @property {boolean} isRunning - Model execution status
 * @property {string} streamType - Detection framework/model name
 * @property {number} detectionCount - Total detections performed
 * @property {Date} lastUpdate - Last model update timestamp
 */
interface ModelInfo {
  isRunning: boolean;
  streamType: string;
  detectionCount: number;
  lastUpdate: Date;
}

/**
 * Camera deployment statistics and health metrics.
 * @interface CameraStats
 * @property {number} totalCameras - Total installed camera devices
 * @property {number} activeCameras - Currently active cameras with detection enabled
 * @property {number} inactiveCameras - Inactive cameras without detection
 * @property {number} failingCameras - Cameras with errors or failures
 * @property {number} vehiclesDetected - Total vehicle detection count
 * @property {number} uptime - System uptime percentage
 */
export interface CameraStats {
  totalCameras: number;
  activeCameras: number;
  inactiveCameras: number;
  failingCameras: number;
  vehiclesDetected: number;
  uptime: number;
}

/**
 * CameraModelStatusComponent (Presentational Component)
 *
 * Displays vehicle detection model status and camera statistics.
 * Receives data via input observables from parent smart component.
 *
 * Features:
 * - Model execution status and framework information
 * - Active camera count and detection statistics
 * - Last vehicle detection timestamp
 * - Workflow guide for system usage
 * - Model restart event emission
 * - Dark mode support
 * - OnPush change detection
 *
 * No service calls; purely presentational.
 *
 * @selector app-camera-model-status-content
 * @standalone true
 * @imports CommonModule
 * @example
 * <app-camera-model-status-content
 *   [modelInfo$]="modelInfo$"
 *   [cameraStats$]="cameraStats$"
 *   [isRestarting]="isRestarting"
 *   (restartModelClicked)="onRestartModel()"
 * />
 */
@Component({
  selector: 'app-camera-model-status-content',
  standalone: true,
  imports: [CommonModule, ModalComponent],
  templateUrl: './camera-model-status.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CameraModelStatusComponent {
  /**
   * Observable emitting vehicle detection model information.
   * @type {Observable<ModelInfo>}
   */
  @Input() modelInfo$!: Observable<ModelInfo>;

  /**
   * Observable emitting camera deployment statistics.
   * @type {Observable<CameraStats>}
   */
  @Input() cameraStats$!: Observable<CameraStats>;

  /**
   * Flag indicating model restart operation in progress.
   * @type {boolean}
   */
  @Input() isRestarting = false;

  /**
   * Event emitted when restart model action is triggered.
   * @type {EventEmitter<void>}
   */
  @Output() restartModelClicked = new EventEmitter<void>();

  /**
   * Observable emitting timestamp of last vehicle detection.
   * Falls back to modelInfo$.lastUpdate if not provided.
   * @type {Observable<Date | null> | undefined}
   */
  @Input() lastVehicleDetection$?: Observable<Date | null>;

  showClearSessionsModal = false;
  isCleaningSessionsLatest = false;
  private activeCameras: any[] = [];

  constructor(
    private cameraService: CameraService,
    private toastService: ToastService,
    private deviceService: DeviceService,
    private changeDetectorRef: ChangeDetectorRef,
  ) {}

  /**
   * Emits restart model event to parent component.
   */
  onRestartModel(): void {
    this.restartModelClicked.emit();
  }

  /**
   * Opens the clear sessions confirmation modal.
   */
  openClearSessionsModal(): void {
    this.showClearSessionsModal = true;
    this.changeDetectorRef.markForCheck();
  }

  /**
   * Closes the clear sessions confirmation modal.
   */
  closeClearSessionsModal(): void {
    this.showClearSessionsModal = false;
    this.changeDetectorRef.markForCheck();
  }

  /**
   * Clears all active streaming sessions from the database.
   * First stops all active streams, then clears sessions from DB,
   * and updates all active devices to INACTIVE state.
   */
  confirmClearSessions(): void {
    this.isCleaningSessionsLatest = true;
    this.changeDetectorRef.markForCheck();

    this.cameraService
      .getAll()
      .pipe(
        switchMap((cameras: any[]) => {
          this.activeCameras = cameras.filter((c) => c.device.state === 'ACTIVE');
          const stopObservables: Observable<any>[] = [];

          for (const camera of this.activeCameras) {
            stopObservables.push(
              this.cameraService
                .getActiveStreamByDevice(camera.device.id)
                .pipe(
                  switchMap((stream) => {
                    if (stream.sessionId) {
                      return this.cameraService.stopStream(stream.sessionId);
                    }
                    return of(null);
                  }),
                  catchError(() => of(null)),
                )
            );
          }

          if (stopObservables.length > 0) {
            return forkJoin(stopObservables);
          }
          return of(null);
        }),
        switchMap(() => this.cameraService.clearAllSessions()),
        switchMap(() => {
          const deviceUpdates: Observable<any>[] = [];
          for (const camera of this.activeCameras) {
            const update = { id: camera.device.id, state: 'INACTIVE' };
            deviceUpdates.push(this.deviceService.update(update as any));
          }
          if (deviceUpdates.length > 0) {
            return forkJoin(deviceUpdates);
          }
          return of(null);
        }),
        catchError((err: any) => {
          console.error('Error during session cleanup:', err);
          return of(null);
        }),
      )
      .subscribe({
        next: () => {
          this.toastService.success(
            'Todas las sesiones de streaming han sido limpiadas',
            'Sesiones eliminadas',
          );
          this.showClearSessionsModal = false;
          this.isCleaningSessionsLatest = false;
          this.changeDetectorRef.markForCheck();
          this.cameraService.triggerRefresh();
        },
        error: (err: any) => {
          console.error('Error clearing sessions:', err);
          this.toastService.error(
            'Error al limpiar las sesiones. Por favor, inténtalo de nuevo.',
            'Error',
          );
          this.isCleaningSessionsLatest = false;
          this.changeDetectorRef.markForCheck();
        },
      });
  }
}
