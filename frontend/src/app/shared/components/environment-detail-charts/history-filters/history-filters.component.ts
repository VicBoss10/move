import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

/**
 * HistoryFiltersComponent
 *
 * Componente de filtros para la página de historial ambiental.
 * Permite filtrar por rango de fechas, contaminante específico y rango de valores.
 * Emite eventos cuando los filtros cambien.
 *
 * @selector app-history-filters
 * @standalone true
 * @imports CommonModule, FormsModule
 * @returns Panel de filtros para historial
 *
 * @example
 * <app-history-filters
 *   (onFilterChange)="handleFilterChange($event)"
 * />
 */
@Component({
  selector: 'app-history-filters',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './history-filters.component.html',
})
export class HistoryFiltersComponent {
  /**
   * Fecha de inicio para filtro
   * @type {string}
   */
  startDate: string = '';

  /**
   * Fecha de fin para filtro
   * @type {string}
   */
  endDate: string = '';

  /**
   * Parámetro seleccionado para filtrar
   * Opciones: 'all', 'co2', 'temperature', 'humidity', 'pm25', 'pm10', 'gases'
   * @type {string}
   */
  selectedParameter: string = 'all';

  /**
   * Rango mínimo para filtro de valores
   * @type {number}
   */
  minValue: number = 0;

  /**
   * Rango máximo para filtro de valores
   * @type {number}
   */
  maxValue: number = 100;

  /**
   * Array de parámetros disponibles
   * @type {Array}
   */
  parameters = [
    { value: 'all', label: 'Todos los parámetros' },
    { value: 'co2', label: 'CO₂' },
    { value: 'temperature', label: 'Temperatura' },
    { value: 'humidity', label: 'Humedad' },
    { value: 'pm25', label: 'PM2.5' },
    { value: 'pm10', label: 'PM10' },
    { value: 'gases', label: 'Gases' },
  ];

  /**
   * Aplica los filtros
   * TODO: Emitir evento con los filtros configurados
   * @returns {void}
   */
  applyFilters(): void {
    const filters = {
      startDate: this.startDate,
      endDate: this.endDate,
      parameter: this.selectedParameter,
      minValue: this.minValue,
      maxValue: this.maxValue,
    };
    console.log('Filtros aplicados:', filters);
    // this.filterChange.emit(filters);
  }

  /**
   * Limpia todos los filtros
   * @returns {void}
   */
  clearFilters(): void {
    this.startDate = '';
    this.endDate = '';
    this.selectedParameter = 'all';
    this.minValue = 0;
    this.maxValue = 100;
    this.applyFilters();
  }

  /**
   * Obtiene la fecha mínima permitida (30 días atrás)
   * @returns {string} Fecha en formato YYYY-MM-DD
   */
  getMinDate(): string {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  }

  /**
   * Obtiene la fecha máxima permitida (hoy)
   * @returns {string} Fecha en formato YYYY-MM-DD
   */
  getMaxDate(): string {
    return new Date().toISOString().split('T')[0];
  }
}
