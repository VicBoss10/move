import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, of, combineLatest } from 'rxjs';
import { map, catchError, shareReplay } from 'rxjs/operators';
import { SensorDataService } from '../../../../core/services/sensor-data.service';
import { ThresholdsService } from '../../../../core/services/thresholds.service';
import {
  getEnvironmentStatusFromConfig,
  getMetricGaugePercentageFromConfig,
} from '../../../../core/config/environment-thresholds.config';

/**
 * GaugeData aggregation model for humidity gauge display.
 * @interface GaugeData
 */
interface GaugeData {
  humidity: number;
  gaugePercentage: number;
  gaugeColor: string;
  status: string;
  bgColor: string;
  scaleLevels: { color: string; label: string; rangeLabel: string }[];
}

/**
 * HumidityGaugeComponent (Presentation Component)
 *
 * Displays current humidity level in a circular gauge visualization with real-time updates.
 *
 * Features:
 * - Circular SVG gauge showing humidity as percentage fill (0-100%)
 * - Real-time data from latest sensor reading and threshold configuration
 * - Color-coded status derived from threshold ranges and color mapping
 * - Status label and quality scale legend with 4 colored levels, labels, and range indicators
 * - Responsive sizing: 48x48 on mobile, 56x56 on larger screens
 * - Reactive data stream: combineLatest of latest sensor data and threshold changes
 * - OnPush change detection with async pipe for subscription
 * - Fallback: displays zero-state on data load error
 *
 * @selector app-humidity-gauge
 * @standalone true
 * @imports CommonModule
 * @example
 * <app-humidity-gauge />
 */
@Component({
  selector: 'app-humidity-gauge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './humidity-gauge.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HumidityGaugeComponent {
  /**
   * Observable stream of aggregated gauge data with humidity value, percentage, color, and scale levels.
   * @type {Observable<GaugeData>}
   */
  gaugeData$!: Observable<GaugeData>;

  /**
   * Default zero-state gauge data returned on error.
   * @type {GaugeData}
   * @private
   */
  private readonly defaultGaugeData: GaugeData = {
    humidity: 0,
    gaugePercentage: 0,
    gaugeColor: 'text-gray-500',
    status: 'Sin datos',
    bgColor: 'from-gray-500/20 to-gray-600/20',
    scaleLevels: [],
  };

  /**
   * Initializes component with service dependencies and sets up data streams.
   * Triggers initialization of gauge data observable combining latest sensor data and thresholds.
   * @param {SensorDataService} sensorDataService - Service for querying current humidity sensor data
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
   * Calculates gauge percentage and status from current humidity value and environment threshold config.
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
        const humidity = Math.round((latestData?.humidity || 0) * 10) / 10;
        const config = allThresholds['humidity'];
        const envStatus = getEnvironmentStatusFromConfig(config, humidity, false);
        return {
          humidity,
          gaugePercentage: getMetricGaugePercentageFromConfig(config, humidity),
          gaugeColor: envStatus.textClass,
          status: envStatus.label,
          bgColor: envStatus.gaugeGradient,
          scaleLevels: config.levels.map((l, i, arr) => ({
            color: l.color,
            label: l.label,
            rangeLabel:
              l.max === Infinity || l.max == null
                ? `>${arr[i - 1]?.max ?? 0}%`
                : i === 0
                  ? `<${l.max}%`
                  : `${arr[i - 1].max}–${l.max}%`,
          })),
        };
      }),
      catchError((error) => {
        console.error('Error cargando datos de humedad:', error);
        return of(this.defaultGaugeData);
      }),
      shareReplay(1),
    );
  }
}
