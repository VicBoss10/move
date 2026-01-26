import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * HumidityGaugeComponent
 *
 * Componente que muestra indicador circular de humedad relativa en %.
 * Rango: 0-100% con código de color según niveles.
 * Colores: Azul (seco), Verde (óptimo), Amarillo (húmedo), Naranja (muy húmedo).
 *
 * @selector app-humidity-gauge
 * @standalone true
 * @imports CommonModule
 * @returns Indicador circular de humedad
 *
 * @example
 * <app-humidity-gauge />
 */
@Component({
  selector: 'app-humidity-gauge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './humidity-gauge.component.html',
})
export class HumidityGaugeComponent implements OnInit {
  /**
   * Valor actual de humedad relativa en %
   * @type {number}
   */
  humidity: number = 75.5;

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
   * Estado de la humedad
   * @type {string}
   */
  status: string = '';

  ngOnInit(): void {
    this.calculateGaugeValues();
  }

  /**
   * Calcula porcentaje y color según humedad
   * @returns {void}
   * @private
   */
  private calculateGaugeValues(): void {
    this.gaugePercentage = this.humidity;

    // Determinar color y estado
    if (this.humidity < 30) {
      this.gaugeColor = 'text-blue-500';
      this.status = 'Seco';
    } else if (this.humidity < 60) {
      this.gaugeColor = 'text-green-500';
      this.status = 'Óptimo';
    } else if (this.humidity < 80) {
      this.gaugeColor = 'text-yellow-500';
      this.status = 'Húmedo';
    } else {
      this.gaugeColor = 'text-orange-500';
      this.status = 'Muy Húmedo';
    }
  }

  /**
   * Obtiene color de fondo según humedad
   * @returns {string} Clases CSS de Tailwind
   */
  getGaugeBgColor(): string {
    if (this.humidity < 30) return 'from-blue-500/20 to-blue-600/20';
    if (this.humidity < 60) return 'from-green-500/20 to-green-600/20';
    if (this.humidity < 80) return 'from-yellow-500/20 to-yellow-600/20';
    return 'from-orange-500/20 to-orange-600/20';
  }
}
