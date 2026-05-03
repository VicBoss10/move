import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, of, combineLatest } from 'rxjs';
import { map, catchError, shareReplay } from 'rxjs/operators';
import { SensorDataService } from '../../../../core/services/sensor-data.service';
import { ThresholdsService } from '../../../../core/services/thresholds.service';
import {
  getEnvironmentStatusFromConfig,
  EnvironmentMetricKey,
} from '../../../../core/config/environment-thresholds.config';

/**
 * GasIndicator aggregation model for multi-gas gauge display.
 * @interface GasIndicator
 */
interface GasIndicator {
  name: string;
  symbol: string;
  value: number;
  unit: string;
  color: string;
  bgColor: string;
  status: string;
  maxValue: number;
}

/**
 * MultiGasIndicatorsComponent (Presentation Component)
 *
 * Displays three circular gauge visualizations for CO, NO₂, and NH₃ gas concentrations with real-time updates.
 *
 * Features:
 * - Three mini SVG circular gauges showing current gas levels
 * - Real-time data from latest sensor reading and threshold configuration
 * - Color-coded status derived from threshold ranges and color mapping
 * - Three gas types: CO (ppm), NO₂ (µg/m³), NH₃ (ppb) with dynamic units
 * - Status label beneath each gauge with color-coded text
 * - Reactive data stream: combineLatest of latest sensor data and threshold changes
 * - OnPush change detection with async pipe for subscription
 * - Responsive grid layout: 1 column mobile, 2 columns tablet, 3 columns desktop
 * - Gauge percentage clamped to 0-100% for overflow protection
 * - Fallback: displays empty state on data load error
 *
 * @selector app-multi-gas-indicators
 * @standalone true
 * @imports CommonModule
 * @example
 * <app-multi-gas-indicators />
 */
@Component({
  selector: 'app-multi-gas-indicators',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './multi-gas-indicators.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MultiGasIndicatorsComponent {
  /**
   * Observable stream of calculated gas indicators with current values, units, colors, and status labels.
   * @type {Observable<GasIndicator[]>}
   */
  gasIndicators$!: Observable<GasIndicator[]>;

  /**
   * Initializes component with service dependencies and sets up gas indicators observable.
   * Triggers initialization combining latest sensor data and threshold configuration.
   * @param {SensorDataService} sensorDataService - Service for querying latest gas sensor data
   * @param {ThresholdsService} thresholds - Service for accessing threshold configuration for all gas types
   */
  constructor(
    private sensorDataService: SensorDataService,
    private thresholds: ThresholdsService,
  ) {
    this.initializeGasIndicators();
  }

  /**
   * Combines latest sensor data and threshold configuration to produce gauge rendering data for three gas types.
   * Maps CO, NO₂, and NH₃ configurations to indicator objects with values rounded to 1 decimal place.
   * Calculates status and color from threshold ranges; returns empty array on error for graceful fallback.
   * @private
   * @returns {void}
   */
  private initializeGasIndicators(): void {
    this.gasIndicators$ = combineLatest([
      this.sensorDataService.getLatest(),
      this.thresholds.getAll(),
    ]).pipe(
      map(([latestData, allThresholds]) => {
        const gasConfigs: {
          key: EnvironmentMetricKey;
          field: string;
          name: string;
          symbol: string;
        }[] = [
          { key: 'co', field: 'co', name: 'Monóxido de Carbono', symbol: 'CO' },
          { key: 'no2', field: 'no2', name: 'Dióxido de Nitrógeno', symbol: 'NO₂' },
          { key: 'nh3', field: 'nh3', name: 'Amoníaco', symbol: 'NH₃' },
        ];

        return gasConfigs.map((cfg) => {
          const value =
            Math.round(((latestData?.[cfg.field as keyof typeof latestData] as number) || 0) * 10) /
            10;
          const config = allThresholds[cfg.key];
          const status = getEnvironmentStatusFromConfig(config, value);
          return {
            name: cfg.name,
            symbol: cfg.symbol,
            value,
            unit: config.unit,
            color: status.textClass,
            bgColor: status.gaugeGradient,
            status: status.label,
            maxValue: config.scaleMax,
          };
        });
      }),
      catchError((error) => {
        console.error('Error loading gas indicators:', error);
        return of([]);
      }),
      shareReplay(1),
    );
  }

  /**
   * Calculates the percentage fill value for a gauge circular visualization.
   * Clamps result to 0-100 range to prevent visual overflow beyond the circle boundary.
   * @param {number} value - Current gas concentration value
   * @param {number} max - Maximum scale value from threshold configuration
   * @returns {number} Percentage fill (0-100) for SVG stroke-dashoffset calculation
   */
  getGaugePercentage(value: number, max: number): number {
    return Math.min((value / max) * 100, 100);
  }
}
