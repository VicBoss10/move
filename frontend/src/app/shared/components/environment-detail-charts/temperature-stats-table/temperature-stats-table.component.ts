import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Interface para estadísticas de temperatura
 */
interface TemperatureStats {
  actual: number;
  minimo: number;
  maximo: number;
  promedio: number;
  variacion: number;
}

/**
 * TemperatureStatsTableComponent
 *
 * Componente que muestra tabla de estadísticas de temperatura.
 * Incluye actual, mínimo, máximo, promedio y variación en °C.
 *
 * @selector app-temperature-stats-table
 * @standalone true
 * @imports CommonModule
 * @returns Tabla con estadísticas de temperatura
 *
 * @example
 * <app-temperature-stats-table />
 */
@Component({
  selector: 'app-temperature-stats-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './temperature-stats-table.component.html',
})
export class TemperatureStatsTableComponent implements OnInit {
  /**
   * Estadísticas de temperatura
   * @type {TemperatureStats}
   */
  stats: TemperatureStats = {
    actual: 22.5,
    minimo: 15.0,
    maximo: 28.5,
    promedio: 21.2,
    variacion: 4.5,
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
    if (this.stats.variacion > 5) return 'text-red-600 dark:text-red-400';
    if (this.stats.variacion > 3) return 'text-orange-600 dark:text-orange-400';
    return 'text-green-600 dark:text-green-400';
  }
}
