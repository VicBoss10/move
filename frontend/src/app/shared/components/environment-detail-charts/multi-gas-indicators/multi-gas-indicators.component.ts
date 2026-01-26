import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Interface para un indicador de gas
 */
interface GasIndicator {
  name: string;
  symbol: string;
  value: number;
  unit: string;
  color: string;
  bgColor: string;
  status: string;
}

/**
 * MultiGasIndicatorsComponent
 *
 * Componente que muestra 4 indicadores circulares lado a lado para gases:
 * CO (Monóxido de Carbono), NO₂ (Dióxido de Nitrógeno), NH₃ (Amoníaco), C₆H₆ (Benceno)
 * Cada gauge muestra el nivel actual con código de color.
 *
 * @selector app-multi-gas-indicators
 * @standalone true
 * @imports CommonModule
 * @returns 4 indicadores de gases
 *
 * @example
 * <app-multi-gas-indicators />
 */
@Component({
  selector: 'app-multi-gas-indicators',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './multi-gas-indicators.component.html',
})
export class MultiGasIndicatorsComponent implements OnInit {
  /**
   * Array de indicadores de gases
   * @type {GasIndicator[]}
   */
  gasIndicators: GasIndicator[] = [
    {
      name: 'Monóxido de Carbono',
      symbol: 'CO',
      value: 1.2,
      unit: 'ppm',
      color: 'text-purple-500',
      bgColor: 'from-purple-500/20 to-purple-600/20',
      status: 'Bajo',
    },
    {
      name: 'Dióxido de Nitrógeno',
      symbol: 'NO₂',
      value: 45.8,
      unit: 'µg/m³',
      color: 'text-amber-500',
      bgColor: 'from-amber-500/20 to-amber-600/20',
      status: 'Moderado',
    },
    {
      name: 'Amoníaco',
      symbol: 'NH₃',
      value: 8.5,
      unit: 'ppb',
      color: 'text-cyan-500',
      bgColor: 'from-cyan-500/20 to-cyan-600/20',
      status: 'Bajo',
    },
    {
      name: 'Benceno',
      symbol: 'C₆H₆',
      value: 2.3,
      unit: 'µg/m³',
      color: 'text-pink-500',
      bgColor: 'from-pink-500/20 to-pink-600/20',
      status: 'Bajo',
    },
  ];

  ngOnInit(): void {
    // TODO: Cargar datos reales del servicio
    // this.loadGasesData();
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
