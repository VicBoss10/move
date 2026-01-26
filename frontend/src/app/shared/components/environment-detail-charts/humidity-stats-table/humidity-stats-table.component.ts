import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Interface para estadísticas de humedad
 */
interface HumidityStats {
  actual: number;
  minimo: number;
  maximo: number;
  promedio: number;
  variacion: number;
}

/**
 * HumidityStatsTableComponent
 *
 * Componente que muestra tabla de estadísticas de humedad relativa.
 * Incluye actual, mínimo, máximo, promedio y variación en %.
 *
 * @selector app-humidity-stats-table
 * @standalone true
 * @imports CommonModule
 * @returns Tabla con estadísticas de humedad
 *
 * @example
 * <app-humidity-stats-table />
 */
@Component({
  selector: 'app-humidity-stats-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './humidity-stats-table.component.html',
})
export class HumidityStatsTableComponent implements OnInit {
  /**
   * Estadísticas de humedad
   * @type {HumidityStats}
   */
  stats: HumidityStats = {
    actual: 75.5,
    minimo: 67.0,
    maximo: 83.0,
    promedio: 75.8,
    variacion: 2.5,
  };

  ngOnInit(): void {
    // TODO: Cargar datos reales del servicio
    // this.loadStats();
  }

  /**
   * Obtiene clase de color para la variación
   * @returns {string} Clases CSS de Tailwind
   */
  getVariationColor(): string {
    if (this.stats.variacion > 10) return 'text-red-600 dark:text-red-400';
    if (this.stats.variacion > 5) return 'text-orange-600 dark:text-orange-400';
    return 'text-green-600 dark:text-green-400';
  }
}
