import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CameraModelStatusComponent as CameraModelStatusSharedComponent } from '../../../shared/components/cameras/camera-model-status/camera-model-status.component';
import { CameraFiltersComponent } from '../../../shared/components/cameras/camera-filters/camera-filters.component';
import { CameraDeviceTableComponent } from '../../../shared/components/cameras/camera-device-table/camera-device-table.component';

/**
 * CameraModelStatusComponent
 *
 * Contenedor que orquesta la visualización del componente de estado del modelo
 * con sus componentes relacionados (tarjetas, filtros, tabla de dispositivos).
 *
 * @selector app-camera-model-status
 * @standalone true
 */
@Component({
  selector: 'app-camera-model-status',
  standalone: true,
  imports: [CommonModule, CameraModelStatusSharedComponent, CameraFiltersComponent, CameraDeviceTableComponent],
  templateUrl: './camera-model-status.component.html',
})
export class CameraModelStatusComponent {
  onFiltersChanged(filters: any): void {
    console.log('Filtros aplicados:', filters);
    // Aquí se puede conectar con el backend para filtrar cámaras
  }
}
