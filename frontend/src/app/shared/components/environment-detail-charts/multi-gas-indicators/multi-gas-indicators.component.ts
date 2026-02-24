import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, of } from 'rxjs';
import { map, catchError, shareReplay } from 'rxjs/operators';
import { SensorDataService } from '../../../../core/services/sensor-data.service';

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

  private readonly defaultIndicators: GasIndicator[] = [
    {
      name: 'Monóxido de Carbono',
      symbol: 'CO',
      value: 0,
      unit: 'ppm',
      color: 'text-purple-500',
      bgColor: 'from-purple-500/20 to-purple-600/20',
      status: 'Normal',
    },
    {
      name: 'Dióxido de Nitrógeno',
      symbol: 'NO₂',
      value: 0,
      unit: 'µg/m³',
      color: 'text-amber-500',
      bgColor: 'from-amber-500/20 to-amber-600/20',
      status: 'Normal',
    },
    {
      name: 'Amoníaco',
      symbol: 'NH₃',
      value: 0,
      unit: 'ppb',
      color: 'text-cyan-500',
      bgColor: 'from-cyan-500/20 to-cyan-600/20',
      status: 'Normal',
    },
  ];

  constructor(private sensorDataService: SensorDataService) {
    this.initializeGasIndicators();
  }

  /**
   * Inicializa los indicadores de gases desde el servicio
   */
  private initializeGasIndicators(): void {
    this.gasIndicators$ = this.sensorDataService.getLatest().pipe(
      map((latestData: any) => [
        {
          ...this.defaultIndicators[0],
          value: Math.round((latestData?.co || 0) * 10) / 10,
          status: this.getGasStatus('CO', latestData?.co),
        },
        {
          ...this.defaultIndicators[1],
          value: Math.round(latestData?.no2 || 0),
          status: this.getGasStatus('NO2', latestData?.no2),
        },
        {
          ...this.defaultIndicators[2],
          value: Math.round((latestData?.nh3 || 0) * 10) / 10,
          status: this.getGasStatus('NH3', latestData?.nh3),
        },
      ]),
      catchError((error) => {
        console.error('Error cargando indicadores de gases:', error);
        return of(this.defaultIndicators);
      }),
      shareReplay(1)
    );
  }

  /**
   * Determina el estado de un gas basado en su valor
   */
  private getGasStatus(gasType: string, value: number): string {
    if (!value) return 'Normal';

    // Thresholds aproximados para cada gas
    switch (gasType) {
      case 'CO':
        return value > 2 ? 'Elevado' : value > 1 ? 'Moderado' : 'Bajo';
      case 'NO2':
        return value > 100 ? 'Elevado' : value > 50 ? 'Moderado' : 'Bajo';
      case 'NH3':
        return value > 15 ? 'Elevado' : value > 10 ? 'Moderado' : 'Bajo';
      default:
        return 'Normal';
    }
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
