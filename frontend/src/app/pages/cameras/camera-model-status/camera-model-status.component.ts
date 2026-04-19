import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, of, BehaviorSubject, combineLatest } from 'rxjs';
import { map, catchError, shareReplay, tap, switchMap, timeout } from 'rxjs/operators';
import { CameraModelStatusComponent as CameraModelStatusSharedComponent } from '../../../shared/components/cameras/camera-model-status/camera-model-status.component';
import { CameraStatusCardsComponent, CameraStats } from '../../../shared/components/cameras/camera-status-cards/camera-status-cards.component';
import { CameraFiltersTableComponent } from '../../../shared/components/cameras/camera-filters-table/camera-filters-table.component';
import { CameraService } from '../../../core/services/camera.service';
import { VehicleDetectedService } from '../../../core/services/vehicle-detected.service';
import { ApiService } from '../../../core/services/api.service';

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
  imports: [CommonModule, CameraModelStatusSharedComponent, CameraFiltersTableComponent],
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
   * Observable que emite la fecha/hora de la última detección (desde VehicleDetectedService.getLastRecord)
   */
  lastVehicleDetection$!: Observable<Date | null>;

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
    private apiService: ApiService,
    private changeDetectorRef: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.initializeCameraStats();
    this.initializeModelInfo();
    this.initializeLastVehicleDetection();
    // Disparar carga inicial
    this.refreshTrigger$.next();
  }

  private initializeLastVehicleDetection(): void {
    this.lastVehicleDetection$ = this.refreshTrigger$.pipe(
      switchMap(() =>
        this.vehicleService.getLastRecord().pipe(
          map((v) => {
            try {
              return v && v.timestamp ? new Date(v.timestamp) : null;
            } catch {
              return null;
            }
          }),
          catchError(() => of(null))
        )
      ),
      shareReplay(1)
    );
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
          catchError(() => {
            this.changeDetectorRef.markForCheck();
            return of(this.defaultCameraStats);
          })
        )
      ),
      shareReplay(1)
    );
  }

  /**
   * Inicializa la información del modelo verificando si el servidor de detección está activo
   * Usa el endpoint del backend Java que verifica Python
   * El backend siempre retorna 200 OK con estado en el JSON body
   */
  private initializeModelInfo(): void {
    this.modelInfo$ = this.refreshTrigger$.pipe(
      tap(() => {
        this.changeDetectorRef.markForCheck();
      }),
      switchMap(() =>
        // Llamar al endpoint del backend - siempre retorna 200 OK
        this.apiService.get<{ status: string; service: string }>('/streams/health/detection-service').pipe(
          timeout(5000),
          map((response) => {
            const isRunning = response.status === 'HEALTHY';
            return {
              isRunning,
              streamType: isRunning
                ? 'Vehicle Detection Service (Activo)'
                : 'Vehicle Detection Service (Detenido)',
              detectionCount: isRunning ? 1 : 0,
              lastUpdate: new Date(),
            };
          }),
          catchError(() => {
            return of({
              isRunning: false,
              streamType: 'Vehicle Detection Service (Detenido)',
              detectionCount: 0,
              lastUpdate: new Date(),
            });
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

    // Simular un delay de reinicio
    setTimeout(() => {
      this.refreshTrigger$.next();
      this.isRestarting = false;
      this.changeDetectorRef.markForCheck();
    }, 2000);
  }
}
