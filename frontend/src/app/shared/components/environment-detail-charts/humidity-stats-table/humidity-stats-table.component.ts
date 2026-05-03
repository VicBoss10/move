import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, of } from 'rxjs';
import { map, catchError, shareReplay } from 'rxjs/operators';
import { SensorDataService } from '../../../../core/services/sensor-data.service';
import { SensorData } from '../../../../core/models/sensor-data.model';

/**
 * HumidityStats aggregation data model.
 * @interface HumidityStats
 */
interface HumidityStats {
  actual: number;
  minimo: number;
  maximo: number;
  promedio: number;
  variacion: number;
}

/**
 * HumidityStatsTableComponent (Presentation Component)
 *
 * Displays a statistics summary table for relative humidity with key metrics.
 *
 * Features:
 * - Five-column stats grid: current, minimum, maximum, average, variation
 * - Real-time aggregation from all historical sensor data via backend query
 * - Variation calculation: (max - min) as percentage point difference
 * - Color-coded variation: green (<5%), orange (5-10%), red (>10%)
 * - All values rounded to 1 decimal place for display (percentage)
 * - Responsive layout: 2 columns on mobile, 5 columns on small screens and up
 * - OnPush change detection with async pipe for subscription
 * - Fallback: displays zero-state on data load error
 *
 * @selector app-humidity-stats-table
 * @standalone true
 * @imports CommonModule
 * @example
 * <app-humidity-stats-table />
 */
@Component({
  selector: 'app-humidity-stats-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './humidity-stats-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HumidityStatsTableComponent {
  /**
   * Observable stream of calculated humidity statistics aggregated from all sensor data.
   * @type {Observable<HumidityStats>}
   */
  stats$!: Observable<HumidityStats>;

  /**
   * Default zero-state statistics returned on error.
   * @type {HumidityStats}
   * @private
   */
  private readonly defaultStats: HumidityStats = {
    actual: 0,
    minimo: 0,
    maximo: 0,
    promedio: 0,
    variacion: 0,
  };

  /**
   * Initializes component with service dependency and sets up stats observable.
   * @param {SensorDataService} sensorDataService - Service for querying historical humidity sensor data
   */
  constructor(private sensorDataService: SensorDataService) {
    this.initializeStats();
  }

  /**
   * Transforms all sensor data into aggregated statistics observable.
   * Maps raw sensor data to calculated stats: current, min, max, average, variation percentage points.
   * Returns zero-state on empty or invalid data.
   * @private
   * @returns {void}
   */
  private initializeStats(): void {
    this.stats$ = this.sensorDataService.getAll().pipe(
      map((sensorData: SensorData[]) => {
        if (!sensorData || sensorData.length === 0) {
          return this.defaultStats;
        }

        const humidityValues = sensorData.map((d) => d.humidity || 0);

        const actual = this.getLatestValue(humidityValues);
        const minimo = Math.min(...humidityValues);
        const maximo = Math.max(...humidityValues);
        const promedio = this.calculateAverage(humidityValues);
        const variacion = maximo - minimo;

        return {
          actual: Math.round(actual * 10) / 10,
          minimo: Math.round(minimo * 10) / 10,
          maximo: Math.round(maximo * 10) / 10,
          promedio: Math.round(promedio * 10) / 10,
          variacion: Math.round(variacion * 10) / 10,
        };
      }),
      catchError((error) => {
        console.error('Error loading humidity statistics:', error);
        return of(this.defaultStats);
      }),
      shareReplay(1),
    );
  }

  /**
   * Extracts the last value from a numeric array.
   * @private
   * @param {number[]} values - Array of numeric values
   * @returns {number} Last value in array, or 0 if empty
   */
  private getLatestValue(values: number[]): number {
    return values.length > 0 ? values[values.length - 1] : 0;
  }

  /**
   * Computes arithmetic mean of numeric array.
   * @private
   * @param {number[]} values - Array of numeric values to average
   * @returns {number} Mean value, or 0 if empty
   */
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    const sum = values.reduce((acc, val) => acc + val, 0);
    return sum / values.length;
  }

  /**
   * Derives Tailwind color classes for variation indicator based on magnitude.
   * Green: <5%, orange: 5-10%, red: >10% to reflect stability of humidity levels.
   * @param {number} variacion - Variation percentage point value to evaluate
   * @returns {string} Tailwind CSS color classes for light and dark modes
   */
  getVariationColor(variacion: number): string {
    if (variacion > 10) return 'text-red-600 dark:text-red-400';
    if (variacion > 5) return 'text-orange-600 dark:text-orange-400';
    return 'text-green-600 dark:text-green-400';
  }
}
