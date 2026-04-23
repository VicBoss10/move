import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SensorDataService } from '../../../../core/services/sensor-data.service';
import { ThresholdsService } from '../../../../core/services/thresholds.service';
import {
  getEnvironmentStatusFromConfig,
  getMetricGaugePercentageFromConfig,
  EnvironmentMetricKey,
} from '../../../../core/config/environment-thresholds.config';
import { Observable, of, combineLatest } from 'rxjs';
import { SensorData } from '../../../../core/models/sensor-data.model';
import { map, catchError, shareReplay } from 'rxjs/operators';

/**
 * Indicador de gas con información de niveles y umbrales de calidad
 * @interface GasIndicator
 * @property {string} label - Nombre del gas (CO2, CO, NO2, NH3)
 * @property {number} value - Valor actual medido
 * @property {string} unit - Unidad de medida (ppm, ppb)
 * @property {number} min - Valor mínimo de la escala
 * @property {number} max - Valor máximo de la escala
 * @property {{good: number, moderate: number, poor: number}} threshold - Umbrales de calidad
 * @property {'good' | 'moderate' | 'poor'} status - Estado actual
 * @property {string} color - Color hexadecimal para visualización
 */
interface GasIndicator {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  threshold: { good: number; moderate: number; poor: number };
  status: 'good' | 'moderate' | 'poor' | 'critical' | 'no-data';
  statusLabel: string;
  statusBgClass: string;
  statusTextClass: string;
  color: string;
  metricKey: EnvironmentMetricKey;
  gaugePercentage: number;
}

/**
 * GasIndicatorsComponent
 *
 * Componente que muestra 4 indicadores de gases como gauges SVG semicirculares.
 * Visualiza CO2, CO, NO2 y NH3 con porcentaje, estado y umbral visual.
 * Conectado a SensorDataService para obtener datos reales del backend.
 *
 * Características:
 * - Gauges semicirculares SVG
 * - Código de color según umbrales
 * - Datos actualizados desde el backend
 * - Dark mode support
 * - Responsivo
 *
 * @selector app-gas-indicators
 * @standalone true
 * @imports CommonModule
 * @returns Indicadores de gases
 *
 * @example
 * <app-gas-indicators />
 */
@Component({
  selector: 'app-gas-indicators',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gas-indicators.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GasIndicatorsComponent {
  /**
   * Leyenda de estados reactiva basada en los umbrales actuales del servicio.
   */
  statusLegend$: Observable<{ color: string; label: string }[]>;

  /**
   * Observable que emite los indicadores de gases con datos reactivos
   */
  gasIndicators$!: Observable<GasIndicator[]>;

  /**
   * Indicadores por defecto cuando no hay datos
   */
  private readonly defaultIndicators: GasIndicator[] = [];

  constructor(
    private sensorDataService: SensorDataService,
    private thresholds: ThresholdsService,
  ) {
    this.statusLegend$ = this.thresholds
      .getAll()
      .pipe(
        map((all) =>
          all['co2'].levels.map((level) => ({ color: level.color, label: level.label })),
        ),
      );
    this.initializeGasIndicators();
  }

  /**
   * Inicializa los indicadores de gases desde el servicio,
   * reaccionando a cambios de umbrales
   * @private
   */
  private initializeGasIndicators(): void {
    this.gasIndicators$ = combineLatest([
      this.sensorDataService.getLatest(),
      this.thresholds.getAll(),
    ]).pipe(
      map(([latest, allThresholds]) => {
        const gasConfigs: { key: EnvironmentMetricKey; field: string; color: string }[] = [
          { key: 'co2', field: 'co2', color: '#10b981' },
          { key: 'co', field: 'co', color: '#f59e0b' },
          { key: 'no2', field: 'no2', color: '#ef4444' },
          { key: 'nh3', field: 'nh3', color: '#3b82f6' },
        ];

        const indicators: GasIndicator[] = gasConfigs.map((cfg) => {
          const config = allThresholds[cfg.key];
          const value = (latest as SensorData)?.[cfg.field as keyof SensorData] as number || 0;
          const status = getEnvironmentStatusFromConfig(config, value);
          return {
            label: config.label,
            value,
            unit: config.unit,
            min: config.scaleMin,
            max: config.scaleMax,
            threshold: {
              good: config.levels[0].max,
              moderate: config.levels[1].max,
              poor: config.levels[2].max,
            },
            status: status.key as GasIndicator['status'],
            statusLabel: status.label,
            statusBgClass: status.bgClass,
            statusTextClass: status.textClass,
            color: status.color,
            metricKey: cfg.key,
            gaugePercentage: getMetricGaugePercentageFromConfig(config, value),
          };
        });

        return indicators;
      }),
      catchError((error) => {
        console.error('Error cargando datos de gases:', error);
        return of(this.defaultIndicators);
      }),
      shareReplay(1),
    );
  }

  /**
   * Devuelve el porcentaje de gauge precomputado desde el indicador
   * @param {GasIndicator} gas - Indicador de gas
   * @returns {number} Porcentaje 0-100
   */
  getPercentage(gas: GasIndicator): number {
    return gas.gaugePercentage;
  }

  /**
   * Calcula el ángulo del gauge SVG (-180° a +180° para semicírculo)
   * @param {number} percentage - Porcentaje 0-100
   * @returns {number} Ángulo en grados
   * @private
   */
  getGaugeAngle(percentage: number): number {
    // 0% = -180°, 100% = 180° (semicírculo)
    return (percentage / 100) * 360 - 180;
  }

  /**
   * Genera el path SVG para el arco del gauge
   * @param {number} angle - Ángulo final en grados
   * @param {number} [radius=45] - Radio del arco
   * @returns {string} Path SVG válido para <path d="..."/>
   * @private
   */
  getArcPath(angle: number, radius: number = 45): string {
    const startAngle = -180;
    const endAngle = angle;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = 50 + radius * Math.cos(startRad);
    const y1 = 50 + radius * Math.sin(startRad);
    const x2 = 50 + radius * Math.cos(endRad);
    const y2 = 50 + radius * Math.sin(endRad);

    const largeArc = endAngle - startAngle > 180 ? 1 : 0;

    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;
  }

  /**
   * Genera el path SVG para el arco de fondo del gauge (semicírculo)
   * @param {number} [radius=45] - Radio del arco
   * @returns {string} Path SVG válido para <path d="..."/>
   * @private
   */
  getBackgroundArcPath(radius: number = 45): string {
    const startAngle = -180;
    const endAngle = 180;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = 50 + radius * Math.cos(startRad);
    const y1 = 50 + radius * Math.sin(startRad);
    const x2 = 50 + radius * Math.cos(endRad);
    const y2 = 50 + radius * Math.sin(endRad);

    return `M ${x1} ${y1} A ${radius} ${radius} 0 1 1 ${x2} ${y2}`;
  }
}
