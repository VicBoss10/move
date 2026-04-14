import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, of, BehaviorSubject, Subject, combineLatest } from 'rxjs';
import {
  catchError,
  shareReplay,
  switchMap,
  map,
  takeUntil,
  share,
} from 'rxjs/operators';
import { CameraService } from '../../../../core/services/camera.service';
import { DeviceService } from '../../../../core/services/device.service';
import { ApiService } from '../../../../core/services/api.service';
import { LocationService } from '../../../../core/services/location.service';
import { Camera } from '../../../../core/models/camera.model';
import { Device, DeviceState } from '../../../../core/models/device.model';

/**
 * Interfaz para filtros de cámara
 */
export interface CameraFilters {
  state: string;
  location: number;
}

/**
 * Interfaz para ubicación de cámara
 */
export interface Location {
  id: number;
  latitude: number;
  longitude: number;
  description: string;
}

/**
 * Interfaz para opciones de estado
 */
export interface StateOption {
  value: string;
  label: string;
}

/**
 * Interfaz para opción de ubicación
 */
export interface LocationOption {
  id: number;
  name: string;
}

/**
 * CameraFiltersTableComponent
 *
 * Componente unificado que combina filtros y tabla de dispositivos de cámara.
 * Maneja toda la lógica de filtrado internamente de forma reactiva.
 * También maneja el control de inicio/parada de detección para cada cámara.
 *
 * Características:
 * - Filtro por estado (ACTIVE, INACTIVE, FAILING)
 * - Filtro por ubicación (dinámico del servicio)
 * - Tabla responsiva con indicadores de estado
 * - Botones de control de detección (Iniciar/Detener) en cada fila
 * - Reactividad interna con RxJS BehaviorSubject + switchMap
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
  imports: [CommonModule, FormsModule],
  templateUrl: './camera-filters-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CameraFiltersTableComponent implements OnInit, OnDestroy {
  /**
   * Modelo de filtros
   */
  filters: CameraFilters = {
    state: '',
    location: 0,
  };

  /**
   * Opciones de estados disponibles
   */
  states: StateOption[] = [
    { value: '', label: 'Todos los estados' },
    { value: 'ACTIVE', label: 'Activa' },
    { value: 'INACTIVE', label: 'Inactiva' },
    { value: 'FAILING', label: 'Fallando' },
  ];

  /**
   * Observable de opciones de ubicaciones disponibles
   */
  locations$: Observable<LocationOption[]>;

  /**
   * Observable de cámaras filtradas
   */
  cameras$: Observable<Camera[]>;

  /**
   * Subject para disparar cambios en filtros
   */
  private filters$ = new BehaviorSubject<CameraFilters>(this.filters);

  /**
   * Subject para forzar refresco de la tabla (cuando cambia el estado de las cámaras)
   */
  private refreshTrigger$ = new BehaviorSubject<void>(undefined);

  /**
   * Subject para gestionar suscriptores
   */
  private destroy$ = new Subject<void>();

  /**
   * Mapa de detecciones activas: cameraId -> sessionId
   */
  activeDetections: Map<number, string> = new Map();

  /**
   * Mapa de estados de carga: cameraId -> isLoading
   */
  loadingStates: Map<number, boolean> = new Map();

  constructor(
    private cameraService: CameraService,
    private deviceService: DeviceService,
    private apiService: ApiService,
    private locationService: LocationService,
    private changeDetectorRef: ChangeDetectorRef
  ) {
    // Cargar ubicaciones
    this.locations$ = this.locationService.getAll().pipe(
      map((locations) => [
        { id: 0, name: 'Todas las ubicaciones' },
        ...locations.map((loc) => ({
          id: loc.id,
          name: loc.description || `Ubicación ${loc.id}`,
        })),
      ]),
      catchError((error) => {
        console.error('Error loading locations:', error);
        this.changeDetectorRef.markForCheck();
        return of([{ id: 0, name: 'Todas las ubicaciones' }]);
      }),
      shareReplay(1)
    );

    // Tabla reactiva que filtra cuando los filtros cambian o se dispara un refresh
    // Usar apiService directamente para evitar caché y permitir actualizaciones en tiempo real
    this.cameras$ = combineLatest([this.filters$, this.refreshTrigger$]).pipe(
      switchMap(([currentFilters]) =>
        this.apiService.get<Camera[]>('/cameras').pipe(
          map((cameras: Camera[]) =>
            this.filterCameras(cameras, currentFilters)
          ),
          catchError((error) => {
            console.error('Error loading cameras:', error);
            this.changeDetectorRef.markForCheck();
            return of([] as Camera[]);
          })
        )
      ),
      share()
    );
  }

  ngOnInit(): void {
    // Inicializar filtros al cargar
    this.filters$.next(this.filters);

    // Cargar sesiones activas del localStorage al inicializar
    this.loadActiveSessionsFromStorage();
  }

  /**
   * Carga todas las sesiones activas del localStorage y las valida con el backend
   */
  private loadActiveSessionsFromStorage(): void {
    // Buscar todas las claves que empiezan con vds_session_
    const keys = Object.keys(localStorage);
    const sessionKeys = keys.filter(key => key.startsWith('vds_session_'));

    if (sessionKeys.length === 0) {
      return; // No hay sesiones guardadas
    }

    // Validar cada sesión con el backend
    sessionKeys.forEach(key => {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return;

        const session = JSON.parse(raw);
        const cameraId = parseInt(key.replace('vds_session_', ''), 10);

        if (!session.sessionId) return;

        // Verificar si la sesión sigue activa en el backend
        this.cameraService.getStreamStatus(session.sessionId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (status) => {
              if (status.status === 'active') {
                // La sesión está activa, agregarla al mapa
                this.activeDetections.set(cameraId, session.sessionId);
              } else {
                // La sesión expiró, limpiarla
                this.clearSession(cameraId);
              }
              this.changeDetectorRef.markForCheck();
            },
            error: () => {
              // No se pudo validar, asumir que expiró
              this.clearSession(cameraId);
              this.changeDetectorRef.markForCheck();
            }
          });
      } catch (error) {
        console.error('Error loading session from storage:', error);
      }
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
    this.filters$.next(this.filters);
    this.changeDetectorRef.markForCheck();
  }

  /**
   * Limpia todos los filtros a valores por defecto
   */
  clearFilters(): void {
    this.filters = {
      state: '',
      location: 0,
    };
    this.changeDetectorRef.markForCheck();
    this.applyFilters();
  }

  /**
   * Aplica filtros a los datos de cámaras
   */
  private filterCameras(
    cameras: Camera[],
    filters: CameraFilters
  ): Camera[] {
    return cameras.filter((camera) => {
      // Filtrar por estado
      if (filters.state && camera.device.state !== filters.state) {
        return false;
      }

      // Filtrar por ubicación
      if (filters.location && camera.device.location.id !== filters.location) {
        return false;
      }

      return true;
    });
  }

  /**
   * Obtiene el color del badge según el estado
   */
  getStateColor(state: string): string {
    const stateColors: Record<string, string> = {
      ACTIVE:
        'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      INACTIVE:
        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
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
   */
  isDetectionActive(cameraId: number): boolean {
    return this.activeDetections.has(cameraId);
  }

  /**
   * Verifica si se está cargando para una cámara específica
   */
  isLoading(cameraId: number): boolean {
    return this.loadingStates.get(cameraId) || false;
  }

  /**
   * Inicia la detección para una cámara específica
   */
  startDetectionForCamera(camera: Camera): void {
    if (this.isDetectionActive(camera.id) || this.isLoading(camera.id)) {
      return;
    }

    this.loadingStates.set(camera.id, true);
    this.changeDetectorRef.markForCheck();

    // Primero actualizar estado a ACTIVE en el backend
    const deviceUpdate: Partial<Device> = {
      id: camera.device.id,
      state: DeviceState.ACTIVE,
    };

    this.deviceService.update(deviceUpdate as Device)
      .pipe(
        switchMap(() => {
          // Después de actualizar el estado, iniciar el stream
          return this.cameraService.startStream(camera.id);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (response) => {
          this.activeDetections.set(camera.id, response.sessionId);
          this.loadingStates.set(camera.id, false);
          this.saveSession(camera.id, response.sessionId, response.streamUrl);
          console.log(`Device ${camera.id} activated and stream started`);
          // Refrescar la tabla para actualizar el estado en tiempo real
          this.refreshTrigger$.next();
          this.changeDetectorRef.markForCheck();
        },
        error: (error) => {
          console.error('Error starting detection for camera', camera.id, error);
          this.loadingStates.set(camera.id, false);
          // Intentar revertir el estado a INACTIVE si falló
          const revertUpdate: Partial<Device> = {
            id: camera.device.id,
            state: DeviceState.INACTIVE,
          };
          this.deviceService.update(revertUpdate as Device)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              error: (revertError) => console.error('Error reverting device state:', revertError)
            });
          this.changeDetectorRef.markForCheck();
        }
      });
  }

  /**
   * Detiene la detección para una cámara específica
   */
  stopDetectionForCamera(cameraId: number): void {
    const sessionId = this.activeDetections.get(cameraId);
    if (!sessionId) {
      return;
    }

    this.loadingStates.set(cameraId, true);
    this.changeDetectorRef.markForCheck();

    this.cameraService.stopStream(sessionId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.activeDetections.delete(cameraId);
          this.loadingStates.set(cameraId, false);
          this.clearSession(cameraId);

          // Actualizar estado del dispositivo a INACTIVE
          this.cameraService.getAll()
            .pipe(
              map(cameras => cameras.find(c => c.id === cameraId)),
              takeUntil(this.destroy$)
            )
            .subscribe({
              next: (camera) => {
                if (camera) {
                  const deviceUpdate: Partial<Device> = {
                    id: camera.device.id,
                    state: DeviceState.INACTIVE,
                  };
                  this.deviceService.update(deviceUpdate as Device)
                    .pipe(takeUntil(this.destroy$))
                    .subscribe({
                      next: () => {
                        console.log(`Device ${cameraId} updated to INACTIVE`);
                        // Refrescar la tabla para actualizar el estado en tiempo real
                        this.refreshTrigger$.next();
                        this.changeDetectorRef.markForCheck();
                      },
                      error: (error) => {
                        console.error(`Error updating device ${cameraId} state:`, error);
                        this.changeDetectorRef.markForCheck();
                      }
                    });
                }
              },
              error: (error) => {
                console.error(`Error fetching camera ${cameraId}:`, error);
                this.changeDetectorRef.markForCheck();
              }
            });
        },
        error: (error) => {
          console.error('Error stopping detection for camera', cameraId, error);
          // Limpiar estado local aunque falle la petición
          this.activeDetections.delete(cameraId);
          this.loadingStates.set(cameraId, false);
          this.clearSession(cameraId);
          this.changeDetectorRef.markForCheck();
        }
      });
  }

  /**
   * Obtiene la sesión almacenada para una cámara
   */
  private loadSession(cameraId: number): { sessionId: string; streamUrl: string } | null {
    try {
      const raw = localStorage.getItem(this.getStorageKey(cameraId));
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  /**
   * Guarda la sesión en localStorage
   */
  private saveSession(cameraId: number, sessionId: string, streamUrl: string): void {
    try {
      localStorage.setItem(this.getStorageKey(cameraId), JSON.stringify({ sessionId, streamUrl }));
    } catch { /* Storage puede no estar disponible */ }
  }

  /**
   * Limpia la sesión del localStorage
   */
  private clearSession(cameraId: number): void {
    try {
      localStorage.removeItem(this.getStorageKey(cameraId));
    } catch { /* ignorar */ }
  }

  /**
   * Obtiene la clave de almacenamiento para una cámara
   */
  private getStorageKey(cameraId: number): string {
    return `vds_session_${cameraId}`;
  }
}
