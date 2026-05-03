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
 * GaugeData interface for temperature gauge display data.
 * @interface GaugeData
 * @property {number} temperature - Current temperature in Celsius rounded to 1 decimal place
 * @property {number} gaugePercentage - Calculated fill percentage (0-100) for SVG visualization
 * @property {string} gaugeColor - Tailwind text color class reflecting current status
 * @property {string} status - Human-readable status label (e.g., "Muy Frío", "Cómodo", "Muy Calor")
 * @property {string} bgColor - Tailwind gradient class for card background
 * @property {Array<{color: string; label: string; rangeLabel: string}>} scaleLevels - Threshold levels with color and temperature range display
 */
interface GaugeData {
  temperature: number;
  gaugePercentage: number;
  gaugeColor: string;
  status: string;
  bgColor: string;
  scaleLevels: { color: string; label: string; rangeLabel: string }[];
}

/**
 * TemperatureGaugeComponent (Presentation Component)
 *
 * Displays a full-size circular SVG gauge for real-time temperature reading with threshold-based color coding and scale visualization.
 *
 * Features:
 * - Single full-size SVG gauge (240-280px responsive size) showing current temperature in Celsius
 * - Temperature range: -10°C to 50°C with dynamic gauge fill based on threshold configuration
 * - Real-time data: combines latest sensor data with threshold configuration via combineLatest
 * - Color-coded status: retrieves text color and gradient background from environment threshold configuration
 * - Gauge percentage: calculated via getMetricGaugePercentageFromConfig, clamped to 0-100% range
 * - Scale display: horizontal color-coded legend below gauge showing all threshold levels with temperature ranges
 * - SVG structure: background circle (gray), progress circle (animated, color-coded), center text with value and unit
 * - Animations: 500ms transition on gauge fill change with smooth easing
 * - Responsive grid: 1 column mobile, maintains full width on desktop
 * - Card styling: gradient background reflecting current air quality status
 * - Error handling: falls back to default "Sin datos" state with zero gauge on service failure
 * - OnPush change detection with async pipe subscription
 *
 * Interface GaugeData:
 * - temperature: number - current temperature rounded to 1 decimal place
 * - gaugePercentage: number - calculated fill percentage for SVG stroke-dashoffset
 * - gaugeColor: string - Tailwind color class for progress circle and text
 * - status: string - label derived from threshold (e.g., "Muy Frío", "Cómodo", "Muy Calor")
 * - bgColor: string - gradient class for card background reflecting status
 * - scaleLevels: array - threshold levels with color, label, and temperature range display
 *
 * @selector app-temperature-gauge
 * @standalone true
 * @imports CommonModule
 * @example
 * <app-temperature-gauge />
 */
@Component({
  selector: 'app-temperature-gauge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './temperature-gauge.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TemperatureGaugeComponent {
  /**
   * Observable stream emitting gauge data with calculated temperature, percentage, color, and status.
   * @type {Observable<GaugeData>}
   */
  gaugeData$!: Observable<GaugeData>;

  private readonly defaultGaugeData: GaugeData = {
    temperature: 0,
    gaugePercentage: 0,
    gaugeColor: 'text-gray-500',
    status: 'Sin datos',
    bgColor: 'from-gray-500/20 to-gray-600/20',
    scaleLevels: [],
  };

  constructor(
    private sensorDataService: SensorDataService,
    private thresholds: ThresholdsService,
  ) {
    this.initializeGaugeData();
  }

  /**
   * Initializes gauge data stream from latest sensor data and threshold configuration.
   * Combines both observables, calculates gauge percentage and status from config, maps to GaugeData interface.
   * Returns default "Sin datos" state on error with console logging.
   * @private
   * @returns {void}
   */
  private initializeGaugeData(): void {
    this.gaugeData$ = combineLatest([
      this.sensorDataService.getLatest(),
      this.thresholds.getAll(),
    ]).pipe(
      map(([latestData, allThresholds]) => {
        const temperature = Math.round((latestData?.temperature || 0) * 10) / 10;
        const config = allThresholds['temperature'];
        const envStatus = getEnvironmentStatusFromConfig(config, temperature, false);
        return {
          temperature,
          gaugePercentage: getMetricGaugePercentageFromConfig(config, temperature),
          gaugeColor: envStatus.textClass,
          status: envStatus.label,
          bgColor: envStatus.gaugeGradient,
          scaleLevels: config.levels.map((l, i, arr) => ({
            color: l.color,
            label: l.label,
            rangeLabel:
              l.max === Infinity || l.max == null
                ? `>${arr[i - 1]?.max ?? 0}°C`
                : i === 0
                  ? `<${l.max}°C`
                  : `${arr[i - 1].max}–${l.max}°C`,
          })),
        };
      }),
      catchError((error) => {
        console.error('Error cargando datos de temperatura:', error);
        return of(this.defaultGaugeData);
      }),
      shareReplay(1),
    );
  }
}
