import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, of } from 'rxjs';
import { map, catchError, shareReplay } from 'rxjs/operators';
import { SensorDataService } from '../../../../core/services/sensor-data.service';
import { SensorData } from '../../../../core/models/sensor-data.model';

/**
 * PMStats aggregation data model.
 * @interface PMStats
 */
interface PMStats {
  symbol: string;
  name: string;
  actual: number;
  minimo: number;
  maximo: number;
  promedio: number;
  variacion: number;
  unit: string;
}

/**
 * PmStatsTableComponent (Presentation Component)
 *
 * Displays a statistics summary table for PM2.5 and PM10 particle concentrations with key metrics.
 *
 * Features:
 * - Two-row table with PM2.5 and PM10 particle type metrics
 * - Six-column layout: particle type, current, minimum, maximum, average (blue highlight), variation (color-coded)
 * - Real-time aggregation from all historical sensor data via backend query
 * - Variation calculation: ((latest - previous) / previous) * 100 as percentage change ratio
 * - Color-coded variation: green (<2%), orange (2-5%), red (>5%)
 * - All values rounded to 1 decimal place for display (µg/m³)
 * - Responsive table with horizontal scroll on mobile, full width on larger screens
 * - Hover effects on rows with light background color change
 * - OnPush change detection with async pipe for subscription
 * - Fallback: displays zero-state on data load error
 *
 * @selector app-pm-stats-table
 * @standalone true
 * @imports CommonModule
 * @example
 * <app-pm-stats-table />
 */
@Component({
  selector: 'app-pm-stats-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pm-stats-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PmStatsTableComponent {
  /**
   * Observable stream of calculated particle statistics aggregated from all sensor data.
   * @type {Observable<PMStats[]>}
   */
  pmStats$!: Observable<PMStats[]>;

  /**
   * Default zero-state statistics returned on error.
   * @type {PMStats[]}
   * @private
   */
  private readonly defaultStats: PMStats[] = [
    {
      symbol: 'PM2.5',
      name: 'Partículas Finas',
      actual: 0,
      minimo: 0,
      maximo: 0,
      promedio: 0,
      variacion: 0,
      unit: 'µg/m³',
    },
    {
      symbol: 'PM10',
      name: 'Partículas Gruesas',
      actual: 0,
      minimo: 0,
      maximo: 0,
      promedio: 0,
      variacion: 0,
      unit: 'µg/m³',
    },
  ];

  /**
   * Initializes component with service dependency and sets up stats observable.
   * @param {SensorDataService} sensorDataService - Service for querying historical particle sensor data
   */
  constructor(private sensorDataService: SensorDataService) {
    this.initializePMStats();
  }

  /**
   * Transforms all sensor data into aggregated statistics observable.
   * Maps raw particle data to calculated stats: current, min, max, average, percentage change variation.
   * Returns zero-state on empty or invalid data.
   * @private
   * @returns {void}
   */
  private initializePMStats(): void {
    this.pmStats$ = this.sensorDataService.getAll().pipe(
      map((sensorData: SensorData[]) => {
        if (!sensorData || sensorData.length === 0) {
          return this.defaultStats;
        }

        const pm25Values = sensorData.map((d) => d.pm25 || 0);
        const pm10Values = sensorData.map((d) => d.pm10 || 0);

        return [
          {
            ...this.defaultStats[0],
            actual: this.getLatestValue(pm25Values),
            minimo: Math.min(...pm25Values),
            maximo: Math.max(...pm25Values),
            promedio: this.calculateAverage(pm25Values),
            variacion: this.calculateVariation(pm25Values),
          },
          {
            ...this.defaultStats[1],
            actual: this.getLatestValue(pm10Values),
            minimo: Math.min(...pm10Values),
            maximo: Math.max(...pm10Values),
            promedio: this.calculateAverage(pm10Values),
            variacion: this.calculateVariation(pm10Values),
          },
        ];
      }),
      catchError((error) => {
        console.error('Error loading particle statistics:', error);
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
   * Computes arithmetic mean of numeric array and rounds to 1 decimal place.
   * @private
   * @param {number[]} values - Array of numeric values to average
   * @returns {number} Mean value rounded to 1 decimal, or 0 if empty
   */
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    const sum = values.reduce((acc, val) => acc + val, 0);
    return Math.round((sum / values.length) * 10) / 10;
  }

  /**
   * Calculates percentage change from second-to-last to last value in array.
   * Returns absolute value of ((latest - previous) / previous) * 100 as percentage.
   * Rounds result to 1 decimal place; returns 0 if less than 2 values or previous is zero.
   * @private
   * @param {number[]} values - Array of numeric values (at least 2 for meaningful variation)
   * @returns {number} Absolute percentage change (0-100+) rounded to 1 decimal
   */
  private calculateVariation(values: number[]): number {
    if (values.length < 2) return 0;
    const latest = values[values.length - 1];
    const previous = values[values.length - 2];
    if (previous === 0) return 0;
    const variation = ((latest - previous) / previous) * 100;
    return Math.round(Math.abs(variation) * 10) / 10;
  }

  /**
   * Derives Tailwind color classes for variation indicator based on magnitude.
   * Red: >5%, orange: 2-5%, green: <2% to reflect volatility of particle levels.
   * @param {number} variacion - Variation percentage value to evaluate
   * @returns {string} Tailwind CSS color classes for light and dark modes
   */
  getVariationColor(variacion: number): string {
    if (variacion > 5) return 'text-red-600 dark:text-red-400';
    if (variacion > 2) return 'text-orange-600 dark:text-orange-400';
    return 'text-green-600 dark:text-green-400';
  }
}
