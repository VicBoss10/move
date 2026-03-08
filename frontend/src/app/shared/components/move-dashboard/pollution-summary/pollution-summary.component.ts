import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SensorDataService } from '../../../../core/services/sensor-data.service';
import { SensorData } from '../../../../core/models/sensor-data.model';
import { ENV_THRESHOLDS, getEnvironmentStatus, EnvironmentMetricKey } from '../../../../core/config/environment-thresholds.config';
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
  statusKey: string;
  statusLabel: string;
  statusBgClass: string;
  statusTextClass: string;
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
      map((data: SensorData[]) => {
        if (!data || data.length === 0) {
          return this.defaultPollutionData;
        }

        // Definir las métricas a mostrar
        const pollutantConfigs: { key: EnvironmentMetricKey; field: string }[] = [
          { key: 'co2', field: 'co2' },
          { key: 'pm25', field: 'pm25' },
          { key: 'pm10', field: 'pm10' },
          { key: 'co', field: 'co' },
          { key: 'no2', field: 'no2' },
        ];

        return pollutantConfigs.map(cfg => {
          const config = ENV_THRESHOLDS[cfg.key];
          const values = data.map((d: any) => d[cfg.field]).filter((v: any) => v != null);
          const current = values[values.length - 1] || 0;
          const average = values.length > 0 ? values.reduce((a: number, b: number) => a + b, 0) / values.length : 0;
          const min = values.length > 0 ? Math.min(...values) : 0;
          const max = values.length > 0 ? Math.max(...values) : 0;
          const status = getEnvironmentStatus(cfg.key, current);

          return {
            name: config.label,
            unit: config.unit,
            current,
            average,
            min,
            max,
            statusKey: status.key,
            statusLabel: status.label,
            statusBgClass: status.bgClass,
            statusTextClass: status.textClass,
          };
        });
      }),
      catchError((error) => {
        console.error('Error cargando resumen de contaminantes:', error);
        return of(this.defaultPollutionData);
      }),
      shareReplay(1)
    );
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
