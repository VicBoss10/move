import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SafeHtmlPipe } from '../../../pipe/safe-html.pipe';
import { SensorDataService } from '../../../../core/services/sensor-data.service';
import { ComponentColorUtility } from '../../../../core/utils/component-color.utility';
import { getEnvironmentStatus } from '../../../../core/config/environment-thresholds.config';
import { Observable, of } from 'rxjs';
import { map, catchError, shareReplay } from 'rxjs/operators';

interface AirQualityMetric {
  label: string;
  icon: string;
  value: number;
  unit: string;
  status: 'good' | 'moderate' | 'unhealthy';
  statusLabel: string;
}

/**
 * AirQualityCardComponent (Presentation Component)
 *
 * Displays two metric cards for air quality particle concentration indicators: PM2.5 and PM10.
 * Each card shows current measured value, measurement unit (µg/m³), and status badge with threshold-based
 * color coding. Connected to SensorDataService for real-time air quality sensor data.
 *
 * Features:
 * - Two responsive metric cards: PM2.5 and PM10 with color-coded status indicators
 * - Threshold-based status evaluation: good/moderate/unhealthy from environment thresholds config
 * - Real-time values from latest sensor reading with rounded display values
 * - Status labels and icons derived from environment thresholds configuration
 * - SVG icons embedded as strings for each particle metric
 * - ColorUtility exposed for template dynamic class binding
 * - Reactive data updates via Observable pattern with latest sensor data
 * - Dark mode support with Tailwind dark: prefix
 * - Responsive grid: 1 column mobile, 2 columns on sm and up
 * - Error handling with default metrics (PM2.5, PM10 with zero values) on service failure
 * - shareReplay pattern for subscription efficiency
 * - OnPush change detection for performance
 * - AirQualityMetric interface for type-safe metric structure
 *
 * @selector app-air-quality-card
 * @standalone true
 * @imports CommonModule, SafeHtmlPipe
 * @example
 * <app-air-quality-card />
 */
@Component({
  selector: 'app-air-quality-card',
  standalone: true,
  imports: [CommonModule, SafeHtmlPipe],
  templateUrl: './air-quality-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AirQualityCardComponent {
  /**
   * SVG icon strings for PM2.5 and PM10 metric display.
   * @type {{pm25Icon: string, pm10Icon: string}}
   * @readonly
   */
  public readonly icons = {
    pm25Icon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" fill="currentColor"/></svg>`,
    pm10Icon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="currentColor"/></svg>`,
  };

  /**
   * ColorUtility reference exposed for template dynamic class binding.
   * @type {typeof ComponentColorUtility}
   */
  ColorUtility = ComponentColorUtility;

  /**
   * Observable stream of air quality metrics (PM2.5, PM10) with current values and status.
   * @type {Observable<AirQualityMetric[]>}
   */
  metrics$!: Observable<AirQualityMetric[]>;

  /**
   * Default metric values returned when service fails or no data available.
   * @type {AirQualityMetric[]}
   * @private
   */
  private readonly defaultMetrics: AirQualityMetric[] = [
    {
      label: 'PM 2.5',
      icon: this.icons.pm25Icon,
      value: 0,
      unit: 'µg/m³',
      status: 'good',
      statusLabel: 'No data',
    },
    {
      label: 'PM 10',
      icon: this.icons.pm10Icon,
      value: 0,
      unit: 'µg/m³',
      status: 'good',
      statusLabel: 'No data',
    },
  ];

  /**
   * Initializes component with service dependencies and sets up metrics observable.
   * @param {SensorDataService} sensorDataService - Service for fetching latest sensor data
   */
  constructor(private sensorDataService: SensorDataService) {
    this.initializeMetrics();
  }

  /**
   * Initializes metrics observable from latest sensor data with threshold-based status evaluation.
   * Transforms raw sensor values into AirQualityMetric objects with status and color coding.
   * Called once in constructor to set up metrics$ Observable stream.
   * @private
   * @returns {void}
   */
  private initializeMetrics(): void {
    this.metrics$ = this.sensorDataService.getLatest().pipe(
      map((latest) => {
        const pm25 = Math.round(latest?.pm25 || 0);
        const pm10 = Math.round(latest?.pm10 || 0);

        const pm25Status = getEnvironmentStatus('pm25', pm25);
        const pm10Status = getEnvironmentStatus('pm10', pm10);

        return [
          {
            label: 'PM 2.5',
            icon: this.icons.pm25Icon,
            value: pm25,
            unit: 'µg/m³',
            status: pm25Status.key as AirQualityMetric['status'],
            statusLabel: pm25Status.label,
          },
          {
            label: 'PM 10',
            icon: this.icons.pm10Icon,
            value: pm10,
            unit: 'µg/m³',
            status: pm10Status.key as AirQualityMetric['status'],
            statusLabel: pm10Status.label,
          },
        ] as AirQualityMetric[];
      }),
      catchError((error) => {
        console.error('Error loading air quality data:', error);
        return of(this.defaultMetrics);
      }),
      shareReplay(1),
    );
  }
}
