import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  OnInit,
  OnDestroy,
  Input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Observable, of, Subject, combineLatest } from 'rxjs';
import {
  catchError,
  shareReplay,
  switchMap,
  map,
  takeUntil,
  share,
  debounceTime,
  distinctUntilChanged,
  startWith,
} from 'rxjs/operators';
import { CameraService } from '../../../../core/services/camera.service';
import { DeviceService } from '../../../../core/services/device.service';
import { ApiService } from '../../../../core/services/api.service';
import { Camera } from '../../../../core/models/camera.model';
import { Device, DeviceState } from '../../../../core/models/device.model';

/**
 * CameraFiltersTableComponent
 *
 * Componente que combina búsqueda de dispositivos y tabla de cámaras.
 * Maneja la lógica de filtrado y control de detección.
 *
 * Características:
 * - Búsqueda por nombre de dispositivo
 * - Tabla responsiva con indicadores de estado
 * - Botones de control de detección (Iniciar/Detener) en cada fila
 * - Dark mode support
 * - OnPush change detection para mejor performance
 *
 * @selector app-camera-filters-table
 * @standalone true
 * @imports CommonModule, FormsModule
 * @example
 * <app-camera-filters-table />
 */
@Component({
  selector: 'app-camera-filters-table',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './camera-filters-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CameraFiltersTableComponent implements OnInit, OnDestroy {
  /**
   * Input: Observable que indica si el servicio está healthy/running
   */
  @Input() isServiceHealthy$: Observable<boolean> = of(false);

  /**
   * FormControl para búsqueda de dispositivo
   */
  searchControl = new FormControl('');

  /**
   * Observable de cámaras filtradas
   */
  cameras$: Observable<Camera[]>;

  /**
   * Subject para forzar refresco de la tabla
   */
  /** Subject para forzar refresco de la tabla (compartido en el servicio) */
  // Usamos el refresh$ de CameraService en lugar de un BehaviorSubject local

  /**
   * Subject para gestionar suscriptores
   */
  private destroy$ = new Subject<void>();

  /**
   * Mapa de estados de carga: cameraId -> isLoading
   */
  loadingStates: Map<number, boolean> = new Map();
  /** Último valor conocido del health del servicio */
  isServiceHealthyLatest = false;

  constructor(
    private cameraService: CameraService,
    private deviceService: DeviceService,
    private apiService: ApiService,
    private changeDetectorRef: ChangeDetectorRef,
  ) {
    // Tabla reactiva que filtra cuando el formControl cambia
    // Usar apiService directamente para evitar caché y permitir actualizaciones en tiempo real
    this.cameras$ = combineLatest([
      this.searchControl.valueChanges.pipe(
        debounceTime(300),
        distinctUntilChanged(),
        startWith(''),
      ),
      this.cameraService.refresh$,
    ]).pipe(
      switchMap(([searchTerm]) =>
        this.apiService.get<Camera[]>('/cameras').pipe(
          map((cameras: Camera[]) => this.filterCameras(cameras, searchTerm || '')),
          catchError((error) => {
            this.changeDetectorRef.markForCheck();
            return of([] as Camera[]);
          }),
        ),
      ),
      share(),
    );
  }

  ngOnInit(): void {
    // Suscribir health del servicio para usarlo en handlers y template
    this.isServiceHealthy$.pipe(takeUntil(this.destroy$)).subscribe((v) => {
      this.isServiceHealthyLatest = !!v;
      this.changeDetectorRef.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Aplica los filtros actuales
   */
  applyFilters(): void {
    // Ya no necesario, filtrado es automático con formControl
  }

  /**
   * Limpia todos los filtros a valores por defecto
   */
  clearFilters(): void {
    this.searchControl.setValue('');
    this.changeDetectorRef.markForCheck();
  }

  /**
   * Aplica filtros a los datos de cámaras
   */
  private filterCameras(cameras: Camera[], searchTerm: string): Camera[] {
    return cameras.filter((camera) => {
      // Filtrar por nombre de dispositivo
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        if (!camera.device.name.toLowerCase().includes(term)) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * Obtiene el color del badge según el estado
   */
  getStateColor(state: string): string {
    const stateColors: Record<string, string> = {
      ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      INACTIVE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      FAILING: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    };
    return stateColors[state] || stateColors['INACTIVE'];
  }

  /**
   * Obtiene la etiqueta traducida del estado
   */
  getStateLabel(state: string): string {
    const stateLabels: Record<string, string> = {
      ACTIVE: 'Activa',
      INACTIVE: 'Inactiva',
      FAILING: 'Fallando',
    };
    return stateLabels[state] || state;
  }

  /**
   * Obtiene el ícono para el estado
   */
  getStateIcon(state: string): string {
    const stateIcons: Record<string, string> = {
      ACTIVE: '🟢',
      INACTIVE: '🟡',
      FAILING: '🔴',
    };
    return stateIcons[state] || '⚪';
  }

  /**
   * Formatea las coordenadas para visualización
   */
  formatCoordinates(latitude: number, longitude: number): string {
    return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  }

  /**
   * Verifica si la detección está activa para una cámara específica
   * Usa device.state como fuente de verdad (persistente en BD)
   */
  isDetectionActive(deviceState: string): boolean {
    return deviceState === DeviceState.ACTIVE;
  }

  /**
   * Verifica si se está cargando para una cámara específica
   */
  isLoading(cameraId: number): boolean {
    return this.loadingStates.get(cameraId) || false;
  }

  /**
   * Inicia la detección para una cámara específica
   * Validaciones: servicio healthy y cámara no activa
   */
  startDetectionForCamera(camera: Camera): void {
    console.log('startDetectionForCamera called with camera:', camera);

    // Validar que el servicio esté healthy
    if (!this.isServiceHealthyLatest) {
      console.warn('Cannot start detection: Vehicle Detection Service is not running');
      this.changeDetectorRef.markForCheck();
      return;
    }

    // Validar que la cámara no esté ya activa
    if (camera.device.state === DeviceState.ACTIVE || this.isLoading(camera.id)) {
      console.warn('Camera already active or loading:', {
        cameraId: camera.id,
        deviceState: camera.device.state,
      });
      return;
    }

    this.loadingStates.set(camera.id, true);
    this.changeDetectorRef.markForCheck();

    const deviceUpdate: Partial<Device> = {
      id: camera.device.id,
      state: DeviceState.ACTIVE,
    };

    this.deviceService
      .update(deviceUpdate as Device)
      .pipe(
        switchMap(() => {
          console.log('Device updated, calling startStream with cameraId:', camera.id);
          return this.cameraService.startStream(camera.id);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (response) => {
          this.loadingStates.set(camera.id, false);
          console.log(`Device ${camera.id} activated and stream started`);
          this.cameraService.triggerRefresh();
          this.changeDetectorRef.markForCheck();
        },
        error: (error) => {
          console.error('Error starting detection for camera', camera.id, error);
          this.loadingStates.set(camera.id, false);
          const revertUpdate: Partial<Device> = {
            id: camera.device.id,
            state: DeviceState.INACTIVE,
          };
          this.deviceService
            .update(revertUpdate as Device)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              error: (revertError) => console.error('Error reverting device state:', revertError),
            });
          this.changeDetectorRef.markForCheck();
        },
      });
  }

  /**
   * Detiene la detección para una cámara específica
   */
  stopDetectionForCamera(camera: Camera): void {
    // Validar que la cámara esté activa
    if (camera.device.state !== DeviceState.ACTIVE || this.isLoading(camera.id)) {
      return;
    }

    this.loadingStates.set(camera.id, true);
    this.changeDetectorRef.markForCheck();
    // 1) Intentar obtener la sesión activa en el VDS y detenerla
    this.cameraService
      .getActiveStreamByDevice(camera.device.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          const sessionId = (res as any)?.sessionId;
          if (sessionId) {
            this.cameraService
              .stopStream(sessionId)
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: () => {
                  console.log(`Stopped session ${sessionId} for device ${camera.id}`);
                  // Luego actualizar el estado en la BD
                  const deviceUpdate: Partial<Device> = {
                    id: camera.device.id,
                    state: DeviceState.INACTIVE,
                  };
                  this.deviceService
                    .update(deviceUpdate as Device)
                    .pipe(takeUntil(this.destroy$))
                    .subscribe({
                      next: () => {
                        this.loadingStates.set(camera.id, false);
                        this.cameraService.triggerRefresh();
                        this.changeDetectorRef.markForCheck();
                      },
                      error: (err) => {
                        console.error(
                          'Error updating device state after stopping VDS session',
                          err,
                        );
                        this.loadingStates.set(camera.id, false);
                        this.changeDetectorRef.markForCheck();
                      },
                    });
                },
                error: (err) => {
                  console.error('Error stopping VDS session', err);
                  // Even if stop fails, update device state to INACTIVE to keep DB consistent
                  const deviceUpdate: Partial<Device> = {
                    id: camera.device.id,
                    state: DeviceState.INACTIVE,
                  };
                  this.deviceService
                    .update(deviceUpdate as Device)
                    .pipe(takeUntil(this.destroy$))
                    .subscribe({
                      next: () => {
                        this.loadingStates.set(camera.id, false);
                        this.cameraService.triggerRefresh();
                        this.changeDetectorRef.markForCheck();
                      },
                      error: (err2) => {
                        console.error('Error updating device state after failed stop', err2);
                        this.loadingStates.set(camera.id, false);
                        this.changeDetectorRef.markForCheck();
                      },
                    });
                },
              });
          } else {
            // No hay sesión activa: solo actualizar estado
            const deviceUpdate: Partial<Device> = {
              id: camera.device.id,
              state: DeviceState.INACTIVE,
            };
            this.deviceService
              .update(deviceUpdate as Device)
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: () => {
                  this.loadingStates.set(camera.id, false);
                  this.cameraService.triggerRefresh();
                  this.changeDetectorRef.markForCheck();
                },
                error: (err) => {
                  console.error('Error updating device state when no active session found', err);
                  this.loadingStates.set(camera.id, false);
                  this.changeDetectorRef.markForCheck();
                },
              });
          }
        },
        error: (err) => {
          // Error consultando VDS: intentar solo actualizar DB para evitar bloqueo del usuario
          console.warn('Error querying VDS for active session, updating device state anyway', err);
          const deviceUpdate: Partial<Device> = {
            id: camera.device.id,
            state: DeviceState.INACTIVE,
          };
          this.deviceService
            .update(deviceUpdate as Device)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: () => {
                this.loadingStates.set(camera.id, false);
                this.cameraService.triggerRefresh();
                this.changeDetectorRef.markForCheck();
              },
              error: (err2) => {
                console.error('Error updating device state after VDS query failure', err2);
                this.loadingStates.set(camera.id, false);
                this.changeDetectorRef.markForCheck();
              },
            });
        },
      });
  }
}
