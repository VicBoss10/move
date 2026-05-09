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
import { map, catchError, shareReplay } from 'rxjs/operators';

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

@Component({
  selector: 'app-pollution-summary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pollution-summary.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PollutionSummaryComponent {
  pollutionData$: Observable<PollutantRow[]>;

  private readonly defaultPollutionData: PollutantRow[] = [];

  constructor(private sensorDataService: SensorDataService) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

    const pollutionSource$ = this.sensorDataService.getAll().pipe(
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
      catchError((error) => {
        console.error('Error loading pollution summary:', error);
        return of(this.defaultPollutionData);
      }),
      shareReplay(1),
    );

    this.pollutionData$ = pollutionSource$;
  }

  getTrendIcon(current: number, average: number): string {
    if (current > average) return '↑';
    if (current < average) return '↓';
    return '→';
  }

  getTrendColor(current: number, average: number): string {
    if (current > average) return 'text-red-600 dark:text-red-400';
    if (current < average) return 'text-green-600 dark:text-green-400';
    return 'text-gray-600 dark:text-gray-400';
  }
}
