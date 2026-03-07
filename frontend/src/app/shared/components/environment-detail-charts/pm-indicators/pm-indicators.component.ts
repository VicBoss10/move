import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, of } from 'rxjs';
import { map, catchError, shareReplay } from 'rxjs/operators';
import { SensorDataService } from '../../../../core/services/sensor-data.service';
import { getEnvironmentStatus } from '../../../../core/config/environment-thresholds.config';

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

  private readonly defaultIndicators: PMIndicator[] = [
    {
      name: 'Partículas Finas',
      symbol: 'PM2.5',
      value: 0,
      unit: 'µg/m³',
      color: 'text-indigo-500',
      bgColor: 'from-indigo-500/20 to-indigo-600/20',
      maxValue: 100,
      status: 'Normal',
    },
    {
      name: 'Partículas Gruesas',
      symbol: 'PM10',
      value: 0,
      unit: 'µg/m³',
      color: 'text-orange-500',
      bgColor: 'from-orange-500/20 to-orange-600/20',
      maxValue: 150,
      status: 'Normal',
    },
  ];

  constructor(private sensorDataService: SensorDataService) {
    this.initializePMIndicators();
  }

  /**
   * Inicializa los indicadores de partículas desde el servicio
   */
  private initializePMIndicators(): void {
    this.pmIndicators$ = this.sensorDataService.getLatest().pipe(
      map((latestData: any) => [
        {
          ...this.defaultIndicators[0],
          value: Math.round((latestData?.pm25 || 0) * 10) / 10,
          status: getEnvironmentStatus('pm25', latestData?.pm25).label,
        },
        {
          ...this.defaultIndicators[1],
          value: Math.round((latestData?.pm10 || 0) * 10) / 10,
          status: getEnvironmentStatus('pm10', latestData?.pm10).label,
        },
      ]),
      catchError((error) => {
        console.error('Error cargando indicadores de partículas:', error);
        return of(this.defaultIndicators);
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
