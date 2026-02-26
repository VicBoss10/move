import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SensorDataSearchCriteria } from '../../../../core/models/sensor-data.model';

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
   * Event emitter para cambios de filtro
   * Emite SensorDataSearchCriteria
   */
  @Output() filterChange = new EventEmitter<SensorDataSearchCriteria>();

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
   * Mapea el parámetro seleccionado a rangos de valores
   * @private
   * @returns {Object} Objeto con min y max para el parámetro
   */
  private getValueRangesForParameter(): { min: number; max: number } {
    switch (this.selectedParameter) {
      case 'temperature':
        return { min: -10, max: 50 }; // °C
      case 'humidity':
        return { min: 0, max: 100 }; // %
      case 'co2':
        return { min: 300, max: 2000 }; // ppm
      case 'pm25':
        return { min: 0, max: 500 }; // µg/m³
      case 'pm10':
        return { min: 0, max: 500 }; // µg/m³
      case 'co':
        return { min: 0, max: 50 }; // ppm
      case 'no2':
        return { min: 0, max: 200 }; // ppb
      case 'nh3':
        return { min: 0, max: 100 }; // ppb
      default:
        return { min: 0, max: 100 };
    }
  }

  /**
   * Convierte los filtros de UI a SensorDataSearchCriteria
   * @private
   * @returns {SensorDataSearchCriteria} Criterios de búsqueda
   */
  private buildSearchCriteria(): SensorDataSearchCriteria {
    const criteria: SensorDataSearchCriteria = {};

    // Agregar rango de fechas si están configuradas
    if (this.startDate) {
      criteria.start = new Date(this.startDate);
    }
    if (this.endDate) {
      const end = new Date(this.endDate);
      end.setHours(23, 59, 59, 999); // Incluir todo el día
      criteria.end = end;
    }

    // Agregar rangos de valores según el parámetro seleccionado
    if (this.selectedParameter !== 'all') {
      const minVal = Math.min(this.minValue, this.maxValue);
      const maxVal = Math.max(this.minValue, this.maxValue);

      switch (this.selectedParameter) {
        case 'temperature':
          criteria.minTemperature = minVal;
          criteria.maxTemperature = maxVal;
          break;
        case 'humidity':
          criteria.minHumidity = minVal;
          criteria.maxHumidity = maxVal;
          break;
        case 'co2':
          criteria.minCo2 = minVal;
          criteria.maxCo2 = maxVal;
          break;
        case 'pm25':
          criteria.minPm25 = minVal;
          criteria.maxPm25 = maxVal;
          break;
        case 'pm10':
          criteria.minPm10 = minVal;
          criteria.maxPm10 = maxVal;
          break;
        case 'co':
          criteria.minCo = minVal;
          criteria.maxCo = maxVal;
          break;
        case 'no2':
          criteria.minNo2 = minVal;
          criteria.maxNo2 = maxVal;
          break;
        case 'nh3':
          criteria.minNh3 = minVal;
          criteria.maxNh3 = maxVal;
          break;
      }
    }

    return criteria;
  }

  /**
   * Actualiza los rangos cuando se cambia de parámetro
   * @returns {void}
   */
  onParameterChange(): void {
    const ranges = this.getValueRangesForParameter();
    this.minValue = ranges.min;
    this.maxValue = ranges.max;
  }

  /**
   * Aplica los filtros y emite el evento
   * @returns {void}
   */
  applyFilters(): void {
    const criteria = this.buildSearchCriteria();
    console.log('Filtros aplicados:', criteria);
    this.filterChange.emit(criteria);
  }

  /**
   * Limpia todos los filtros
   * @returns {void}
   */
  clearFilters(): void {
    this.startDate = '';
    this.endDate = '';
    this.selectedParameter = 'all';
    this.onParameterChange();
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
