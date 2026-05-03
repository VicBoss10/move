import { Component, Output, EventEmitter } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { SensorDataSearchCriteria } from '../../../../core/models/sensor-data.model';

/**
 * HistoryFiltersComponent (Stateful Component)
 *
 * Provides filtration panel for environmental data history with four filter dimensions.
 *
 * Features:
 * - Date range filter: start and end dates (30-day lookback window enforced)
 * - Parameter selection: dropdown with 7 options (all parameters, CO₂, temperature, humidity, PM2.5, PM10, gases)
 * - Value range filter: min/max inputs that adapt based on selected parameter
 * - Adaptive range constraints: CO₂ (300-2000 ppm), humidity (0-100%), temp (-10-50°C), gases (0-200 ppb/ppm)
 * - Apply and Clear buttons: trigger filter events and reset state
 * - Reactive two-way binding with [(ngModel)] on all inputs
 * - Emits SensorDataSearchCriteria events on apply/clear
 * - OnPush not used; standard change detection for stateful UI
 *
 * @selector app-history-filters
 * @standalone true
 * @imports FormsModule
 * @example
 * <app-history-filters (filterChange)="handleFilterChange($event)" />
 */
@Component({
  selector: 'app-history-filters',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './history-filters.component.html',
})
export class HistoryFiltersComponent {
  /**
   * Start date string in YYYY-MM-DD format for date range filter.
   * @type {string}
   */
  startDate: string = '';

  /**
   * End date string in YYYY-MM-DD format for date range filter.
   * @type {string}
   */
  endDate: string = '';

  /**
   * Selected parameter key for filtering ('all' | 'co2' | 'temperature' | 'humidity' | 'pm25' | 'pm10' | 'gases').
   * @type {string}
   */
  selectedParameter: string = 'all';

  /**
   * Minimum value threshold for value range filter.
   * @type {number}
   */
  minValue: number = 0;

  /**
   * Maximum value threshold for value range filter.
   * @type {number}
   */
  maxValue: number = 100;

  /**
   * Output event emitter that broadcasts SensorDataSearchCriteria when filters are applied or cleared.
   * @type {EventEmitter<SensorDataSearchCriteria>}
   */
  @Output() filterChange = new EventEmitter<SensorDataSearchCriteria>();

  /**
   * Array of filterable parameter options with value keys and display labels.
   * @type {Array<{value: string; label: string}>}
   */
  parameters = [
    { value: 'all', label: 'All parameters' },
    { value: 'co2', label: 'CO₂' },
    { value: 'temperature', label: 'Temperature' },
    { value: 'humidity', label: 'Humidity' },
    { value: 'pm25', label: 'PM2.5' },
    { value: 'pm10', label: 'PM10' },
    { value: 'gases', label: 'Gases' },
  ];

  /**
   * Maps selected parameter key to its valid min/max value range based on units.
   * Ranges: temperature (-10 to 50°C), humidity (0-100%), CO₂ (300-2000 ppm), gases (0-200 ppb/ppm), PM (0-500 µg/m³).
   * @private
   * @returns {{min: number; max: number}} Min and max boundaries for current parameter
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
   * Transforms UI filter state into SensorDataSearchCriteria query object.
   * Maps date inputs to ISO Date objects, sets 23:59:59.999 on end date for day-inclusive range.
   * Conditionally includes min/max properties based on selected parameter (skipped if 'all').
   * @private
   * @returns {SensorDataSearchCriteria} Criteria object with optional start, end, and parameter-specific bounds
   */
  private buildSearchCriteria(): SensorDataSearchCriteria {
    const criteria: SensorDataSearchCriteria = {};

    if (this.startDate) {
      criteria.start = new Date(this.startDate);
    }
    if (this.endDate) {
      const end = new Date(this.endDate);
      end.setHours(23, 59, 59, 999);
      criteria.end = end;
    }

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
   * Updates min/max value constraints when parameter selection changes.
   * Fetches appropriate range from getValueRangesForParameter based on selected parameter units.
   * @returns {void}
   */
  onParameterChange(): void {
    const ranges = this.getValueRangesForParameter();
    this.minValue = ranges.min;
    this.maxValue = ranges.max;
  }

  /**
   * Constructs and emits filter criteria based on current UI state.
   * Logs criteria to console for debugging, emits filterChange event to parent.
   * @returns {void}
   */
  applyFilters(): void {
    const criteria = this.buildSearchCriteria();
    console.log('Filtros aplicados:', criteria);
    this.filterChange.emit(criteria);
  }

  /**
   * Resets all filter fields to default state and emits empty criteria.
   * Clears dates, resets parameter to 'all', recalculates ranges, then applies.
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
   * Returns minimum selectable date as YYYY-MM-DD string (30 days prior to today).
   * @returns {string} ISO date string for 30-day lookback window start
   */
  getMinDate(): string {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  }

  /**
   * Returns maximum selectable date as YYYY-MM-DD string (today).
   * @returns {string} ISO date string for current date
   */
  getMaxDate(): string {
    return new Date().toISOString().split('T')[0];
  }
}
