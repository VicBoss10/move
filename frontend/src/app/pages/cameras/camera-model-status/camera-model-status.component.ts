import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CameraStatusCardsComponent, CameraStats } from '../../../shared/components/cameras/camera-status-cards/camera-status-cards.component';
import { CameraDeviceTableComponent } from '../../../shared/components/cameras/camera-device-table/camera-device-table.component';
import { CameraFiltersComponent } from '../../../shared/components/cameras/camera-filters/camera-filters.component';

/**
 * CameraModelStatusComponent
 *
 * Página que muestra el estado del modelo de detección de vehículos
 * y estadísticas de funcionamiento de las cámaras.
 *
 * Características:
 * - Tarjetas de estado de cámaras
 * - Tabla de dispositivos con sus estados
 * - Filtros para buscar cámaras
 * - Indicadores de salud del sistema
 * - Gráficos de rendimiento
 * - Alertas de dispositivos con fallo
 *
 * @selector app-camera-model-status
 * @standalone true
 * @imports CommonModule, CameraStatusCardsComponent, CameraDeviceTableComponent, CameraFiltersComponent
 * @returns Página de estado del modelo y cámaras
 *
 * @example
 * <app-camera-model-status />
 */
@Component({
  selector: 'app-camera-model-status',
  standalone: true,
  imports: [
    CommonModule,
    CameraStatusCardsComponent,
    CameraDeviceTableComponent,
    CameraFiltersComponent,
  ],
  templateUrl: './camera-model-status.component.html',
})
export class CameraModelStatusComponent {
  /**
   * Estadísticas del sistema de cámaras
   * En producción, esto vendría de un servicio
   * @type {CameraStats}
   */
  stats: CameraStats = {
    totalCameras: 12,
    activeCameras: 10,
    inactiveCameras: 1,
    failingCameras: 1,
    vehiclesDetected: 2847,
    uptime: 98.5,
  };

  /**
   * Información del modelo de detección
   * @type {object}
   */
  modelInfo = {
    version: '2.1.0',
    accuracy: 94.7,
    lastUpdate: '2026-01-28 10:30:00',
    detectionFramework: 'YOLOv8',
    processingTime: '45ms',
    memoryUsage: '2.4 GB',
  };

  /**
   * Maneja cambios en los filtros
   * @param {any} filters - Filtros aplicados
   */
  onFiltersChanged(filters: any): void {
    console.log('Filtros aplicados:', filters);
    // Aquí se conectaría con el backend para filtrar cámaras
  }

  /**
   * Reinicia el modelo de detección
   */
  restartModel(): void {
    console.log('Reiniciando modelo...');
    // Lógica para reiniciar el modelo
  }

  /**
   * Actualiza el modelo de detección
   */
  updateModel(): void {
    console.log('Actualizando modelo...');
    // Lógica para actualizar el modelo
  }

  /**
   * Exporta los logs del sistema
   */
  exportLogs(): void {
    console.log('Exportando logs...');
    // Lógica para exportar logs
  }
}
