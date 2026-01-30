import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CameraDeviceTableComponent } from '../../../shared/components/cameras/camera-device-table/camera-device-table.component';
import { CameraFiltersComponent } from '../../../shared/components/cameras/camera-filters/camera-filters.component';

/**
 * CameraStreamingComponent
 *
 * Página que muestra información del streaming de cámaras
 * y la lista de dispositivos disponibles.
 *
 * Características:
 * - Vista de transmisión en vivo (placeholder)
 * - Tabla de dispositivos de cámara
 * - Filtros para buscar cámaras específicas
 * - Indicadores de estado en tiempo real
 * - Panel de información del dispositivo
 *
 * @selector app-camera-streaming
 * @standalone true
 * @imports CommonModule, CameraDeviceTableComponent, CameraFiltersComponent
 * @returns Página de streaming de cámaras
 *
 * @example
 * <app-camera-streaming />
 */
@Component({
  selector: 'app-camera-streaming',
  standalone: true,
  imports: [CommonModule, CameraDeviceTableComponent, CameraFiltersComponent],
  templateUrl: './camera-streaming.component.html',
})
export class CameraStreamingComponent {
  /**
   * Número de cámara actualmente en streaming (1-5)
   * @type {number}
   */
  selectedCameraId: number = 1;

  /**
   * Obtiene el nombre de la cámara seleccionada
   * @returns {string} Nombre de la cámara
   */
  getSelectedCameraName(): string {
    const cameraNames: Record<number, string> = {
      1: 'Cámara Carrera 7',
      2: 'Cámara Parque Arvi',
      3: 'Cámara Centro Comercial',
      4: 'Cámara Terminal',
      5: 'Cámara Envigado',
    };
    return cameraNames[this.selectedCameraId] || 'Cámara No Seleccionada';
  }

  /**
   * Maneja el cambio de cámara seleccionada
   * @param {number} cameraId - ID de la cámara
   */
  selectCamera(cameraId: number): void {
    this.selectedCameraId = cameraId;
  }

  /**
   * Maneja cambios en los filtros
   * @param {any} filters - Filtros aplicados
   */
  onFiltersChanged(filters: any): void {
    console.log('Filtros aplicados:', filters);
    // Aquí se conectaría con el backend para filtrar cámaras
  }
}
