import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';

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
  imports: [CommonModule],
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

  /**
   * Emits restart model event to parent component.
   */
  onRestartModel(): void {
    this.restartModelClicked.emit();
  }
}
