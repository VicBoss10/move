import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

/**
 * Interfaz para filtros de vehículos
 */
export interface VehicleFilters {
  type: string;
  location: string;
  startDate: string;
  endDate: string;
}

/**
 * VehicleFiltersComponent
 *
 * Componente de filtros para la página de vehículos detectados.
 * Permite filtrar por tipo de vehículo, ubicación y rango de fechas.
 *
 * Características:
 * - Filtro por tipo (CAR, BUS, MOTORCYCLE, BICYCLE, TRUCK)
 * - Filtro por ubicación
 * - Filtro por rango de fechas
 * - Emite eventos cuando se aplican o limpian filtros
 *
 * @selector app-vehicle-filters
 * @standalone true
 * @imports CommonModule, FormsModule
 * @returns Panel de filtros para vehículos
 *
 * @example
 * <app-vehicle-filters (filtersChanged)="handleFilterChange($event)" />
 */
@Component({
  selector: 'app-vehicle-filters',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './vehicle-filters.component.html',
})
export class VehicleFiltersComponent {
  /**
   * Evento que emite cuando cambian los filtros
   */
  @Output() filtersChanged = new EventEmitter<VehicleFilters>();

  /**
   * Tipos de vehículos disponibles (del Enum del backend)
   * @type {string[]}
   */
  vehicleTypes = [
    { value: 'CAR', label: 'Auto' },
    { value: 'BUS', label: 'Bus' },
    { value: 'MOTORCYCLE', label: 'Moto' },
    { value: 'BICYCLE', label: 'Bicicleta' },
    { value: 'TRUCK', label: 'Camión' },
  ];

  /**
   * Ubicaciones disponibles (mock data - vendrá del backend)
   * @type {Array}
   */
  locations = [
    { id: 1, name: 'Carrera 7 con Calle 10' },
    { id: 2, name: 'Parque Arvi' },
    { id: 3, name: 'Centro Comercial' },
    { id: 4, name: 'Terminal de Transporte' },
  ];

  /**
   * Filtros actuales
   */
  filters: VehicleFilters = {
    type: '',
    location: '',
    startDate: '',
    endDate: '',
  };

  /**
   * Aplica los filtros seleccionados
   * @returns {void}
   */
  applyFilters(): void {
    this.filtersChanged.emit(this.filters);
  }

  /**
   * Limpia todos los filtros
   * @returns {void}
   */
  clearFilters(): void {
    this.filters = {
      type: '',
      location: '',
      startDate: '',
      endDate: '',
    };
    this.filtersChanged.emit(this.filters);
  }
}
