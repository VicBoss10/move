import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, of, BehaviorSubject, Subject } from 'rxjs';
import {
  catchError,
  shareReplay,
  switchMap,
  map,
  takeUntil,
} from 'rxjs/operators';
import { CameraService } from '../../../../core/services/camera.service';
import { LocationService } from '../../../../core/services/location.service';
import { Camera } from '../../../../core/models/camera.model';

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
 *
 * Características:
 * - Filtro por estado (ACTIVE, INACTIVE, FAILING)
 * - Filtro por ubicación (dinámico del servicio)
 * - Tabla responsiva con indicadores de estado
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
   * Subject para gestionar suscriptores
   */
  private destroy$ = new Subject<void>();

  constructor(
    private cameraService: CameraService,
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

    // Tabla reactiva que filtra cuando los filtros cambian
    this.cameras$ = this.filters$.pipe(
      switchMap((currentFilters) =>
        this.cameraService.getAll().pipe(
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
      shareReplay(1)
    );
  }

  ngOnInit(): void {
    // Inicializar filtros al cargar
    this.filters$.next(this.filters);
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
}
