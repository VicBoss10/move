import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * TemperatureGaugeComponent
 *
 * Componente que muestra indicador circular de temperatura en °C.
 * Rango de -10°C a 50°C con código de color según condiciones.
 * Colores: Azul (frío), Verde (óptimo), Naranja (calor), Rojo (crítico).
 *
 * @selector app-temperature-gauge
 * @standalone true
 * @imports CommonModule
 * @returns Indicador circular de temperatura
 *
 * @example
 * <app-temperature-gauge />
 */
@Component({
  selector: 'app-temperature-gauge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './temperature-gauge.component.html',
})
export class TemperatureGaugeComponent implements OnInit {
  /**
   * Valor actual de temperatura en °C
   * @type {number}
   */
  temperature: number = 22.5;

  /**
   * Porcentaje de llenado del gauge (0-100)
   * @type {number}
   */
  gaugePercentage: number = 0;

  /**
   * Clase de color para el indicador
   * @type {string}
   */
  gaugeColor: string = '';

  /**
   * Estado de la temperatura
   * @type {string}
   */
  status: string = '';

  ngOnInit(): void {
    this.calculateGaugeValues();
  }

  /**
   * Calcula porcentaje y color según temperatura
   * Rango: -10°C a 50°C
   * @returns {void}
   * @private
   */
  private calculateGaugeValues(): void {
    // Mapear rango -10 a 50°C a 0-100%
    this.gaugePercentage = ((this.temperature + 10) / 60) * 100;
    this.gaugePercentage = Math.max(0, Math.min(100, this.gaugePercentage));

    // Determinar color y estado
    if (this.temperature < 15) {
      this.gaugeColor = 'text-blue-500';
      this.status = 'Frío';
    } else if (this.temperature < 25) {
      this.gaugeColor = 'text-green-500';
      this.status = 'Óptimo';
    } else if (this.temperature < 35) {
      this.gaugeColor = 'text-orange-500';
      this.status = 'Calor';
    } else {
      this.gaugeColor = 'text-red-500';
      this.status = 'Muy Caliente';
    }
  }

  /**
   * Obtiene color de fondo según temperatura
   * @returns {string} Clases CSS de Tailwind
   */
  getGaugeBgColor(): string {
    if (this.temperature < 15) return 'from-blue-500/20 to-blue-600/20';
    if (this.temperature < 25) return 'from-green-500/20 to-green-600/20';
    if (this.temperature < 35) return 'from-orange-500/20 to-orange-600/20';
    return 'from-red-500/20 to-red-600/20';
  }
}
