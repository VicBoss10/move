import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SensorDataService } from '../../../../core/services/sensor-data.service';
import { Observable, of } from 'rxjs';
import { map, catchError, shareReplay } from 'rxjs/operators';

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
 * PollutionSummaryComponent
 *
 * Componente que muestra una tabla con el resumen de contaminantes monitoreados.
 * Incluye valores actuales, promedios, mínimos, máximos y estado de cada contaminante.
 * Conectado a SensorDataService para obtener datos reales del backend.
 *
 * Características:
 * - Tabla de resumen de contaminantes
 * - Estadísticas: actual, promedio, min, max
 * - Indicadores de tendencia
 * - Dark mode support
 * - Responsivo
 *
 * @selector app-pollution-summary
 * @standalone true
 * @imports CommonModule
 * @returns Tabla de resumen de contaminantes
 *
 * @example
 * <app-pollution-summary />
 */
@Component({
  selector: 'app-pollution-summary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pollution-summary.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PollutionSummaryComponent {
  /**
   * Observable que emite las filas de contaminantes con estadísticas
   */
  pollutionData$!: Observable<PollutantRow[]>;

  /**
   * Datos por defecto cuando no hay información disponible
   */
  private readonly defaultPollutionData: PollutantRow[] = [];

  constructor(private sensorDataService: SensorDataService) {
    this.initializePollutionData();
  }

  /**
   * Inicializa los datos de contaminantes desde el servicio
   * @private
   */
  private initializePollutionData(): void {
    this.pollutionData$ = this.sensorDataService.getAll().pipe(
      map((data: any[]) => {
        if (!data || data.length === 0) {
          return this.defaultPollutionData;
        }

        // Calcular estadísticas
        const pollutantNames = ['CO₂', 'PM 2.5', 'PM 10', 'CO', 'NO₂'];
        const pollutantUnits = ['ppm', 'µg/m³', 'µg/m³', 'ppm', 'ppb'];
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
          { name: pollutantNames[0], unit: pollutantUnits[0], status: 'good' as const, ...stats['co2'] },
          { name: pollutantNames[1], unit: pollutantUnits[1], status: 'good' as const, ...stats['pm25'] },
          { name: pollutantNames[2], unit: pollutantUnits[2], status: 'good' as const, ...stats['pm10'] },
          { name: pollutantNames[3], unit: pollutantUnits[3], status: 'good' as const, ...stats['co'] },
          { name: pollutantNames[4], unit: pollutantUnits[4], status: 'good' as const, ...stats['no2'] },
        ];
      }),
      catchError((error) => {
        console.error('Error cargando resumen de contaminantes:', error);
        return of(this.defaultPollutionData);
      }),
      shareReplay(1)
    );
  }

  /**
   * Obtiene clases CSS para el badge de estado
   * @param {string} status - Estado del contaminante
   * @returns {string} Clases Tailwind CSS
   */
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

  /**
   * Obtiene etiqueta de texto para el estado
   * @param {string} status - Estado del contaminante
   * @returns {string} Etiqueta en español
   */
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

  /**
   * Obtiene icono de tendencia
   * @param {number} current - Valor actual
   * @param {number} average - Valor promedio
   * @returns {string} Icono de tendencia
   */
  getTrendIcon(current: number, average: number): string {
    if (current > average) return '↑';
    if (current < average) return '↓';
    return '→';
  }

  /**
   * Obtiene color de tendencia
   * @param {number} current - Valor actual
   * @param {number} average - Valor promedio
   * @returns {string} Clases Tailwind CSS para color
   */
  getTrendColor(current: number, average: number): string {
    if (current > average) return 'text-red-600 dark:text-red-400';
    if (current < average) return 'text-green-600 dark:text-green-400';
    return 'text-gray-600 dark:text-gray-400';
  }
}
