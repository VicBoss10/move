import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, tap, catchError, shareReplay } from 'rxjs/operators';
import { of } from 'rxjs';
import { CameraStatusCardsComponent, CameraStats } from '../../../shared/components/cameras/camera-status-cards/camera-status-cards.component';
import { CameraDeviceTableComponent } from '../../../shared/components/cameras/camera-device-table/camera-device-table.component';
import { CameraFiltersComponent } from '../../../shared/components/cameras/camera-filters/camera-filters.component';
import { CameraService } from '../../../core/services/camera.service';

interface ModelInfo {
  version: string;
  accuracy: number;
  lastUpdate: string;
  detectionFramework: string;
  processingTime: string;
  memoryUsage: string;
}

/**
 * CameraModelStatusComponent
 *
 * Página que muestra el estado del modelo de detección de vehículos
 * y estadísticas de funcionamiento de las cámaras.
 *
 * Características:
 * - Tarjetas de estado de cámaras (datos dinámicos)
 * - Tabla de dispositivos con sus estados (datos dinámicos)
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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CameraModelStatusComponent {
  isLoading$ = new BehaviorSubject<boolean>(false);

  cameraStats$: Observable<CameraStats>;
  modelInfo$: Observable<ModelInfo>;

  constructor(private cameraService: CameraService) {
    this.cameraStats$ = this.cameraService.getAll().pipe(
      map((cameras) => ({
        totalCameras: cameras.length,
        activeCameras: cameras.filter((c) => c.device.state === 'ACTIVE').length,
        inactiveCameras: cameras.filter((c) => c.device.state === 'INACTIVE').length,
        failingCameras: cameras.filter((c) => c.device.state === 'FAILING').length,
        vehiclesDetected: 0, // Este valor sería dinámico de un endpoint si existe
        uptime: 98.5, // Este valor sería dinámico de un endpoint si existe
      })),
      tap(() => this.isLoading$.next(false)),
      catchError((error) => {
        console.error('Error loading camera stats:', error);
        return of({
          totalCameras: 0,
          activeCameras: 0,
          inactiveCameras: 0,
          failingCameras: 0,
          vehiclesDetected: 0,
          uptime: 0,
        });
      }),
      shareReplay(1)
    );

    this.modelInfo$ = of({
      version: '2.1.0',
      accuracy: 94.7,
      lastUpdate: new Date().toISOString().replace('T', ' ').substring(0, 19),
      detectionFramework: 'YOLOv8',
      processingTime: '45ms',
      memoryUsage: '2.4 GB',
    }).pipe(
      tap(() => this.isLoading$.next(false)),
      catchError((error) => {
        console.error('Error loading model info:', error);
        return of({
          version: 'N/A',
          accuracy: 0,
          lastUpdate: 'N/A',
          detectionFramework: 'N/A',
          processingTime: 'N/A',
          memoryUsage: 'N/A',
        });
      }),
      shareReplay(1)
    );

    this.isLoading$.next(true);
  }


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
