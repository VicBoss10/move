import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
 * - Filtro por estado de cámara
 * - Filtro por ubicación
 * - Rango de fechas personalizado
 * - Botones para limpiar y aplicar filtros
 * - Responsive grid layout
 * - Dark mode support
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
   * Opciones de estados disponibles
   * @type {StateOption[]}
   */
  states: StateOption[] = [
    { value: '', label: 'Todos los estados' },
    { value: 'ACTIVE', label: 'Activa' },
    { value: 'INACTIVE', label: 'Inactiva' },
    { value: 'FAILING', label: 'Fallando' },
  ];

  /**
   * Opciones de ubicaciones disponibles
   * @type {LocationOption[]}
   */
  @Input() locations: LocationOption[] = [
    { id: 0, name: 'Todas las ubicaciones' },
    { id: 1, name: 'Carrera 7 con Calle 10' },
    { id: 2, name: 'Parque Arvi' },
    { id: 3, name: 'Centro Comercial El Hueco' },
    { id: 4, name: 'Terminal de Transporte' },
    { id: 5, name: 'Calle Principal Envigado' },
  ];

  /**
   * Evento que emite cuando los filtros cambian
   * @type {EventEmitter<CameraFilters>}
   */
  @Output() filtersChanged = new EventEmitter<CameraFilters>();

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
