import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, of, BehaviorSubject, combineLatest } from 'rxjs';
import { map, catchError, shareReplay, tap, switchMap } from 'rxjs/operators';
import { CameraModelStatusComponent as CameraModelStatusSharedComponent } from '../../../shared/components/cameras/camera-model-status/camera-model-status.component';
import { CameraStatusCardsComponent, CameraStats } from '../../../shared/components/cameras/camera-status-cards/camera-status-cards.component';
import { CameraFiltersTableComponent } from '../../../shared/components/cameras/camera-filters-table/camera-filters-table.component';
import { CameraService } from '../../../core/services/camera.service';
import { VehicleDetectedService } from '../../../core/services/vehicle-detected.service';

interface ModelInfo {
  isRunning: boolean;
  streamType: string;
  detectionCount: number;
  lastUpdate: Date;
}

/**
 * CameraModelStatusComponent (Page/Container)
 *
 * Contenedor que orquesta:
 * - Llamadas a servicios (CameraService, VehicleDetectedService)
 * - Componentes presentacionales (CameraStatusCardsComponent, CameraModelStatusComponent, CameraFiltersTableComponent)
 * - Lógica de reinicio del modelo
 *
 * @selector app-camera-model-status
 * @standalone true
 */
@Component({
  selector: 'app-camera-model-status',
  standalone: true,
  imports: [CommonModule, CameraModelStatusSharedComponent, CameraStatusCardsComponent, CameraFiltersTableComponent],
  templateUrl: './camera-model-status.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CameraModelStatusComponent implements OnInit {
  /**
   * Observable que emite las estadísticas de cámaras
   */
  cameraStats$!: Observable<CameraStats>;

  /**
   * Observable que emite información del modelo de detección
   */
  modelInfo$!: Observable<ModelInfo>;

  /**
   * Subject para forzar recarga de datos
   */
  private refreshTrigger$ = new BehaviorSubject<void>(undefined);

  /**
   * Indica si el modelo se está reiniciando
   */
  isRestarting = false;

  /**
   * Estadísticas por defecto cuando no hay datos
   */
  private readonly defaultCameraStats: CameraStats = {
    totalCameras: 0,
    activeCameras: 0,
    inactiveCameras: 0,
    failingCameras: 0,
    vehiclesDetected: 0,
    uptime: 0,
  };

  /**
   * Información del modelo por defecto
   */
  private readonly defaultModelInfo: ModelInfo = {
    isRunning: false,
    streamType: 'N/A',
    detectionCount: 0,
    lastUpdate: new Date(),
  };

  constructor(
    private cameraService: CameraService,
    private vehicleService: VehicleDetectedService,
    private changeDetectorRef: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.initializeCameraStats();
    this.initializeModelInfo();
    // Disparar carga inicial
    this.refreshTrigger$.next();
  }

  /**
   * Inicializa las estadísticas de cámaras desde el servicio
   */
  private initializeCameraStats(): void {
    this.cameraStats$ = this.refreshTrigger$.pipe(
      tap(() => this.changeDetectorRef.markForCheck()),
      switchMap(() =>
        combineLatest([
          this.cameraService.getAll(),
          this.vehicleService.getAll(),
        ]).pipe(
          map(([cameras, vehicles]) => ({
            totalCameras: cameras.length,
            activeCameras: cameras.filter((c) => c.device.state === 'ACTIVE').length,
            inactiveCameras: cameras.filter((c) => c.device.state === 'INACTIVE').length,
            failingCameras: cameras.filter((c) => c.device.state === 'FAILING').length,
            vehiclesDetected: vehicles.length,
            uptime: 98.5,
          })),
          catchError((error) => {
            console.error('Error loading camera stats:', error);
            this.changeDetectorRef.markForCheck();
            return of(this.defaultCameraStats);
          })
        )
      ),
      shareReplay(1)
    );
  }

  /**
   * Inicializa la información del modelo desde el backend
   */
  private initializeModelInfo(): void {
    this.modelInfo$ = this.refreshTrigger$.pipe(
      tap(() => this.changeDetectorRef.markForCheck()),
      switchMap(() =>
        this.cameraService.getAll().pipe(
          map((cameras) => {
            const activeCameras = cameras.filter((c) => c.device.state === 'ACTIVE').length;
            const totalCameras = cameras.length;

            return {
              isRunning: activeCameras > 0,
              streamType:
                activeCameras > 0
                  ? `${activeCameras}/${totalCameras} cámaras activas`
                  : 'Sin cámaras activas',
              detectionCount: activeCameras,
              lastUpdate: new Date(),
            };
          }),
          catchError((error) => {
            console.error('Error loading model info:', error);
            this.changeDetectorRef.markForCheck();
            return of(this.defaultModelInfo);
          })
        )
      ),
      shareReplay(1)
    );
  }

  /**
   * Maneja click en botón de reinicio
   */
  onRestartModel(): void {
    this.isRestarting = true;
    this.changeDetectorRef.markForCheck();

    console.log('Reiniciando modelo y recargando datos...');

    // Simular un delay de reinicio
    setTimeout(() => {
      this.refreshTrigger$.next();
      this.isRestarting = false;
      this.changeDetectorRef.markForCheck();
    }, 2000);
  }
}
