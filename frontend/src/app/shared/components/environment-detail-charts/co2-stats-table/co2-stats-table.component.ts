import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Interface para estadísticas de CO₂
 * @interface Co2Stats
 */
interface Co2Stats {
  actual: number;
  minimo: number;
  maximo: number;
  promedio: number;
  variacion: number;
}

/**
 * Co2StatsTableComponent
 *
 * Componente que muestra tabla de estadísticas de CO₂.
 * Incluye valores actual, mínimo, máximo, promedio y variación porcentual.
 *
 * @selector app-co2-stats-table
 * @standalone true
 * @imports CommonModule
 * @returns Tabla con estadísticas de CO₂
 *
 * @example
 * <app-co2-stats-table />
 */
@Component({
  selector: 'app-co2-stats-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './co2-stats-table.component.html',
})
export class Co2StatsTableComponent implements OnInit {
  /**
   * Estadísticas de CO₂
   * @type {Co2Stats}
   */
  stats: Co2Stats = {
    actual: 480,
    minimo: 420,
    maximo: 520,
    promedio: 465,
    variacion: 2.3,
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
    if (this.stats.variacion > 2) return 'text-orange-600 dark:text-orange-400';
    return 'text-green-600 dark:text-green-400';
  }
}
