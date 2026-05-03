import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

import {
  GenericStatsCardsComponent,
  StatCard,
} from '../../common/generic-stats-cards/generic-stats-cards.component';

/**
 * VehicleStats interface for vehicle detection statistics by type.
 * @interface VehicleStats
 * @property {number} totalDetected - Total vehicle detections
 * @property {number} carCount - Total cars detected
 * @property {number} motorcycleCount - Total motorcycles detected
 * @property {number} busCount - Total buses detected
 * @property {number} truckCount - Total trucks detected
 * @property {number} bicycleCount - Total bicycles detected
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
 * VehicleStatsCardsComponent (Presentational Component)
 *
 * Displays metric cards grid showing vehicle detection statistics by type.
 * Delegates rendering to reusable GenericStatsCardsComponent to avoid code duplication.
 * Transforms input VehicleStats into GenericStatsCardsComponent-compatible StatCard format.
 *
 * Features:
 * - Six stat cards: total detections, cars, motorcycles, buses, trucks, bicycles
 * - Color-coded cards with left border: red (total), yellow (cars), purple (motos), orange (buses), yellow (trucks), green (bicycles)
 * - Card count with percentage of total displayed below label
 * - Responsive grid layout: 1 column mobile, 2 columns tablet, 3 columns desktop
 * - Dark mode support with Tailwind CSS
 * - OnPush change detection
 *
 * @selector app-vehicle-stats-cards
 * @standalone true
 * @imports GenericStatsCardsComponent
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
   * Input stats object containing vehicle detection counts by type.
   * Passed from parent component and transformed to StatCard format for generic component.
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
   * Transforms input VehicleStats into StatCard array for GenericStatsCardsComponent rendering.
   * Maps vehicle types to colored cards with border and text color styling.
   * @returns {StatCard[]} Array of stat cards for generic component
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
   * Calculates percentage change between two values (utility method, currently unused).
   * Returns 0 if previous value is 0 to avoid division by zero.
   * @param {number} current - Current value
   * @param {number} previous - Previous value for comparison
   * @returns {number} Percentage change ((current - previous) / previous * 100)
   */
  calculateChange(current: number, previous: number): number {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  }

  /**
   * Calculates percentage of value relative to total.
   * Returns 0 if total is 0 to avoid division by zero.
   * @param {number} value - Value to calculate percentage for
   * @param {number} total - Total value for denominator
   * @returns {number} Percentage (value / total * 100)
   */
  calculatePercentage(value: number, total: number): number {
    if (total === 0) return 0;
    return (value / total) * 100;
  }
}
