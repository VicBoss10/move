import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Interface para estadísticas de partículas
 */
interface PMStats {
  symbol: string;
  name: string;
  actual: number;
  minimo: number;
  maximo: number;
  promedio: number;
  variacion: number;
  unit: string;
}

/**
 * PmStatsTableComponent
 *
 * Componente que muestra tabla con estadísticas de PM2.5 y PM10.
 * Incluye actual, mínimo, máximo, promedio y variación porcentual.
 *
 * @selector app-pm-stats-table
 * @standalone true
 * @imports CommonModule
 * @returns Tabla con estadísticas de partículas
 *
 * @example
 * <app-pm-stats-table />
 */
@Component({
  selector: 'app-pm-stats-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pm-stats-table.component.html',
})
export class PmStatsTableComponent implements OnInit {
  /**
   * Estadísticas de partículas
   * @type {PMStats[]}
   */
  pmStats: PMStats[] = [
    {
      symbol: 'PM2.5',
      name: 'Partículas Finas',
      actual: 18.5,
      minimo: 12.3,
      maximo: 28.9,
      promedio: 20.1,
      variacion: 5.2,
      unit: 'µg/m³',
    },
    {
      symbol: 'PM10',
      name: 'Partículas Gruesas',
      actual: 35.2,
      minimo: 25.1,
      maximo: 52.5,
      promedio: 38.5,
      variacion: 3.8,
      unit: 'µg/m³',
    },
  ];

  ngOnInit(): void {
    // TODO: Cargar datos reales del servicio
    // this.loadPMStats();
  }

  /**
   * Obtiene clase de color para la variación
   * @param {number} variacion - Valor de variación
   * @returns {string} Clases CSS de Tailwind
   */
  getVariationColor(variacion: number): string {
    if (variacion > 5) return 'text-red-600 dark:text-red-400';
    if (variacion > 2) return 'text-orange-600 dark:text-orange-400';
    return 'text-green-600 dark:text-green-400';
  }
}
