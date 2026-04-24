import { Component } from '@angular/core';

import { CameraStreamingComponent as CameraStreamingSharedComponent } from '../../../shared/components/cameras/camera-streaming/camera-streaming.component';

/**
 * CameraStreamingComponent
 *
 * Contenedor que orquesta la visualización del componente de streaming de cámaras
 * con sus componentes relacionados.
 *
 * @selector app-camera-streaming
 * @standalone true
 */
@Component({
  selector: 'app-camera-streaming',
  standalone: true,
  imports: [CameraStreamingSharedComponent],
  templateUrl: './camera-streaming.component.html',
})
export class CameraStreamingComponent {}
