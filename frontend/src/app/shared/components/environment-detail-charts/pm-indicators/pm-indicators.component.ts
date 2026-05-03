import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, of, combineLatest } from 'rxjs';
import { map, catchError, shareReplay } from 'rxjs/operators';
import { SensorDataService } from '../../../../core/services/sensor-data.service';
import { ThresholdsService } from '../../../../core/services/thresholds.service';
import { getEnvironmentStatusFromConfig } from '../../../../core/config/environment-thresholds.config';

/**
 * PMIndicator aggregation model for particle gauge display.
 * @interface PMIndicator
 */
interface PMIndicator {
  name: string;
  symbol: string;
  value: number;
  unit: string;
  color: string;
  bgColor: string;
  maxValue: number;
  status: string;
}

/**
 * PmIndicatorsComponent (Presentation Component)
 *
 * Displays two circular gauge visualizations for PM2.5 (fine particles) and PM10 (coarse particles) with real-time updates.
 *
 * Features:
 * - Two full-size SVG circular gauges showing current particle concentrations
 * - Real-time data from latest sensor reading and threshold configuration
 * - Color-coded status derived from threshold ranges and color mapping
 * - PM2.5 (fine particles) and PM10 (coarse particles) with µg/m³ unit
 * - Status label beneath each gauge with color-coded text
 * - Reactive data stream: combineLatest of latest sensor data and threshold changes
 * - OnPush change detection with async pipe for subscription
 * - Responsive grid layout: 1 column mobile, 2 columns desktop
 * - Gauge percentage clamped to 0-100% for overflow protection
 * - Gradient background containers reflecting current air quality status
 * - Fallback: displays empty state on data load error
 *
 * @selector app-pm-indicators
 * @standalone true
 * @imports CommonModule
 * @example
 * <app-pm-indicators />
 */
@Component({
  selector: 'app-pm-indicators',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pm-indicators.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PmIndicatorsComponent {
  /**
   * Observable stream of calculated PM indicators with current values, units, colors, and status labels.
   * @type {Observable<PMIndicator[]>}
   */
  pmIndicators$!: Observable<PMIndicator[]>;

  /**
   * Initializes component with service dependencies and sets up PM indicators observable.
   * Triggers initialization combining latest sensor data and threshold configuration.
   * @param {SensorDataService} sensorDataService - Service for querying latest particle sensor data
   * @param {ThresholdsService} thresholds - Service for accessing threshold configuration for PM metrics
   */
  constructor(
    private sensorDataService: SensorDataService,
    private thresholds: ThresholdsService,
  ) {
    this.initializePMIndicators();
  }

  /**
   * Combines latest sensor data and threshold configuration to produce gauge rendering data for two PM types.
   * Maps PM2.5 and PM10 configurations to indicator objects with values rounded to 1 decimal place.
   * Calculates status and color from threshold ranges; returns empty array on error for graceful fallback.
   * @private
   * @returns {void}
   */
  private initializePMIndicators(): void {
    this.pmIndicators$ = combineLatest([
      this.sensorDataService.getLatest(),
      this.thresholds.getAll(),
    ]).pipe(
      map(([latestData, allThresholds]) => {
        const pm25Config = allThresholds['pm25'];
        const pm10Config = allThresholds['pm10'];
        const pm25Value = Math.round((latestData?.pm25 || 0) * 10) / 10;
        const pm10Value = Math.round((latestData?.pm10 || 0) * 10) / 10;
        const pm25Status = getEnvironmentStatusFromConfig(pm25Config, pm25Value);
        const pm10Status = getEnvironmentStatusFromConfig(pm10Config, pm10Value);
        return [
          {
            name: 'Partículas Finas',
            symbol: 'PM2.5',
            value: pm25Value,
            unit: pm25Config.unit,
            color: pm25Status.textClass,
            bgColor: pm25Status.gaugeGradient,
            maxValue: pm25Config.scaleMax,
            status: pm25Status.label,
          },
          {
            name: 'Partículas Gruesas',
            symbol: 'PM10',
            value: pm10Value,
            unit: pm10Config.unit,
            color: pm10Status.textClass,
            bgColor: pm10Status.gaugeGradient,
            maxValue: pm10Config.scaleMax,
            status: pm10Status.label,
          },
        ];
      }),
      catchError((error) => {
        console.error('Error loading particle indicators:', error);
        return of([]);
      }),
      shareReplay(1),
    );
  }

  /**
   * Calculates the percentage fill value for a gauge circular visualization.
   * Clamps result to 0-100 range to prevent visual overflow beyond the circle boundary.
   * @param {number} value - Current particle concentration value
   * @param {number} max - Maximum scale value from threshold configuration
   * @returns {number} Percentage fill (0-100) for SVG stroke-dashoffset calculation
   */
  getGaugePercentage(value: number, max: number): number {
    return Math.min((value / max) * 100, 100);
  }
}
