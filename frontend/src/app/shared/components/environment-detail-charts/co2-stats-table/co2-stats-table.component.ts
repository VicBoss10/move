import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, of } from 'rxjs';
import { map, catchError, shareReplay } from 'rxjs/operators';
import { SensorDataService } from '../../../../core/services/sensor-data.service';
import { SensorData } from '../../../../core/models/sensor-data.model';

/**
 * Co2Stats aggregation data model.
 * @interface Co2Stats
 */
interface Co2Stats {
  actual: number;
  minimo: number;
  maximo: number;
  promedio: number;
  variacion: number;
}

/**
 * Co2StatsTableComponent (Presentation Component)
 *
 * Displays a statistics summary table for CO₂ concentration with key metrics.
 *
 * Features:
 * - Five-column stats grid: current, minimum, maximum, average, variation
 * - Real-time aggregation from all historical sensor data via backend query
 * - Variation calculation: (max - min) / avg * 100 as percentage of average
 * - Color-coded variation: green (<2%), orange (2-5%), red (>5%)
 * - Null/invalid value filtering: only positive CO₂ values included in calculations
 * - Stats rounding: all values rounded to nearest integer for display
 * - Responsive layout: 2 columns on mobile, 5 columns on small screens and up
 * - OnPush change detection with async pipe for subscription
 * - Fallback: displays zero-state on data load error
 *
 * @selector app-co2-stats-table
 * @standalone true
 * @imports CommonModule
 * @example
 * <app-co2-stats-table />
 */
@Component({
  selector: 'app-co2-stats-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './co2-stats-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Co2StatsTableComponent {
  /**
   * Observable stream of calculated CO₂ statistics aggregated from all sensor data.
   * @type {Observable<Co2Stats>}
   */
  stats$!: Observable<Co2Stats>;

  /**
   * Initializes component with service dependency and sets up stats observable.
   * @param {SensorDataService} sensorDataService - Service for querying historical CO₂ sensor data
   */
  constructor(private sensorDataService: SensorDataService) {
    this.initializeStats();
  }

  /**
   * Transforms all sensor data into aggregated statistics observable.
   * Maps raw sensor data to calculated stats: current, min, max, average, variation percentage.
   * Returns zero-state on empty or invalid data.
   * @private
   * @returns {void}
   */
  private initializeStats(): void {
    this.stats$ = this.sensorDataService.getAll().pipe(
      map((sensorData: SensorData[]) => {
        if (!sensorData || sensorData.length === 0) {
          return this.getEmptyStats();
        }

        return this.calculateStats(sensorData);
      }),
      catchError((error) => {
        console.error('Error cargando datos de CO₂:', error);
        return of(this.getEmptyStats());
      }),
      shareReplay(1),
    );
  }

  /**
   * Aggregates CO₂ statistics from sensor data array.
   * Filters null/undefined values, extracts last reading as current, computes min/max/average.
   * Variation = (max - min) / average * 100 as percentage representation of range.
   * @private
   * @param {SensorData[]} sensorData - Array of sensor readings to aggregate
   * @returns {Co2Stats} Object with current, min, max, average (ppm), variation (%)
   */
  private calculateStats(sensorData: SensorData[]): Co2Stats {
    const co2Values = sensorData
      .map((d) => d.co2)
      .filter((v) => v !== null && v !== undefined && v > 0);

    if (co2Values.length === 0) {
      return this.getEmptyStats();
    }

    const actual = co2Values[co2Values.length - 1];
    const minimo = Math.min(...co2Values);
    const maximo = Math.max(...co2Values);
    const promedio = Math.round(co2Values.reduce((a, b) => a + b, 0) / co2Values.length);

    const variacion = promedio > 0 ? Math.round(((maximo - minimo) / promedio) * 100 * 10) / 10 : 0;

    return {
      actual: Math.round(actual),
      minimo: Math.round(minimo),
      maximo: Math.round(maximo),
      promedio,
      variacion,
    };
  }

  /**
   * Returns zero-valued stats object for fallback display.
   * @private
   * @returns {Co2Stats} Stats object with all values set to 0
   */
  private getEmptyStats(): Co2Stats {
    return {
      actual: 0,
      minimo: 0,
      maximo: 0,
      promedio: 0,
      variacion: 0,
    };
  }

  /**
   * Derives Tailwind color classes for variation indicator based on magnitude.
   * Green: <2%, orange: 2-5%, red: >5% to reflect stability of CO₂ levels.
   * @param {number} variacion - Variation percentage value to evaluate
   * @returns {string} Tailwind CSS color classes for light and dark modes
   */
  getVariationColor(variacion: number): string {
    if (variacion > 5) return 'text-red-600 dark:text-red-400';
    if (variacion > 2) return 'text-orange-600 dark:text-orange-400';
    return 'text-green-600 dark:text-green-400';
  }
}
