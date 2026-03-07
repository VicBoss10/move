import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, of } from 'rxjs';
import { map, catchError, shareReplay } from 'rxjs/operators';
import { SensorDataService } from '../../../../core/services/sensor-data.service';
import { getEnvironmentStatus } from '../../../../core/config/environment-thresholds.config';

interface GaugeData {
  humidity: number;
  gaugePercentage: number;
  gaugeColor: string;
  status: string;
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
  };

  constructor(private sensorDataService: SensorDataService) {
    this.initializeGaugeData();
  }

  private initializeGaugeData(): void {
    this.gaugeData$ = this.sensorDataService.getLatest().pipe(
      map((latestData: any) => {
        const humidity = Math.round((latestData?.humidity || 0) * 10) / 10;
        const status = getEnvironmentStatus('humidity', humidity, false);
        return {
          humidity,
          gaugePercentage: humidity,
          gaugeColor: status.textClass,
          status: status.label,
        };
      }),
      catchError((error) => {
        console.error('Error cargando datos de humedad:', error);
        return of(this.defaultGaugeData);
      }),
      shareReplay(1)
    );
  }

  getGaugeBgColor(humidity: number): string {
    if (humidity < 30) return 'from-blue-500/10 to-blue-600/10';
    if (humidity < 60) return 'from-green-500/10 to-green-600/10';
    if (humidity < 80) return 'from-yellow-500/10 to-yellow-600/10';
    return 'from-orange-500/10 to-orange-600/10';
  }
}
