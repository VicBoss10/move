import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SensorDataService } from '../../../../core/services/sensor-data.service';
import { ThresholdsService } from '../../../../core/services/thresholds.service';
import { ToastService } from '../../../../core/services/toast.service';
import {
  getEnvironmentStatusFromConfig,
  getMetricGaugePercentageFromConfig,
  EnvironmentMetricKey,
} from '../../../../core/config/environment-thresholds.config';
import { Observable, of, combineLatest } from 'rxjs';
import { SensorData } from '../../../../core/models/sensor-data.model';
import { map, catchError, shareReplay, tap, take } from 'rxjs/operators';

/**
 * GasIndicator interface for gas concentration gauge display.
 * @interface GasIndicator
 * @property {string} label - Gas name (CO2, CO, NO2, NH3)
 * @property {number} value - Current measured value
 * @property {string} unit - Unit of measurement (ppm, ppb)
 * @property {number} min - Minimum scale value
 * @property {number} max - Maximum scale value
 * @property {{good: number, moderate: number, poor: number}} threshold - Quality thresholds
 * @property {'good' | 'moderate' | 'poor' | 'critical' | 'no-data'} status - Current status
 * @property {string} statusLabel - Localized status label
 * @property {string} statusBgClass - Tailwind background color class
 * @property {string} statusTextClass - Tailwind text color class
 * @property {string} color - Hex color for visualization
 * @property {EnvironmentMetricKey} metricKey - Metric key reference
 * @property {number} gaugePercentage - Gauge fill percentage (0-100)
 */
interface GasIndicator {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  threshold: { good: number; moderate: number; poor: number };
  status: 'good' | 'moderate' | 'poor' | 'critical' | 'no-data';
  statusLabel: string;
  statusBgClass: string;
  statusTextClass: string;
  color: string;
  metricKey: EnvironmentMetricKey;
  gaugePercentage: number;
}

/**
 * GasIndicatorsComponent
 *
 * Displays four circular SVG gauge visualizations for real-time gas concentrations: CO₂, CO, NO₂, and NH₃.
 * Each gauge shows current value, measurement unit, animated stroke progress, and status badge. Connected
 * to SensorDataService for real-time data and ThresholdsService for threshold configurations.
 *
 * Features:
 * - Four SVG circular gauges with dynamic stroke-dashoffset progress animation
 * - Real-time gas values (CO₂, CO, NO₂, NH₃) with threshold-based evaluation
 * - Threshold-based color coding: green (good), yellow (moderate), orange (poor), red (critical)
 * - Gauge percentage calculation based on scale min/max and current threshold config
 * - Status legend (status-legend Observable) synchronized with current thresholds from ThresholdsService
 * - Helper methods: getPercentage, getCircumference, getStrokeDashoffset for SVG calculation
 * - Reactive data combining latest sensor data with dynamic threshold config via combineLatest
 * - Dark mode support with Tailwind dark: prefix
 * - Responsive grid layout: 2 columns mobile, 4 columns on sm and up
 * - Error handling with default empty indicators array
 * - shareReplay pattern for subscription efficiency
 * - OnPush change detection for performance
 *
 * @selector app-gas-indicators
 * @standalone true
 * @imports CommonModule
 * @example
 * <app-gas-indicators />
 */
@Component({
  selector: 'app-gas-indicators',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gas-indicators.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GasIndicatorsComponent {
  isLoading = true;

  statusLegend$: Observable<{ color: string; label: string }[]>;
  gasIndicators$!: Observable<GasIndicator[]>;
  isStale$!: Observable<boolean>;

  private readonly defaultIndicators: GasIndicator[] = [];
  private readonly ONE_HOUR_MS = 3600000;

  constructor(
    private sensorDataService: SensorDataService,
    private thresholds: ThresholdsService,
    private toastService: ToastService,
  ) {
    this.statusLegend$ = this.thresholds
      .getAll()
      .pipe(
        map((all) =>
          all['co2'].levels.map((level) => ({ color: level.color, label: level.label })),
        ),
      );

    const latestSensor$ = this.sensorDataService.getLatest().pipe(shareReplay(1));

    this.isStale$ = latestSensor$.pipe(
      map((latest) => {
        if (!latest?.timestamp) return true;
        return new Date().getTime() - new Date(latest.timestamp).getTime() > this.ONE_HOUR_MS;
      }),
      catchError(() => of(true)),
      shareReplay(1),
    );

    this.isStale$.pipe(take(1)).subscribe((stale) => {
      if (stale) {
        this.toastService.show(
          'Algunos componentes pueden mostrar información desactualizada.',
          { title: 'Sin datos recientes', variant: 'warning', timeout: 8000 },
        );
      }
    });

    this.initializeGasIndicators(latestSensor$);
  }

  private initializeGasIndicators(latestSensor$: Observable<SensorData>): void {
    this.gasIndicators$ = combineLatest([latestSensor$, this.thresholds.getAll()]).pipe(
      map(([latest, allThresholds]) => {
        const gasConfigs: { key: EnvironmentMetricKey; field: string; color: string }[] = [
          { key: 'co2', field: 'co2', color: '#10b981' },
          { key: 'co', field: 'co', color: '#f59e0b' },
          { key: 'no2', field: 'no2', color: '#ef4444' },
          { key: 'nh3', field: 'nh3', color: '#3b82f6' },
        ];

        const indicators: GasIndicator[] = gasConfigs.map((cfg) => {
          const config = allThresholds[cfg.key];
          const value = ((latest as SensorData)?.[cfg.field as keyof SensorData] as number) || 0;
          const status = getEnvironmentStatusFromConfig(config, value);
          return {
            label: config.label,
            value,
            unit: config.unit,
            min: config.scaleMin,
            max: config.scaleMax,
            threshold: {
              good: config.levels[0].max,
              moderate: config.levels[1].max,
              poor: config.levels[2].max,
            },
            status: status.key as GasIndicator['status'],
            statusLabel: status.label,
            statusBgClass: status.bgClass,
            statusTextClass: status.textClass,
            color: status.color,
            metricKey: cfg.key,
            gaugePercentage: getMetricGaugePercentageFromConfig(config, value),
          };
        });

        return indicators;
      }),
      tap(() => (this.isLoading = false)),
      catchError((error) => {
        console.error('Error loading gas indicators:', error);
        this.isLoading = false;
        return of(this.defaultIndicators);
      }),
      shareReplay(1),
    );
  }

  /**
   * Returns gauge percentage for SVG stroke-dashoffset calculation
   * @param gas Gas indicator with gauge percentage value
   * @returns Percentage value (0-100)
   */
  getPercentage(gas: GasIndicator): number {
    return gas.gaugePercentage;
  }

  /**
   * Calculates SVG circle circumference for stroke animation
   * @param radius Circle radius (default 45)
   * @returns Circumference value for stroke calculation
   */
  getCircumference(radius: number = 45): number {
    return 2 * Math.PI * radius;
  }

  /**
   * Calculates SVG stroke-dashoffset for animated gauge progress indicator
   * @param percentage Current percentage fill (0-100)
   * @param radius Circle radius (default 45)
   * @returns Stroke-dashoffset value for animation
   */
  getStrokeDashoffset(percentage: number, radius: number = 45): number {
    const circumference = 2 * Math.PI * radius;
    return circumference * (1 - Math.max(0, Math.min(100, percentage)) / 100);
  }
}
