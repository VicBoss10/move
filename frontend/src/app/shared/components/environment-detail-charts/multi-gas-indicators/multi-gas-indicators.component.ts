import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, of, combineLatest } from 'rxjs';
import { map, catchError, shareReplay } from 'rxjs/operators';
import { SensorDataService } from '../../../../core/services/sensor-data.service';
import { ThresholdsService } from '../../../../core/services/thresholds.service';
import { getEnvironmentStatusFromConfig, getMetricGaugePercentageFromConfig, EnvironmentMetricKey } from '../../../../core/config/environment-thresholds.config';

/**
 * Interface para un indicador de gas
 */
interface GasIndicator {
  name: string;
  symbol: string;
  value: number;
  unit: string;
  color: string;
  bgColor: string;
  status: string;
  maxValue: number;
}

/**
 * MultiGasIndicatorsComponent
 *
 * Componente que muestra 3 indicadores circulares lado a lado para gases:
 * CO, NO₂, NH₃. Cada gauge muestra el nivel actual dinámico del backend.
 *
 * @selector app-multi-gas-indicators
 * @standalone true
 * @imports CommonModule
 * @returns 4 indicadores de gases
 *
 * @example
 * <app-multi-gas-indicators />
 */
@Component({
  selector: 'app-multi-gas-indicators',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './multi-gas-indicators.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MultiGasIndicatorsComponent {
  /**
   * Observable que emite array de indicadores de gases con valores actuales
   */
  gasIndicators$!: Observable<GasIndicator[]>;

  constructor(private sensorDataService: SensorDataService, private thresholds: ThresholdsService) {
    this.initializeGasIndicators();
  }

  /**
   * Inicializa los indicadores de gases desde el servicio,
   * reaccionando a cambios de umbrales
   */
  private initializeGasIndicators(): void {
    this.gasIndicators$ = combineLatest([
      this.sensorDataService.getLatest(),
      this.thresholds.getAll(),
    ]).pipe(
      map(([latestData, allThresholds]) => {
        const gasConfigs: { key: EnvironmentMetricKey; field: string; name: string; symbol: string }[] = [
          { key: 'co',  field: 'co',  name: 'Monóxido de Carbono', symbol: 'CO' },
          { key: 'no2', field: 'no2', name: 'Dióxido de Nitrógeno', symbol: 'NO₂' },
          { key: 'nh3', field: 'nh3', name: 'Amoníaco', symbol: 'NH₃' },
        ];

        return gasConfigs.map(cfg => {
          const value = Math.round(((latestData as any)?.[cfg.field] || 0) * 10) / 10;
          const config = allThresholds[cfg.key];
          const status = getEnvironmentStatusFromConfig(config, value);
          return {
            name: cfg.name,
            symbol: cfg.symbol,
            value,
            unit: config.unit,
            color: status.textClass,
            bgColor: status.gaugeGradient,
            status: status.label,
            maxValue: config.scaleMax,
          };
        });
      }),
      catchError((error) => {
        console.error('Error cargando indicadores de gases:', error);
        return of([]);
      }),
      shareReplay(1)
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
