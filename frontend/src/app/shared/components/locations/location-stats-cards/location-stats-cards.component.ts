import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GenericStatsCardsComponent, StatCard } from '../../common/generic-stats-cards/generic-stats-cards.component';

/**
 * Interfaz para estadísticas de ubicaciones
 * @interface LocationStats
 * @property {number} totalLocations - Total de ubicaciones
 * @property {number} activeLocations - Ubicaciones activas
 * @property {number} vehiclesDetected - Total de vehículos detectados
 * @property {number} averageQuality - Calidad promedio de monitoreo
 * @property {number} coverage - Cobertura total en %
 * @property {number} uptime - Disponibilidad en %
 */
export interface LocationStats {
  totalLocations: number;
  activeLocations: number;
  vehiclesDetected: number;
  averageQuality: number;
  coverage: number;
  uptime: number;
}

/**
 * LocationStatsCardsComponent
 *
 * Componente que muestra tarjetas con estadísticas de ubicaciones.
 * Usa GenericStatsCardsComponent para evitar duplicación.
 *
 * @selector app-location-stats-cards
 * @standalone true
 * @imports CommonModule, GenericStatsCardsComponent
 * @returns Tarjetas de estadísticas
 *
 * @example
 * <app-location-stats-cards [stats]="locationStats" />
 */
@Component({
  selector: 'app-location-stats-cards',
  standalone: true,
  imports: [CommonModule, GenericStatsCardsComponent],
  template: `
    <app-generic-stats-cards [cards]="getStatCards()" />
  `,
})
export class LocationStatsCardsComponent {
  /**
   * Estadísticas a mostrar
   */
  @Input() stats: LocationStats = {
    totalLocations: 6,
    activeLocations: 5,
    vehiclesDetected: 2847,
    averageQuality: 94.2,
    coverage: 92.5,
    uptime: 99.1,
  };

  /**
   * Convierte las estadísticas a array de StatCards
   */
  getStatCards(): StatCard[] {
    return [
      {
        label: 'Total Ubicaciones',
        value: this.stats.totalLocations,
        borderColor: 'red',
        textColor: 'text-red-600 dark:text-red-400',
      },
      {
        label: 'Activas',
        value: this.stats.activeLocations,
        borderColor: 'green',
        textColor: 'text-green-600 dark:text-green-400',
      },
      {
        label: 'Vehículos Detectados',
        value: this.stats.vehiclesDetected,
        borderColor: 'purple',
        textColor: 'text-purple-600 dark:text-purple-400',
      },
      {
        label: 'Calidad Promedio',
        value: this.stats.averageQuality.toFixed(1) + '%',
        borderColor: 'blue',
        textColor: 'text-blue-600 dark:text-blue-400',
      },
      {
        label: 'Cobertura',
        value: this.stats.coverage.toFixed(1) + '%',
        borderColor: 'orange',
        textColor: 'text-orange-600 dark:text-orange-400',
      },
      {
        label: 'Disponibilidad',
        value: this.stats.uptime.toFixed(1) + '%',
        borderColor: 'indigo',
        textColor: 'text-indigo-600 dark:text-indigo-400',
      },
    ];
  }
}
