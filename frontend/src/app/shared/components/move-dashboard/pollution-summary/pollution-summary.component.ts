import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SensorDataService } from '../../../../core/services/sensor-data.service';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { map, catchError, tap, shareReplay } from 'rxjs/operators';

/**
 * Fila de contaminante en la tabla de resumen con estadísticas diarias
 * @interface PollutantRow
 * @property {string} name - Nombre del contaminante (CO2, PM 2.5, PM 10, etc)
 * @property {number} current - Valor actual medido
 * @property {string} unit - Unidad de medida (ppm, µg/m³, ppb)
 * @property {number} average - Promedio del día
 * @property {number} min - Valor mínimo del día
 * @property {number} max - Valor máximo del día
 * @property {'good' | 'moderate' | 'poor'} status - Estado actual
 */
interface PollutantRow {
  name: string;
  current: number;
  unit: string;
  average: number;
  min: number;
  max: number;
  status: 'good' | 'moderate' | 'poor';
}

/**
 * Componente que muestra una tabla con el resumen de contaminantes monitoreados.
 * Incluye valores actuales, promedios, mínimos, máximos y estado de cada contaminante.
 * Conectado a SensorDataService para obtener datos reales del backend.
 * 
 * @selector app-pollution-summary
 * @standalone true
 */
@Component({
  selector: 'app-pollution-summary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pollution-summary.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PollutionSummaryComponent {
  private isLoading$ = new BehaviorSubject<boolean>(true);

  /**
   * Observable que emite las filas de contaminantes con estadísticas
   */
  pollutionData$!: Observable<PollutantRow[]>;

  private readonly defaultPollutionData: PollutantRow[] = [
    { name: 'CO₂', current: 0, unit: 'ppm', average: 0, min: 0, max: 0, status: 'good' },
    { name: 'PM 2.5', current: 0, unit: 'µg/m³', average: 0, min: 0, max: 0, status: 'good' },
    { name: 'PM 10', current: 0, unit: 'µg/m³', average: 0, min: 0, max: 0, status: 'good' },
    { name: 'CO', current: 0, unit: 'ppm', average: 0, min: 0, max: 0, status: 'good' },
    { name: 'NO₂', current: 0, unit: 'ppb', average: 0, min: 0, max: 0, status: 'good' },
  ];

  constructor(private sensorDataService: SensorDataService) {
    this.pollutionData$ = this.sensorDataService.getAll().pipe(
      map((data: any[]) => {
        if (!data || data.length === 0) {
          return this.defaultPollutionData;
        }

        // Calcular estadísticas
        const keys = ['co2', 'pm25', 'pm10', 'co', 'no2'];
        const stats: { [key: string]: any } = {};

        keys.forEach(key => {
          const values = data.map((d: any) => d[key]).filter((v: any) => v != null);
          stats[key] = {
            current: values[values.length - 1] || 0,
            average: values.length > 0 ? values.reduce((a: number, b: number) => a + b, 0) / values.length : 0,
            min: values.length > 0 ? Math.min(...values) : 0,
            max: values.length > 0 ? Math.max(...values) : 0
          };
        });

        return [
          { ...this.defaultPollutionData[0], ...stats['co2'] },
          { ...this.defaultPollutionData[1], ...stats['pm25'] },
          { ...this.defaultPollutionData[2], ...stats['pm10'] },
          { ...this.defaultPollutionData[3], ...stats['co'] },
          { ...this.defaultPollutionData[4], ...stats['no2'] },
        ];
      }),
      tap(() => this.isLoading$.next(false)),
      catchError((err) => {
        console.error('Error cargando resumen de contaminantes:', err);
        this.isLoading$.next(false);
        return of(this.defaultPollutionData);
      }),
      shareReplay(1)
    );
  }

  getStatusBadge(status: string): string {
    switch (status) {
      case 'good':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'moderate':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'poor':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'good':
        return 'Bueno';
      case 'moderate':
        return 'Moderado';
      case 'poor':
        return 'Pobre';
      default:
        return 'Desconocido';
    }
  }

  getTrendIcon(current: number, average: number): string {
    if (current > average) return '↑';
    if (current < average) return '↓';
    return '→';
  }

  getTrendColor(current: number, average: number): string {
    if (current > average) return 'text-red-600 dark:text-red-400';
    if (current < average) return 'text-green-600 dark:text-green-400';
    return 'text-gray-600 dark:text-gray-400';
  }
}
