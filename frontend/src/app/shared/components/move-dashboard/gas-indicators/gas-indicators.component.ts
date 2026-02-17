import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SensorDataService } from '../../../../core/services/sensor-data.service';
import { ComponentColorUtility } from '../../../../core/utils/component-color.utility';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { map, catchError, tap, shareReplay } from 'rxjs/operators';

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
  status: 'good' | 'moderate' | 'poor';
  color: string;
}

/**
 * Componente que muestra 4 indicadores de gases como gauges SVG semicirculares.
 * Visualiza CO2, CO, NO2 y NH3 con porcentaje, estado y umbral visual.
 * Conectado a SensorDataService para obtener datos reales del backend.
 * 
 * @selector app-gas-indicators
 * @standalone true
 */
@Component({
  selector: 'app-gas-indicators',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gas-indicators.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GasIndicatorsComponent {
  private isLoading$ = new BehaviorSubject<boolean>(true);

  ColorUtility = ComponentColorUtility;

  /**
   * Observable que emite los indicadores de gases con datos reactivos
   */
  gasIndicators$!: Observable<GasIndicator[]>;

  private readonly defaultIndicators: GasIndicator[] = [
    {
      label: 'CO₂',
      value: 0,
      unit: 'ppm',
      min: 0,
      max: 2000,
      threshold: { good: 400, moderate: 1000, poor: 2000 },
      status: 'good',
      color: '#10b981',
    },
    {
      label: 'CO',
      value: 0,
      unit: 'ppm',
      min: 0,
      max: 50,
      threshold: { good: 9, moderate: 25, poor: 50 },
      status: 'good',
      color: '#f59e0b',
    },
    {
      label: 'NO₂',
      value: 0,
      unit: 'ppb',
      min: 0,
      max: 500,
      threshold: { good: 53, moderate: 100, poor: 500 },
      status: 'good',
      color: '#ef4444',
    },
    {
      label: 'NH₃',
      value: 0,
      unit: 'ppb',
      min: 0,
      max: 100,
      threshold: { good: 35, moderate: 50, poor: 100 },
      status: 'good',
      color: '#3b82f6',
    },
  ];

  constructor(private sensorDataService: SensorDataService) {
    this.gasIndicators$ = this.sensorDataService.getLatest().pipe(
      map((latest) => {
        const indicators = [...this.defaultIndicators];
        
        if (latest) {
          indicators[0].value = latest.co2 || 0;
          indicators[1].value = latest.co || 0;
          indicators[2].value = latest.no2 || 0;
          indicators[3].value = latest.nh3 || 0;
        }

        // Actualizar estado de cada gas
        indicators.forEach(gas => {
          if (gas.value <= gas.threshold.good) {
            gas.status = 'good';
          } else if (gas.value <= gas.threshold.moderate) {
            gas.status = 'moderate';
          } else {
            gas.status = 'poor';
          }
        });

        return indicators;
      }),
      tap(() => this.isLoading$.next(false)),
      catchError((err) => {
        console.error('Error cargando datos de gases:', err);
        this.isLoading$.next(false);
        return of(this.defaultIndicators);
      }),
      shareReplay(1)
    );
  }

  /**
   * Calcula el porcentaje del valor actual dentro del rango min-max
   * @param {GasIndicator} gas - Indicador de gas
   * @returns {number} Porcentaje 0-100
   */
  getPercentage(gas: GasIndicator): number {
    return ((gas.value - gas.min) / (gas.max - gas.min)) * 100;
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
