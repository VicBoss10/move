import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, of } from 'rxjs';
import { map, catchError, shareReplay } from 'rxjs/operators';
import { SensorDataService } from '../../../../core/services/sensor-data.service';
import { SensorData } from '../../../../core/models/sensor-data.model';

/**
 * GasStats aggregation data model for single gas metric.
 * @interface GasStats
 */
interface GasStats {
  symbol: string;
  name: string;
  actual: number;
  minimo: number;
  maximo: number;
  promedio: number;
  unit: string;
}

/**
 * GasesStatsTableComponent (Presentation Component)
 *
 * Displays a statistics table for three pollutant gases: CO, NO₂, and NH₃.
 *
 * Features:
 * - Three-row table: one row per gas with symbol, name, and unit
 * - Five statistics columns: current (latest), minimum, maximum, average, all from historical data
 * - Current value highlighted with distinct styling; average in blue
 * - Unit-aware display: CO (ppm), NO₂ (µg/m³), NH₃ (ppb)
 * - Real-time aggregation from all historical sensor data via backend query
 * - Average calculation: rounded to 1 decimal place for display
 * - Responsive table: scrollable on mobile, auto layout on larger screens
 * - OnPush change detection with async pipe for subscription
 * - Fallback: displays zero-state on data load error
 *
 * @selector app-gases-stats-table
 * @standalone true
 * @imports CommonModule
 * @example
 * <app-gases-stats-table />
 */
@Component({
  selector: 'app-gases-stats-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gases-stats-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GasesStatsTableComponent {
  /**
   * Observable stream of aggregated gas statistics for three pollutants.
   * @type {Observable<GasStats[]>}
   */
  gasesStats$!: Observable<GasStats[]>;

  /**
   * Default zero-state statistics for three gases: CO, NO₂, NH₃.
   * @type {GasStats[]}
   * @private
   */
  private readonly defaultStats: GasStats[] = [
    {
      symbol: 'CO',
      name: 'Monóxido de Carbono',
      actual: 0,
      minimo: 0,
      maximo: 0,
      promedio: 0,
      unit: 'ppm',
    },
    {
      symbol: 'NO₂',
      name: 'Dióxido de Nitrógeno',
      actual: 0,
      minimo: 0,
      maximo: 0,
      promedio: 0,
      unit: 'µg/m³',
    },
    {
      symbol: 'NH₃',
      name: 'Amoníaco',
      actual: 0,
      minimo: 0,
      maximo: 0,
      promedio: 0,
      unit: 'ppb',
    },
  ];

  /**
   * Initializes component with service dependency and sets up stats observable.
   * @param {SensorDataService} sensorDataService - Service for querying historical gas sensor data
   */
  constructor(private sensorDataService: SensorDataService) {
    this.initializeGasStats();
  }

  /**
   * Transforms all sensor data into aggregated statistics observable for each gas.
   * Extracts values per gas, computes current (latest), min, max, and average.
   * Returns zero-state on empty or invalid data.
   * @private
   * @returns {void}
   */
  private initializeGasStats(): void {
    this.gasesStats$ = this.sensorDataService.getAll().pipe(
      map((sensorData: SensorData[]) => {
        if (!sensorData || sensorData.length === 0) {
          return this.defaultStats;
        }

        const coValues = sensorData.map((d) => d.co || 0);
        const no2Values = sensorData.map((d) => d.no2 || 0);
        const nh3Values = sensorData.map((d) => d.nh3 || 0);

        return [
          {
            ...this.defaultStats[0],
            actual: this.getLatestValue(coValues),
            minimo: Math.min(...coValues),
            maximo: Math.max(...coValues),
            promedio: this.calculateAverage(coValues),
          },
          {
            ...this.defaultStats[1],
            actual: this.getLatestValue(no2Values),
            minimo: Math.min(...no2Values),
            maximo: Math.max(...no2Values),
            promedio: this.calculateAverage(no2Values),
          },
          {
            ...this.defaultStats[2],
            actual: this.getLatestValue(nh3Values),
            minimo: Math.min(...nh3Values),
            maximo: Math.max(...nh3Values),
            promedio: this.calculateAverage(nh3Values),
          },
        ];
      }),
      catchError((error) => {
        console.error('Error loading gas statistics:', error);
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
   * Computes arithmetic mean of numeric array, rounded to 1 decimal place.
   * @private
   * @param {number[]} values - Array of numeric values to average
   * @returns {number} Mean value rounded to 1 decimal, or 0 if empty
   */
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    const sum = values.reduce((acc, val) => acc + val, 0);
    return Math.round((sum / values.length) * 10) / 10;
  }
}
