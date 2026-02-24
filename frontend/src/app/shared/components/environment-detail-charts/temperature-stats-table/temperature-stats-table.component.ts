import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, of } from 'rxjs';
import { map, catchError, shareReplay } from 'rxjs/operators';
import { SensorDataService } from '../../../../core/services/sensor-data.service';

/**
 * Interface para estadísticas de temperatura
 */
interface TemperatureStats {
  actual: number;
  minimo: number;
  maximo: number;
  promedio: number;
  variacion: number;
}

/**
 * TemperatureStatsTableComponent
 *
 * Componente que muestra tabla de estadísticas dinámicas de temperatura.
 * Incluye actual, mínimo, máximo, promedio y variación en °C.
 * Obtiene datos en tiempo real del backend.
 *
 * @selector app-temperature-stats-table
 * @standalone true
 * @imports CommonModule
 * @returns Tabla con estadísticas de temperatura
 *
 * @example
 * <app-temperature-stats-table />
 */
@Component({
  selector: 'app-temperature-stats-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './temperature-stats-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TemperatureStatsTableComponent {
  /**
   * Observable que emite estadísticas de temperatura
   */
  stats$!: Observable<TemperatureStats>;

  private readonly defaultStats: TemperatureStats = {
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
   * Inicializa estadísticas de temperatura desde el servicio
   */
  private initializeStats(): void {
    this.stats$ = this.sensorDataService.getAll().pipe(
      map((sensorData: any[]) => {
        if (!sensorData || sensorData.length === 0) {
          return this.defaultStats;
        }

        // Extraer valores de temperatura
        const tempValues = sensorData.map((d) => d.temperature || 0);

        const actual = this.getLatestValue(tempValues);
        const minimo = Math.min(...tempValues);
        const maximo = Math.max(...tempValues);
        const promedio = this.calculateAverage(tempValues);
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
        console.error('Error cargando estadísticas de temperatura:', error);
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
    if (variacion > 5) return 'text-red-600 dark:text-red-400';
    if (variacion > 3) return 'text-orange-600 dark:text-orange-400';
    return 'text-green-600 dark:text-green-400';
  }
}
