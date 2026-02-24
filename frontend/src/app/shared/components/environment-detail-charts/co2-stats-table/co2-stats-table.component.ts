import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, of } from 'rxjs';
import { map, catchError, shareReplay } from 'rxjs/operators';
import { SensorDataService } from '../../../../core/services/sensor-data.service';

/**
 * Interface para estadísticas de CO₂
 * @interface Co2Stats
 */
interface Co2Stats {
  actual: number;
  minimo: number;
  maximo: number;
  promedio: number;
  variacion: number;
}

/**
 * Co2StatsTableComponent
 *
 * Componente dinámico que muestra tabla de estadísticas de CO₂ desde el backend.
 * Calcula estadísticas en tiempo real: actual, mínimo, máximo, promedio y variación.
 * Sigue el patrón Observable reactivo con ChangeDetectionStrategy.OnPush.
 *
 * @selector app-co2-stats-table
 * @standalone true
 */
@Component({
  selector: 'app-co2-stats-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './co2-stats-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Co2StatsTableComponent {
  /**
   * Observable que emite las estadísticas de CO₂ calculadas dinámicamente
   */
  stats$!: Observable<Co2Stats>;

  constructor(private sensorDataService: SensorDataService) {
    this.initializeStats();
  }

  /**
   * Inicializa las estadísticas desde el servicio
   */
  private initializeStats(): void {
    this.stats$ = this.sensorDataService.getAll().pipe(
      map((sensorData: any[]) => {
        if (!sensorData || sensorData.length === 0) {
          return this.getEmptyStats();
        }

        return this.calculateStats(sensorData);
      }),
      catchError((error) => {
        console.error('Error cargando datos de CO₂:', error);
        return of(this.getEmptyStats());
      }),
      shareReplay(1)
    );
  }

  /**
   * Calcula estadísticas de CO₂ desde los datos del sensor
   * @param sensorData - Array de datos de sensores
   * @returns Objeto con estadísticas calculadas
   */
  private calculateStats(sensorData: any[]): Co2Stats {
    // Obtener valores de CO₂, filtrando los nulos/undefined
    const co2Values = sensorData
      .map((d) => d.co2)
      .filter((v) => v !== null && v !== undefined && v > 0);

    if (co2Values.length === 0) {
      return this.getEmptyStats();
    }

    // Calcular estadísticas
    const actual = co2Values[co2Values.length - 1];
    const minimo = Math.min(...co2Values);
    const maximo = Math.max(...co2Values);
    const promedio = Math.round(co2Values.reduce((a, b) => a + b, 0) / co2Values.length);

    // Calcular variación como diferencia entre máximo y mínimo en porcentaje del promedio
    const variacion = promedio > 0 ? Math.round(((maximo - minimo) / promedio) * 100 * 10) / 10 : 0;

    return {
      actual: Math.round(actual),
      minimo: Math.round(minimo),
      maximo: Math.round(maximo),
      promedio,
      variacion,
    };
  }

  /**
   * Retorna estadísticas vacías como valor por defecto
   * @returns Objeto Co2Stats con valores en 0
   */
  private getEmptyStats(): Co2Stats {
    return {
      actual: 0,
      minimo: 0,
      maximo: 0,
      promedio: 0,
      variacion: 0,
    };
  }

  /**
   * Obtiene clase de color para la variación según su magnitud
   * @param variacion - Valor de variación en porcentaje
   * @returns Clases CSS de Tailwind
   */
  getVariationColor(variacion: number): string {
    if (variacion > 5) return 'text-red-600 dark:text-red-400';
    if (variacion > 2) return 'text-orange-600 dark:text-orange-400';
    return 'text-green-600 dark:text-green-400';
  }
}
