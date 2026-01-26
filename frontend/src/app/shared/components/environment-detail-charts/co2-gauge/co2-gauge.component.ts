import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Co2GaugeComponent
 *
 * Componente especializado para mostrar el nivel de CO₂ actual en un indicador circular (gauge).
 * Muestra el valor en ppm con código de color según rango de calidad del aire.
 * Rangos: Bajo (<600 ppm), Moderado (600-1000), Elevado (1000-1500), Crítico (>1500)
 *
 * @selector app-co2-gauge
 * @standalone true
 * @imports CommonModule
 * @returns Indicador circular de CO₂
 *
 * @example
 * <app-co2-gauge />
 */
@Component({
  selector: 'app-co2-gauge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './co2-gauge.component.html',
})
export class Co2GaugeComponent implements OnInit {
  /**
   * Valor actual de CO₂ en ppm
   * @type {number}
   */
  co2Value: number = 480;

  /**
   * Porcentaje de llenado del gauge (0-100)
   * @type {number}
   */
  gaugePercentage: number = 0;

  /**
   * Clase de color para el indicador según rango
   * @type {string}
   */
  gaugeColor: string = '';

  /**
   * Estado/Rango del CO₂
   * @type {string}
   */
  status: string = '';

  ngOnInit(): void {
    this.calculateGaugeValues();
  }

  /**
   * Calcula el porcentaje y color del gauge según valor de CO₂
   * Máximo: 2000 ppm para cálculo de porcentaje
   * @returns {void}
   * @private
   */
  private calculateGaugeValues(): void {
    // Calcular porcentaje (máximo 2000 ppm)
    this.gaugePercentage = Math.min((this.co2Value / 2000) * 100, 100);

    // Determinar color y estado
    if (this.co2Value < 600) {
      this.gaugeColor = 'text-green-500';
      this.status = 'Óptimo';
    } else if (this.co2Value < 1000) {
      this.gaugeColor = 'text-blue-500';
      this.status = 'Moderado';
    } else if (this.co2Value < 1500) {
      this.gaugeColor = 'text-orange-500';
      this.status = 'Elevado';
    } else {
      this.gaugeColor = 'text-red-500';
      this.status = 'Crítico';
    }
  }

  /**
   * Obtiene el color de fondo del gauge según rango
   * @returns {string} Clases CSS de Tailwind
   */
  getGaugeBgColor(): string {
    if (this.co2Value < 600) return 'from-green-500/20 to-green-600/20';
    if (this.co2Value < 1000) return 'from-blue-500/20 to-blue-600/20';
    if (this.co2Value < 1500) return 'from-orange-500/20 to-orange-600/20';
    return 'from-red-500/20 to-red-600/20';
  }
}
