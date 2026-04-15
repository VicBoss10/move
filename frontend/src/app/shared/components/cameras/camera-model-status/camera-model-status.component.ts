import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';

interface ModelInfo {
  isRunning: boolean;
  streamType: string;
  detectionCount: number;
  lastUpdate: Date;
}

export interface CameraStats {
  totalCameras: number;
  activeCameras: number;
  inactiveCameras: number;
  failingCameras: number;
  vehiclesDetected: number;
  uptime: number;
}

/**
 * CameraModelStatusComponent (Shared/Presentational)
 *
 * Componente presentacional que muestra:
 * - Tarjetas de estado de cámaras
 * - Información del modelo de detección
 * - Botón para reiniciar el modelo
 *
 * NO realiza llamadas a servicios, solo presenta datos recibidos.
 *
 * @selector app-camera-model-status-content
 * @standalone true
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
   * Información del modelo (recibida del contenedor)
   */
  @Input() modelInfo$!: Observable<ModelInfo>;

  /**
   * Estadísticas de cámaras (recibida del contenedor)
   */
  @Input() cameraStats$!: Observable<CameraStats>;

  /**
   * Indica si se está reiniciando
   */
  @Input() isRestarting = false;

  /**
   * Evento emitido cuando se requiere reiniciar el modelo
   */
  @Output() restartModelClicked = new EventEmitter<void>();

  /**
   * Emite evento para reiniciar el modelo
   */
  onRestartModel(): void {
    this.restartModelClicked.emit();
  }
}
