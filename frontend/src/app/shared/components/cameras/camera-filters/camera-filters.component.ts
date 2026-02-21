import { Component, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { map, catchError, shareReplay } from 'rxjs/operators';
import { of } from 'rxjs';
import { CameraService } from '../../../../core/services/camera.service';
import { LocationService } from '../../../../core/services/location.service';

/**
 * Interfaz para filtros de cámara
 * @interface CameraFilters
 * @property {string} state - Estado a filtrar (ACTIVE, INACTIVE, FAILING)
 * @property {number} location - ID de ubicación a filtrar
 * @property {Date} startDate - Fecha de inicio
 * @property {Date} endDate - Fecha de fin
 */
export interface CameraFilters {
  state: string;
  location: number;
  startDate: Date;
  endDate: Date;
}

/**
 * Interfaz para opciones de estado
 * @interface StateOption
 * @property {string} value - Valor del estado
 * @property {string} label - Etiqueta en español
 */
export interface StateOption {
  value: string;
  label: string;
}

/**
 * Interfaz para opción de ubicación
 * @interface LocationOption
 * @property {number} id - ID único
 * @property {string} name - Nombre de ubicación
 */
export interface LocationOption {
  id: number;
  name: string;
}

/**
 * CameraFiltersComponent
 *
 * Componente que proporciona filtros para dispositivos de cámara.
 * Permite filtrar por estado, ubicación y rango de fechas.
 *
 * Características:
 * - Filtro por estado de cámara (local, no cambia)
 * - Filtro por ubicación (dinámico del servicio)
 * - Rango de fechas personalizado
 * - Botones para limpiar y aplicar filtros
 * - Responsive grid layout
 * - Dark mode support
 * - OnPush change detection para mejor performance
 *
 * @selector app-camera-filters
 * @standalone true
 * @imports CommonModule, FormsModule
 * @returns Formulario de filtros
 *
 * @example
 * <app-camera-filters (filtersChanged)="onFiltersChanged($event)" />
 */
@Component({
  selector: 'app-camera-filters',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './camera-filters.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CameraFiltersComponent {
  /**
   * Modelo de filtros
   * @type {CameraFilters}
   */
  filters: CameraFilters = {
    state: '',
    location: 0,
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)),
    endDate: new Date(),
  };

  /**
   * Opciones de estados disponibles (constantes, no cambian)
   * @type {StateOption[]}
   */
  states: StateOption[] = [
    { value: '', label: 'Todos los estados' },
    { value: 'ACTIVE', label: 'Activa' },
    { value: 'INACTIVE', label: 'Inactiva' },
    { value: 'FAILING', label: 'Fallando' },
  ];

  /**
   * Observable de opciones de ubicaciones disponibles
   * Cargadas dinámicamente del servicio LocationService
   * @type {Observable<LocationOption[]>}
   */
  locations$: Observable<LocationOption[]>;

  /**
   * Evento que emite cuando los filtros cambian
   * @type {EventEmitter<CameraFilters>}
   */
  @Output() filtersChanged = new EventEmitter<CameraFilters>();

  constructor(private locationService: LocationService) {
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
        return of([{ id: 0, name: 'Todas las ubicaciones' }]);
      }),
      shareReplay(1)
    );
  }

  /**
   * Aplica los filtros actuales
   */
  applyFilters(): void {
    this.filtersChanged.emit(this.filters);
  }

  /**
   * Limpia todos los filtros a valores por defecto
   */
  clearFilters(): void {
    this.filters = {
      state: '',
      location: 0,
      startDate: new Date(new Date().setDate(new Date().getDate() - 30)),
      endDate: new Date(),
    };
    this.applyFilters();
  }

  /**
   * Formatea una fecha para el input type="date"
   * @param {Date} date - Fecha a formatear
   * @returns {string} Fecha formateada (YYYY-MM-DD)
   */
  formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Maneja cambios en la fecha de inicio
   * @param {string} dateString - Fecha en formato ISO
   */
  onStartDateChange(dateString: string): void {
    if (dateString) {
      this.filters.startDate = new Date(dateString);
    }
  }

  /**
   * Maneja cambios en la fecha de fin
   * @param {string} dateString - Fecha en formato ISO
   */
  onEndDateChange(dateString: string): void {
    if (dateString) {
      this.filters.endDate = new Date(dateString);
    }
  }
}
