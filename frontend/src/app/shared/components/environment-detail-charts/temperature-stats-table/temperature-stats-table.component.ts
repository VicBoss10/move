import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, of } from 'rxjs';
import { map, catchError, shareReplay } from 'rxjs/operators';
import { SensorDataService } from '../../../../core/services/sensor-data.service';
import { SensorData } from '../../../../core/models/sensor-data.model';

/**
 * TemperatureStats interface for temperature statistics aggregation.
 * @interface TemperatureStats
 * @property {number} actual - Latest temperature reading in Celsius
 * @property {number} minimo - Minimum temperature value (lowercase preserved for template compatibility)
 * @property {number} maximo - Maximum temperature value (lowercase preserved for template compatibility)
 * @property {number} promedio - Average temperature value (lowercase preserved for template compatibility)
 * @property {number} variacion - Temperature range (maximum - minimum) (lowercase preserved for template compatibility)
 */
interface TemperatureStats {
  actual: number;
  minimo: number;
  maximo: number;
  promedio: number;
  variacion: number;
}

/**
 * TemperatureStatsTableComponent (Presentation Component)
 *
 * Displays a statistics summary table for temperature with five key metrics aggregated from historical sensor data.
 *
 * Features:
 * - Five-column metric display: current (latest value), minimum, maximum, average, and variation (max-min range)
 * - All values rounded to 1 decimal place and displayed in Celsius (°C)
 * - Current value: shown at standard size, latest measurement from sensor data
 * - Minimum value: blue text (#3b82f6), lowest temperature recorded
 * - Maximum value: orange text (#f97316), highest temperature recorded
 * - Average value: standard gray text, arithmetic mean of all temperature values
 * - Variation: color-coded range indicator showing max-min difference:
 *   - Green (<3°C): minimal temperature fluctuation
 *   - Orange (3-5°C): moderate temperature swing
 *   - Red (>5°C): large temperature variation
 * - Responsive grid: 2 columns mobile, 5 columns desktop for metric cards
 * - Data source: streaming from getAll() sensor data with automatic error recovery
 * - Error handling: returns default zero-state on service failure with console logging
 * - OnPush change detection with async pipe subscription
 * - Fallback: displays zero values on data load error
 *
 * Interface TemperatureStats:
 * - actual: number - latest temperature reading
 * - minimo: number - minimum temperature
 * - maximo: number - maximum temperature
 * - promedio: number - average temperature
 * - variacion: number - range (maximo - minimo)
 *
 * @selector app-temperature-stats-table
 * @standalone true
 * @imports CommonModule
 * @example
 * <app-temperature-stats-table />
 */
@Component({
  selector: 'app-temperature-stats-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './temperature-stats-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TemperatureStatsTableComponent {
  /**
   * Observable stream emitting aggregated temperature statistics from sensor data.
   * @type {Observable<TemperatureStats>}
   */
  stats$!: Observable<TemperatureStats>;

  private readonly defaultStats: TemperatureStats = {
    actual: 0,
    minimo: 0,
    maximo: 0,
    promedio: 0,
    variacion: 0,
  };

  constructor(private sensorDataService: SensorDataService) {
    this.initializeStats();
  }

  /**
   * Initializes statistics observable from all historical sensor data.
   * Extracts temperature values, calculates min, max, average, and range (variation).
   * Returns default zero-state on error with console logging.
   * @private
   * @returns {void}
   */
  private initializeStats(): void {
    this.stats$ = this.sensorDataService.getAll().pipe(
      map((sensorData: SensorData[]) => {
        if (!sensorData || sensorData.length === 0) {
          return this.defaultStats;
        }

        // Extraer valores de temperatura
        const tempValues = sensorData.map((d) => d.temperature || 0);

        const actual = this.getLatestValue(tempValues);
        const minimo = Math.min(...tempValues);
        const maximo = Math.max(...tempValues);
        const promedio = this.calculateAverage(tempValues);
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
        console.error('Error loading temperature statistics:', error);
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
   * Derives Tailwind color classes for variation indicator based on temperature range magnitude.
   * Red: >5°C, orange: 3-5°C, green: <3°C to reflect volatility of temperature fluctuations.
   * @param {number} variacion - Variation (max-min) value in Celsius to evaluate
   * @returns {string} Tailwind CSS color classes for light and dark modes
   */
  getVariationColor(variacion: number): string {
    if (variacion > 5) return 'text-red-600 dark:text-red-400';
    if (variacion > 3) return 'text-orange-600 dark:text-orange-400';
    return 'text-green-600 dark:text-green-400';
  }
}
