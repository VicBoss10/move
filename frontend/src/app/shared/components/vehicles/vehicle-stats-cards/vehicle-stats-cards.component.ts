import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

import {
  GenericStatsCardsComponent,
  StatCard,
} from '../../common/generic-stats-cards/generic-stats-cards.component';

/**
 * Interfaz para estadísticas de vehículos
 * @interface VehicleStats
 * @property {number} totalDetected - Total de vehículos detectados
 * @property {number} carCount - Total de Autos detectados
 * @property {number} motorcycleCount - Total de Motos detectadas
 * @property {number} busCount - Total de Buses detectados
 * @property {number} truckCount - Total de Camiones detectados
 * @property {number} bicycleCount - Total de Bicicletas detectadas
 */
export interface VehicleStats {
  totalDetected: number;
  carCount: number;
  motorcycleCount: number;
  busCount: number;
  truckCount: number;
  bicycleCount: number;
}

/**
 * VehicleStatsCardsComponent
 *
 * Componente que muestra tarjetas con estadísticas generales de vehículos.
 * Usa el componente genérico GenericStatsCardsComponent para evitar duplicación.
 *
 * Características:
 * - Tarjetas de métrica codificadas por color
 * - Responsive grid
 * - Dark mode support
 * - Reutilizable
 *
 * @selector app-vehicle-stats-cards
 * @standalone true
 * @imports CommonModule, GenericStatsCardsComponent
 * @returns Tarjetas de estadísticas
 *
 * @example
 * <app-vehicle-stats-cards [stats]="vehicleStats" />
 */
@Component({
  selector: 'app-vehicle-stats-cards',
  standalone: true,
  imports: [GenericStatsCardsComponent],
  template: ` <app-generic-stats-cards [cards]="getStatCards()" /> `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VehicleStatsCardsComponent {
  /**
   * Estadísticas a mostrar (recibidas desde el padre)
   * @type {VehicleStats}
   */
  @Input() stats: VehicleStats = {
    totalDetected: 0,
    carCount: 0,
    motorcycleCount: 0,
    busCount: 0,
    truckCount: 0,
    bicycleCount: 0,
  };

  /**
   * Convierte las estadísticas a array de StatCards para el componente genérico
   */
  getStatCards(): StatCard[] {
    return [
      {
        label: 'Total Detectados',
        value: this.stats.totalDetected,
        borderColor: 'red',
        textColor: 'text-red-600 dark:text-red-400',
      },
      {
        label: 'Autos',
        value: this.stats.carCount,
        borderColor: 'yellow',
        textColor: 'text-yellow-600 dark:text-yellow-400',
      },
      {
        label: 'Motos',
        value: this.stats.motorcycleCount,
        borderColor: 'purple',
        textColor: 'text-purple-600 dark:text-purple-400',
      },
      {
        label: 'Buses',
        value: this.stats.busCount,
        borderColor: 'orange',
        textColor: 'text-orange-600 dark:text-orange-400',
      },
      {
        label: 'Camiones',
        value: this.stats.truckCount,
        borderColor: 'yellow',
        textColor: 'text-yellow-600 dark:text-yellow-400',
      },
      {
        label: 'Bicicletas',
        value: this.stats.bicycleCount,
        borderColor: 'green',
        textColor: 'text-green-600 dark:text-green-400',
      },
    ];
  }

  /**
   * Calcula el porcentaje de cambio respecto al valor anterior
   * @param {number} current - Valor actual
   * @param {number} previous - Valor anterior
   * @returns {number} Porcentaje de cambio
   */
  calculateChange(current: number, previous: number): number {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  }

  /**
   * Calcula el porcentaje relativo
   * @param {number} value - Valor actual
   * @param {number} total - Valor total
   * @returns {number} Porcentaje
   */
  calculatePercentage(value: number, total: number): number {
    if (total === 0) return 0;
    return (value / total) * 100;
  }
}
