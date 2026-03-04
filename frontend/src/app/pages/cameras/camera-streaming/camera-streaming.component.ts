import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CameraStreamingComponent as CameraStreamingSharedComponent } from '../../../shared/components/cameras/camera-streaming/camera-streaming.component';
import { CameraFiltersComponent } from '../../../shared/components/cameras/camera-filters/camera-filters.component';
import { CameraDeviceTableComponent } from '../../../shared/components/cameras/camera-device-table/camera-device-table.component';

/**
 * CameraStreamingComponent
 *
 * Contenedor que orquesta la visualización del componente de streaming de cámaras
 * con sus componentes relacionados (filtros, tabla de dispositivos).
 *
 * @selector app-camera-streaming
 * @standalone true
 */
@Component({
  selector: 'app-camera-streaming',
  standalone: true,
  imports: [CommonModule, CameraStreamingSharedComponent, CameraFiltersComponent, CameraDeviceTableComponent],
  templateUrl: './camera-streaming.component.html',
})
export class CameraStreamingComponent {
  onFiltersChanged(filters: any): void {
    console.log('Filtros aplicados:', filters);
    // Aquí se puede conectar con el backend para filtrar cámaras
  }
}
