import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, of, combineLatest } from 'rxjs';
import { map, catchError, shareReplay } from 'rxjs/operators';
import { SensorDataService } from '../../../../core/services/sensor-data.service';
import { SensorData } from '../../../../core/models/sensor-data.model';
import { ThresholdsService } from '../../../../core/services/thresholds.service';
import {
  getEnvironmentStatusFromConfig,
  getMetricGaugePercentageFromConfig,
} from '../../../../core/config/environment-thresholds.config';

/**
 * Co2GaugeComponent (Presentation Component)
 *
 * Displays current CO₂ level in a circular gauge visualization with real-time updates.
 *
 * Features:
 * - Circular SVG gauge showing CO₂ concentration as percentage of max threshold
 * - Real-time data from latest sensor reading and threshold configuration
 * - Color-coded status: Optimal (<600 ppm), Moderate (600-1000), High (1000-1500), Critical (>1500)
 * - Dynamic percentage calculation based on current thresholds via environment configuration
 * - Status label derived from threshold ranges and color mapping
 * - Quality scale legend with 4 colored levels, labels, and range indicators
 * - Reactive data stream: combineLatest of latest sensor data and threshold changes
 * - OnPush change detection with async pipe for subscription
 * - Fallback: displays zero-state on data load error
 *
 * @selector app-co2-gauge
 * @standalone true
 * @imports CommonModule
 * @example
 * <app-co2-gauge />
 */
@Component({
  selector: 'app-co2-gauge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './co2-gauge.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Co2GaugeComponent {
  /**
   * Observable stream of aggregated gauge data with CO₂ value, percentage, color, and scale levels.
   * @type {Observable<{co2Value: number; gaugePercentage: number; gaugeColor: string; status: string; bgColor: string; scaleLevels: Array<{color: string; label: string; rangeLabel: string}>}>}
   */
  gaugeData$!: Observable<{
    co2Value: number;
    gaugePercentage: number;
    gaugeColor: string;
    status: string;
    bgColor: string;
    scaleLevels: { color: string; label: string; rangeLabel: string }[];
  }>;

  /**
   * Initializes component with service dependencies and sets up data streams.
   * Triggers initialization of gauge data observable combining latest sensor data and thresholds.
   * @param {SensorDataService} sensorDataService - Service for querying current CO₂ sensor data
   * @param {ThresholdsService} thresholds - Service for accessing threshold configuration
   */
  constructor(
    private sensorDataService: SensorDataService,
    private thresholds: ThresholdsService,
  ) {
    this.initializeGaugeData();
  }

  /**
   * Combines latest sensor data and threshold configuration to produce gauge rendering data.
   * Calculates gauge percentage and status from current CO₂ value and environment threshold config.
   * Maps threshold levels to scale legend with color, label, and computed range indicators.
   * Returns zero-state on data load error for graceful fallback.
   * @private
   * @returns {void}
   */
  private initializeGaugeData(): void {
    this.gaugeData$ = combineLatest([
      this.sensorDataService.getLatest(),
      this.thresholds.getAll(),
    ]).pipe(
      map(([latestData, allThresholds]) => {
        const co2Value = (latestData as SensorData)?.co2 || 0;
        const config = allThresholds['co2'];
        const envStatus = getEnvironmentStatusFromConfig(config, co2Value, false);
        return {
          co2Value,
          gaugePercentage: getMetricGaugePercentageFromConfig(config, co2Value),
          gaugeColor: envStatus.textClass,
          status: envStatus.label,
          bgColor: envStatus.gaugeGradient,
          scaleLevels: config.levels.map((l, i, arr) => ({
            color: l.color,
            label: l.label,
            rangeLabel:
              l.max === Infinity || l.max == null
                ? `>${arr[i - 1]?.max ?? 0}`
                : i === 0
                  ? `<${l.max}`
                  : `${arr[i - 1].max}–${l.max}`,
          })),
        };
      }),
      catchError((error) => {
        console.error('Error cargando datos de CO₂:', error);
        return of({
          co2Value: 0,
          gaugePercentage: 0,
          gaugeColor: 'text-gray-500 dark:text-gray-400',
          status: 'Sin datos',
          bgColor: 'from-gray-500/20 to-gray-600/20',
          scaleLevels: [],
        });
      }),
      shareReplay(1),
    );
  }
}
