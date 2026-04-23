import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, of, combineLatest } from 'rxjs';
import { map, catchError, shareReplay } from 'rxjs/operators';
import { SensorDataService } from '../../../../core/services/sensor-data.service';
import { ThresholdsService } from '../../../../core/services/thresholds.service';
import { getEnvironmentStatusFromConfig } from '../../../../core/config/environment-thresholds.config';

/**
 * Interface para indicador de partículas
 */
interface PMIndicator {
  name: string;
  symbol: string;
  value: number;
  unit: string;
  color: string;
  bgColor: string;
  maxValue: number;
  status: string;
}

/**
 * PmIndicatorsComponent
 *
 * Componente que muestra 2 indicadores circulares dinámicos para partículas:
 * PM2.5 (Partículas finas) y PM10 (Partículas gruesas).
 * Obtiene datos en tiempo real del backend.
 *
 * @selector app-pm-indicators
 * @standalone true
 * @imports CommonModule
 * @returns 2 indicadores de partículas
 *
 * @example
 * <app-pm-indicators />
 */
@Component({
  selector: 'app-pm-indicators',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pm-indicators.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PmIndicatorsComponent {
  /**
   * Observable que emite array de indicadores de partículas con valores actuales
   */
  pmIndicators$!: Observable<PMIndicator[]>;

  constructor(
    private sensorDataService: SensorDataService,
    private thresholds: ThresholdsService,
  ) {
    this.initializePMIndicators();
  }

  /**
   * Inicializa los indicadores de partículas desde el servicio,
   * reaccionando a cambios de umbrales
   */
  private initializePMIndicators(): void {
    this.pmIndicators$ = combineLatest([
      this.sensorDataService.getLatest(),
      this.thresholds.getAll(),
    ]).pipe(
      map(([latestData, allThresholds]) => {
        const pm25Config = allThresholds['pm25'];
        const pm10Config = allThresholds['pm10'];
        const pm25Value = Math.round((latestData?.pm25 || 0) * 10) / 10;
        const pm10Value = Math.round((latestData?.pm10 || 0) * 10) / 10;
        const pm25Status = getEnvironmentStatusFromConfig(pm25Config, pm25Value);
        const pm10Status = getEnvironmentStatusFromConfig(pm10Config, pm10Value);
        return [
          {
            name: 'Partículas Finas',
            symbol: 'PM2.5',
            value: pm25Value,
            unit: pm25Config.unit,
            color: pm25Status.textClass,
            bgColor: pm25Status.gaugeGradient,
            maxValue: pm25Config.scaleMax,
            status: pm25Status.label,
          },
          {
            name: 'Partículas Gruesas',
            symbol: 'PM10',
            value: pm10Value,
            unit: pm10Config.unit,
            color: pm10Status.textClass,
            bgColor: pm10Status.gaugeGradient,
            maxValue: pm10Config.scaleMax,
            status: pm10Status.label,
          },
        ];
      }),
      catchError((error) => {
        console.error('Error cargando indicadores de partículas:', error);
        return of([]);
      }),
      shareReplay(1),
    );
  }

  /**
   * Calcula el porcentaje de llenado para un gauge
   * @param {number} value - Valor actual
   * @param {number} max - Valor máximo
   * @returns {number} Porcentaje (0-100)
   */
  getGaugePercentage(value: number, max: number): number {
    return Math.min((value / max) * 100, 100);
  }
}
