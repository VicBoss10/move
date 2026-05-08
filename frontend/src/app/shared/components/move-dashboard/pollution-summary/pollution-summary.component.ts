import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SensorDataService } from '../../../../core/services/sensor-data.service';
import { SensorData } from '../../../../core/models/sensor-data.model';
import {
  ENV_THRESHOLDS,
  getEnvironmentStatus,
  EnvironmentMetricKey,
} from '../../../../core/config/environment-thresholds.config';
import { Observable, of } from 'rxjs';
import { map, catchError, shareReplay, tap } from 'rxjs/operators';

/**
 * PollutantRow interface for pollution summary table data.
 * @interface PollutantRow
 * @property {string} name - Pollutant name (CO2, PM 2.5, PM 10, etc)
 * @property {number} current - Current measured value
 * @property {string} unit - Unit of measurement (ppm, µg/m³, ppb)
 * @property {number} average - Daily average value
 * @property {number} min - Minimum value recorded today
 * @property {number} max - Maximum value recorded today
 * @property {string} statusKey - Status key (good/moderate/poor)
 * @property {string} statusLabel - Localized status label
 * @property {string} statusBgClass - Tailwind background color class
 * @property {string} statusTextClass - Tailwind text color class
 */
interface PollutantRow {
  name: string;
  current: number;
  unit: string;
  average: number;
  min: number;
  max: number;
  statusKey: string;
  statusLabel: string;
  statusBgClass: string;
  statusTextClass: string;
}

/**
 * PollutionSummaryComponent
 *
 * Displays a responsive table of monitored pollutant statistics with daily analytics.
 * Shows current value, average, min, max, and status badge for five pollutants: CO₂, PM2.5, PM10, CO, NO₂.
 * Connected to SensorDataService for real-time backend data filtered to today's records only.
 *
 * Features:
 * - Table with five rows: CO₂ (ppm), PM2.5 (µg/m³), PM10 (µg/m³), CO (ppm), NO₂ (ppm)
 * - Per-pollutant statistics: current value, daily average, min/max recorded values
 * - Status badges: threshold-based color coding (good/moderate/poor) with label text
 * - Trend indicators (↑↓→) showing current vs average comparison with color coding
 * - Daily data filtering: includes only data from 00:00 to current time
 * - Reactive data from SensorDataService with combineLatest or sequential loading
 * - Dark mode support with Tailwind dark: prefix
 * - Responsive table with horizontal scrolling on mobile, full-width on desktop
 * - Error handling with empty table fallback
 * - shareReplay pattern for subscription efficiency
 * - OnPush change detection for performance
 * - Helper methods: getTrendIcon, getTrendColor for dynamic trend visualization
 *
 * @selector app-pollution-summary
 * @standalone true
 * @imports CommonModule
 * @example
 * <app-pollution-summary />
 */
@Component({
  selector: 'app-pollution-summary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pollution-summary.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PollutionSummaryComponent {
  isLoading = true;

  /**
   * Observable emitting array of pollutant rows with daily statistics and status badges
   */
  pollutionData$!: Observable<PollutantRow[]>;

  /**
   * Default empty pollutant data array for error fallback
   * @private
   */
  private readonly defaultPollutionData: PollutantRow[] = [];

  constructor(private sensorDataService: SensorDataService) {
    this.initializePollutionData();
  }

  /**
   * Initializes pollution data observable filtering today's sensor data and computing statistics.
   * @private
   * @returns {void}
   */
  private initializePollutionData(): void {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

    this.pollutionData$ = this.sensorDataService.getAll().pipe(
      map((data: SensorData[]) => {
        if (!data || data.length === 0) {
          return this.defaultPollutionData;
        }

        const todayData = data.filter((d) => {
          const dDate = new Date(d.timestamp);
          return dDate >= todayStart && dDate <= now;
        });

        if (todayData.length === 0) {
          return this.defaultPollutionData;
        }

        const pollutantConfigs: { key: EnvironmentMetricKey; field: string }[] = [
          { key: 'co2', field: 'co2' },
          { key: 'pm25', field: 'pm25' },
          { key: 'pm10', field: 'pm10' },
          { key: 'co', field: 'co' },
          { key: 'no2', field: 'no2' },
        ];

        return pollutantConfigs.map((cfg) => {
          const config = ENV_THRESHOLDS[cfg.key];
          const values = todayData
            .map((d: SensorData) => d[cfg.field as keyof SensorData] as number | null)
            .filter((v): v is number => v != null);
          const current = values[values.length - 1] ?? 0;
          const average =
            values.length > 0
              ? values.reduce((a: number, b: number) => a + b, 0) / values.length
              : 0;
          const min = values.length > 0 ? Math.min(...values) : 0;
          const max = values.length > 0 ? Math.max(...values) : 0;
          const status = getEnvironmentStatus(cfg.key, current);

          return {
            name: config.label,
            unit: config.unit,
            current,
            average,
            min,
            max,
            statusKey: status.key,
            statusLabel: status.label,
            statusBgClass: status.bgClass,
            statusTextClass: status.textClass,
          };
        });
      }),
      tap(() => (this.isLoading = false)),
      catchError((error) => {
        console.error('Error loading pollution summary:', error);
        this.isLoading = false;
        return of(this.defaultPollutionData);
      }),
      shareReplay(1),
    );
  }

  /**
   * Returns trend icon comparing current value to average.
   * Up arrow (↑) if above average, down arrow (↓) if below, horizontal (→) if equal.
   * @param {number} current - Current measured value
   * @param {number} average - Daily average value
   * @returns {string} Trend icon string
   */
  getTrendIcon(current: number, average: number): string {
    if (current > average) return '↑';
    if (current < average) return '↓';
    return '→';
  }

  /**
   * Returns Tailwind CSS color classes for trend indicator.
   * Red for above average, green for below average, gray for equal.
   * @param {number} current - Current measured value
   * @param {number} average - Daily average value
   * @returns {string} Tailwind CSS color classes
   */
  getTrendColor(current: number, average: number): string {
    if (current > average) return 'text-red-600 dark:text-red-400';
    if (current < average) return 'text-green-600 dark:text-green-400';
    return 'text-gray-600 dark:text-gray-400';
  }
}
