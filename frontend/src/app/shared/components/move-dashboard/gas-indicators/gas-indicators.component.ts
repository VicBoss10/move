import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

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
 * 
 * @selector app-gas-indicators
 * @standalone true
 */
@Component({
  selector: 'app-gas-indicators',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gas-indicators.component.html',
})
export class GasIndicatorsComponent implements OnInit {

  gasIndicators: GasIndicator[] = [
    {
      label: 'CO₂',
      value: 450,
      unit: 'ppm',
      min: 300,
      max: 1000,
      threshold: { good: 400, moderate: 600, poor: 1000 },
      status: 'moderate',
      color: '#ef4444', // rojo
    },
    {
      label: 'CO',
      value: 2.655,
      unit: 'ppm',
      min: 0,
      max: 50,
      threshold: { good: 5, moderate: 15, poor: 50 },
      status: 'good',
      color: '#10b981', // verde
    },
    {
      label: 'NO₂',
      value: 2.772,
      unit: 'ppb',
      min: 0,
      max: 200,
      threshold: { good: 50, moderate: 100, poor: 200 },
      status: 'good',
      color: '#3b82f6', // azul
    },
    {
      label: 'NH₃',
      value: 2.697,
      unit: 'ppb',
      min: 0,
      max: 100,
      threshold: { good: 20, moderate: 50, poor: 100 },
      status: 'good',
      color: '#f59e0b', // ámbar
    },
  ];

  ngOnInit() {
    // Actualizar status basado en valores
    this.updateStatus();
  }

  /**
   * Actualiza el estado de cada gas basado en su valor actual y umbrales
   * @private
   */
  updateStatus() {
    this.gasIndicators.forEach(gas => {
      if (gas.value <= gas.threshold.good) {
        gas.status = 'good';
      } else if (gas.value <= gas.threshold.moderate) {
        gas.status = 'moderate';
      } else {
        gas.status = 'poor';
      }
    });
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
   * Convierte estado técnico a etiqueta legible en español
   * @param {string} status - Estado (good/moderate/poor)
   * @returns {string} Etiqueta: "Bueno", "Moderado", "Pobre"
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
   * Retorna clases Tailwind para el fondo de badge según estado
   * @param {string} status - Estado del gas (good/moderate/poor)
   * @returns {string} Clases Tailwind CSS
   */
  getStatusBgColor(status: string): string {
    switch (status) {
      case 'good':
        return 'bg-green-100 dark:bg-green-900/20';
      case 'moderate':
        return 'bg-yellow-100 dark:bg-yellow-900/20';
      case 'poor':
        return 'bg-red-100 dark:bg-red-900/20';
      default:
        return 'bg-gray-100 dark:bg-gray-900/20';
    }
  }

  /**
   * Retorna clases Tailwind para color de texto del badge
   * @param {string} status - Estado del gas (good/moderate/poor)
   * @returns {string} Clases Tailwind CSS
   */
  getStatusTextColor(status: string): string {
    switch (status) {
      case 'good':
        return 'text-green-700 dark:text-green-400';
      case 'moderate':
        return 'text-yellow-700 dark:text-yellow-400';
      case 'poor':
        return 'text-red-700 dark:text-red-400';
      default:
        return 'text-gray-700 dark:text-gray-400';
    }
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
