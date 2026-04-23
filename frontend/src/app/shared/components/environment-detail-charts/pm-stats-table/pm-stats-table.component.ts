import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, of } from 'rxjs';
import { map, catchError, shareReplay } from 'rxjs/operators';
import { SensorDataService } from '../../../../core/services/sensor-data.service';
import { SensorData } from '../../../../core/models/sensor-data.model';

/**
 * Interface para estadísticas de partículas
 */
interface PMStats {
  symbol: string;
  name: string;
  actual: number;
  minimo: number;
  maximo: number;
  promedio: number;
  variacion: number;
  unit: string;
}

/**
 * PmStatsTableComponent
 *
 * Componente que muestra tabla con estadísticas dinámicas de PM2.5 y PM10.
 * Obtiene datos en tiempo real del backend.
 *
 * @selector app-pm-stats-table
 * @standalone true
 * @imports CommonModule
 * @returns Tabla con estadísticas de partículas
 *
 * @example
 * <app-pm-stats-table />
 */
@Component({
  selector: 'app-pm-stats-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pm-stats-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PmStatsTableComponent {
  /**
   * Observable que emite estadísticas de partículas
   */
  pmStats$!: Observable<PMStats[]>;

  private readonly defaultStats: PMStats[] = [
    {
      symbol: 'PM2.5',
      name: 'Partículas Finas',
      actual: 0,
      minimo: 0,
      maximo: 0,
      promedio: 0,
      variacion: 0,
      unit: 'µg/m³',
    },
    {
      symbol: 'PM10',
      name: 'Partículas Gruesas',
      actual: 0,
      minimo: 0,
      maximo: 0,
      promedio: 0,
      variacion: 0,
      unit: 'µg/m³',
    },
  ];

  constructor(private sensorDataService: SensorDataService) {
    this.initializePMStats();
  }

  /**
   * Inicializa estadísticas de partículas desde el servicio
   */
  private initializePMStats(): void {
    this.pmStats$ = this.sensorDataService.getAll().pipe(
      map((sensorData: SensorData[]) => {
        if (!sensorData || sensorData.length === 0) {
          return this.defaultStats;
        }

        // Extraer valores de cada partícula
        const pm25Values = sensorData.map((d) => d.pm25 || 0);
        const pm10Values = sensorData.map((d) => d.pm10 || 0);

        return [
          {
            ...this.defaultStats[0],
            actual: this.getLatestValue(pm25Values),
            minimo: Math.min(...pm25Values),
            maximo: Math.max(...pm25Values),
            promedio: this.calculateAverage(pm25Values),
            variacion: this.calculateVariation(pm25Values),
          },
          {
            ...this.defaultStats[1],
            actual: this.getLatestValue(pm10Values),
            minimo: Math.min(...pm10Values),
            maximo: Math.max(...pm10Values),
            promedio: this.calculateAverage(pm10Values),
            variacion: this.calculateVariation(pm10Values),
          },
        ];
      }),
      catchError((error) => {
        console.error('Error cargando estadísticas de partículas:', error);
        return of(this.defaultStats);
      }),
      shareReplay(1),
    );
  }

  /**
   * Obtiene el último valor de un array
   */
  private getLatestValue(values: number[]): number {
    return values.length > 0 ? values[values.length - 1] : 0;
  }

  /**
   * Calcula el promedio de un array
   */
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    const sum = values.reduce((acc, val) => acc + val, 0);
    return Math.round((sum / values.length) * 10) / 10;
  }

  /**
   * Calcula la variación porcentual
   */
  private calculateVariation(values: number[]): number {
    if (values.length < 2) return 0;
    const latest = values[values.length - 1];
    const previous = values[values.length - 2];
    if (previous === 0) return 0;
    const variation = ((latest - previous) / previous) * 100;
    return Math.round(Math.abs(variation) * 10) / 10;
  }

  /**
   * Obtiene clase de color para la variación
   */
  getVariationColor(variacion: number): string {
    if (variacion > 5) return 'text-red-600 dark:text-red-400';
    if (variacion > 2) return 'text-orange-600 dark:text-orange-400';
    return 'text-green-600 dark:text-green-400';
  }
}
