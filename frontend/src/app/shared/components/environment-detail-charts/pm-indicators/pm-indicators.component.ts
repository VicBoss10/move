import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Interface para indicador de partículas
 */
interface PMIndicator {
  name: string;
  symbol: string;
  value: number;
  unit: string;
  color: string;
  bgColor: string;
  maxValue: number;
  status: string;
}

/**
 * PmIndicatorsComponent
 *
 * Componente que muestra 2 indicadores circulares para partículas:
 * PM2.5 (Partículas finas) y PM10 (Partículas gruesas)
 * Cada gauge muestra el nivel con código de color según calidad del aire.
 *
 * @selector app-pm-indicators
 * @standalone true
 * @imports CommonModule
 * @returns 2 indicadores de partículas
 *
 * @example
 * <app-pm-indicators />
 */
@Component({
  selector: 'app-pm-indicators',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pm-indicators.component.html',
})
export class PmIndicatorsComponent implements OnInit {
  /**
   * Array de indicadores de partículas
   * @type {PMIndicator[]}
   */
  pmIndicators: PMIndicator[] = [
    {
      name: 'Partículas Finas',
      symbol: 'PM2.5',
      value: 18.5,
      unit: 'µg/m³',
      color: 'text-indigo-500',
      bgColor: 'from-indigo-500/20 to-indigo-600/20',
      maxValue: 100,
      status: 'Moderado',
    },
    {
      name: 'Partículas Gruesas',
      symbol: 'PM10',
      value: 35.2,
      unit: 'µg/m³',
      color: 'text-orange-500',
      bgColor: 'from-orange-500/20 to-orange-600/20',
      maxValue: 150,
      status: 'Moderado',
    },
  ];

  ngOnInit(): void {
    // TODO: Cargar datos reales del servicio
    // this.loadPMData();
  }

  /**
   * Calcula el porcentaje de llenado para un gauge
   * @param {number} value - Valor actual
   * @param {number} max - Valor máximo
   * @returns {number} Porcentaje (0-100)
   */
  getGaugePercentage(value: number, max: number): number {
    return Math.min((value / max) * 100, 100);
  }
}
