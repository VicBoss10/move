import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

/**
 * Interfaz para filtros de ubicación
 * @interface LocationFilters
 * @property {string} zone - Zona a filtrar
 * @property {number} quality - Calidad mínima a filtrar
 * @property {Date} startDate - Fecha de inicio
 * @property {Date} endDate - Fecha de fin
 */
export interface LocationFilters {
  zone: string;
  quality: number;
  startDate: Date;
  endDate: Date;
}

/**
 * Interfaz para opción de zona
 * @interface ZoneOption
 * @property {string} value - Valor de la zona
 * @property {string} label - Etiqueta en español
 */
export interface ZoneOption {
  value: string;
  label: string;
}

/**
 * LocationFiltersComponent
 *
 * Componente que proporciona filtros para ubicaciones de monitoreo.
 * Permite filtrar por zona, calidad y rango de fechas.
 *
 * Características:
 * - Filtro por zona geográfica
 * - Filtro por calidad de monitoreo
 * - Rango de fechas personalizado
 * - Botones para limpiar y aplicar filtros
 * - Responsive grid layout
 * - Dark mode support
 *
 * @selector app-location-filters
 * @standalone true
 * @imports CommonModule, FormsModule
 * @returns Formulario de filtros
 *
 * @example
 * <app-location-filters (filtersChanged)="onFiltersChanged($event)" />
 */
@Component({
  selector: 'app-location-filters',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './location-filters.component.html',
})
export class LocationFiltersComponent {
  /**
   * Modelo de filtros
   * @type {LocationFilters}
   */
  filters: LocationFilters = {
    zone: '',
    quality: 0,
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)),
    endDate: new Date(),
  };

  /**
   * Opciones de zonas disponibles
   * @type {ZoneOption[]}
   */
  zones: ZoneOption[] = [
    { value: '', label: 'Todas las zonas' },
    { value: 'norte', label: 'Zona Norte' },
    { value: 'centro', label: 'Centro' },
    { value: 'sur', label: 'Zona Sur' },
    { value: 'conurbana', label: 'Zona Conurbana' },
  ];

  /**
   * Evento que emite cuando los filtros cambian
   * @type {EventEmitter<LocationFilters>}
   */
  @Output() filtersChanged = new EventEmitter<LocationFilters>();

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
      zone: '',
      quality: 0,
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
