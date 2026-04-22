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
 * Interface para datos del gauge de temperatura
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
 * TemperatureGaugeComponent
 *
 * Componente que muestra indicador circular dinámico de temperatura en °C.
 * Rango de -10°C a 50°C con código de color según condiciones.
 * Obtiene datos en tiempo real del backend.
 *
 * @selector app-temperature-gauge
 * @standalone true
 * @imports CommonModule
 * @returns Indicador circular de temperatura
 *
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
   * Observable que emite datos del gauge (temperatura, porcentaje, color, estado)
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

  private initializeGaugeData(): void {
    this.gaugeData$ = combineLatest([
      this.sensorDataService.getLatest(),
      this.thresholds.getAll(),
    ]).pipe(
      map(([latestData, allThresholds]) => {
        const temperature = Math.round(((latestData as any)?.temperature || 0) * 10) / 10;
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
