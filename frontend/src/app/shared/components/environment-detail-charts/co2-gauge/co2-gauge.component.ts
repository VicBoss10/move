import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, of, combineLatest } from 'rxjs';
import { map, catchError, shareReplay } from 'rxjs/operators';
import { SensorDataService } from '../../../../core/services/sensor-data.service';
import { ThresholdsService } from '../../../../core/services/thresholds.service';
import { getEnvironmentStatusFromConfig, getMetricGaugePercentageFromConfig } from '../../../../core/config/environment-thresholds.config';

/**
 * Co2GaugeComponent
 *
 * Componente dinámico que muestra el nivel de CO₂ actual en un indicador circular (gauge).
 * Obtiene datos en tiempo real del backend usando SensorDataService.
 * Código de color según rango: Óptimo (<600), Moderado (600-1000), Elevado (1000-1500), Crítico (>1500)
 *
 * @selector app-co2-gauge
 * @standalone true
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
   * Observable que emite los datos actuales del gauge de CO₂
   */
  gaugeData$!: Observable<{
    co2Value: number;
    gaugePercentage: number;
    gaugeColor: string;
    status: string;
    bgColor: string;
    scaleLevels: { color: string; label: string; rangeLabel: string }[];
  }>;

  constructor(private sensorDataService: SensorDataService, private thresholds: ThresholdsService) {
    this.initializeGaugeData();
  }

  /**
   * Inicializa los datos del gauge desde el servicio, reaccionando a cambios de umbrales
   */
  private initializeGaugeData(): void {
    this.gaugeData$ = combineLatest([
      this.sensorDataService.getLatest(),
      this.thresholds.getAll(),
    ]).pipe(
      map(([latestData, allThresholds]) => {
        const co2Value = (latestData as any)?.co2 || 0;
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
            rangeLabel: (l.max === Infinity || l.max == null)
              ? `>${arr[i - 1]?.max ?? 0}`
              : (i === 0 ? `<${l.max}` : `${arr[i - 1].max}–${l.max}`),
          })),
        };
      }),
      catchError((error) => {
        console.error('Error cargando datos de CO₂:', error);
        return of({ co2Value: 0, gaugePercentage: 0, gaugeColor: 'text-gray-500 dark:text-gray-400', status: 'Sin datos', bgColor: 'from-gray-500/20 to-gray-600/20', scaleLevels: [] });
      }),
      shareReplay(1)
    );
  }
}
