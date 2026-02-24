import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, of } from 'rxjs';
import { map, catchError, shareReplay } from 'rxjs/operators';
import { SensorDataService } from '../../../../core/services/sensor-data.service';

/**
 * Interface para estadísticas de humedad
 */
interface HumidityStats {
  actual: number;
  minimo: number;
  maximo: number;
  promedio: number;
  variacion: number;
}

/**
 * HumidityStatsTableComponent
 *
 * Componente que muestra tabla de estadísticas dinámicas de humedad relativa.
 * Incluye actual, mínimo, máximo, promedio y variación en %.
 * Obtiene datos en tiempo real del backend.
 *
 * @selector app-humidity-stats-table
 * @standalone true
 * @imports CommonModule
 * @returns Tabla con estadísticas de humedad
 *
 * @example
 * <app-humidity-stats-table />
 */
@Component({
  selector: 'app-humidity-stats-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './humidity-stats-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HumidityStatsTableComponent {
  /**
   * Observable que emite estadísticas de humedad
   */
  stats$!: Observable<HumidityStats>;

  private readonly defaultStats: HumidityStats = {
    actual: 0,
    minimo: 0,
    maximo: 0,
    promedio: 0,
    variacion: 0,
  };

  constructor(private sensorDataService: SensorDataService) {
    this.initializeStats();
  }

  /**
   * Inicializa estadísticas de humedad desde el servicio
   */
  private initializeStats(): void {
    this.stats$ = this.sensorDataService.getAll().pipe(
      map((sensorData: any[]) => {
        if (!sensorData || sensorData.length === 0) {
          return this.defaultStats;
        }

        // Extraer valores de humedad
        const humidityValues = sensorData.map((d) => d.humidity || 0);

        const actual = this.getLatestValue(humidityValues);
        const minimo = Math.min(...humidityValues);
        const maximo = Math.max(...humidityValues);
        const promedio = this.calculateAverage(humidityValues);
        const variacion = maximo - minimo;

        return {
          actual: Math.round(actual * 10) / 10,
          minimo: Math.round(minimo * 10) / 10,
          maximo: Math.round(maximo * 10) / 10,
          promedio: Math.round(promedio * 10) / 10,
          variacion: Math.round(variacion * 10) / 10,
        };
      }),
      catchError((error) => {
        console.error('Error cargando estadísticas de humedad:', error);
        return of(this.defaultStats);
      }),
      shareReplay(1)
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
    return sum / values.length;
  }

  /**
   * Obtiene clase de color para la variación
   */
  getVariationColor(variacion: number): string {
    if (variacion > 10) return 'text-red-600 dark:text-red-400';
    if (variacion > 5) return 'text-orange-600 dark:text-orange-400';
    return 'text-green-600 dark:text-green-400';
  }
}
