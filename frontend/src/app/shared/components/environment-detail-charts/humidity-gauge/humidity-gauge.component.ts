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

interface GaugeData {
  humidity: number;
  gaugePercentage: number;
  gaugeColor: string;
  status: string;
  bgColor: string;
  scaleLevels: { color: string; label: string; rangeLabel: string }[];
}

@Component({
  selector: 'app-humidity-gauge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './humidity-gauge.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HumidityGaugeComponent {
  gaugeData$!: Observable<GaugeData>;

  private readonly defaultGaugeData: GaugeData = {
    humidity: 0,
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

  private initializeGaugeData(): void {
    this.gaugeData$ = combineLatest([
      this.sensorDataService.getLatest(),
      this.thresholds.getAll(),
    ]).pipe(
      map(([latestData, allThresholds]) => {
        const humidity = Math.round(((latestData as any)?.humidity || 0) * 10) / 10;
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
