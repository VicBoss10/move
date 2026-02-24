import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, of } from 'rxjs';
import { map, catchError, shareReplay } from 'rxjs/operators';
import { SensorDataService } from '../../../../core/services/sensor-data.service';

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
          status: this.getStatusPM(latestData?.pm25, 'PM25'),
        },
        {
          ...this.defaultIndicators[1],
          value: Math.round((latestData?.pm10 || 0) * 10) / 10,
          status: this.getStatusPM(latestData?.pm10, 'PM10'),
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
   * Determina el estado de una partícula basado en su valor
   */
  private getStatusPM(value: number, type: string): string {
    if (!value) return 'Normal';

    // Thresholds para calidad del aire
    if (type === 'PM25') {
      if (value > 55.5) return 'Muy Malo';
      if (value > 35.5) return 'Malo';
      if (value > 12.1) return 'Moderado';
      if (value > 0) return 'Bueno';
    } else if (type === 'PM10') {
      if (value > 154) return 'Muy Malo';
      if (value > 154) return 'Malo';
      if (value > 35) return 'Moderado';
      if (value > 0) return 'Bueno';
    }
    return 'Normal';
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
