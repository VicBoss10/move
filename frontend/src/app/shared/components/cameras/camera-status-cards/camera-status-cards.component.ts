import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

import {
  GenericStatsCardsComponent,
  StatCard,
} from '../../common/generic-stats-cards/generic-stats-cards.component';

/**
 * Camera deployment statistics and health metrics.
 * @interface CameraStats
 * @property {number} totalCameras - Total installed camera devices
 * @property {number} activeCameras - Currently active cameras with detection enabled
 * @property {number} inactiveCameras - Inactive cameras without detection
 * @property {number} failingCameras - Cameras with errors or failures
 * @property {number} vehiclesDetected - Total vehicle detection count
 * @property {number} uptime - System uptime percentage
 */
export interface CameraStats {
  totalCameras: number;
  activeCameras: number;
  inactiveCameras: number;
  failingCameras: number;
  vehiclesDetected: number;
  uptime: number;
}

/**
 * CameraStatusCardsComponent (Presentational Component)
 *
 * Displays camera statistics as styled cards using reusable GenericStatsCardsComponent.
 *
 * Features:
 * - Total, active, inactive, and failing camera counts
 * - Vehicle detection count with color-coded badges
 * - System uptime percentage
 * - Dynamic percentage calculations
 * - Dark mode support
 * - OnPush change detection
 *
 * @selector app-camera-status-cards
 * @standalone true
 * @imports GenericStatsCardsComponent
 * @example
 * <app-camera-status-cards [stats]="cameraStats" />
 */
@Component({
  selector: 'app-camera-status-cards',
  standalone: true,
  imports: [GenericStatsCardsComponent],
  template: ` <app-generic-stats-cards [cards]="getStatCards()" /> `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CameraStatusCardsComponent {
  /**
   * Camera statistics to display.
   * Provides defaults for development/preview purposes.
   * @type {CameraStats}
   */
  @Input() stats: CameraStats = {
    totalCameras: 12,
    activeCameras: 10,
    inactiveCameras: 1,
    failingCameras: 1,
    vehiclesDetected: 2847,
    uptime: 98.5,
  };

  /**
   * Converts camera statistics to generic stat card array.
   * Calculates percentage values and assigns color-coded borders.
   * @returns {StatCard[]} Array of stat cards for generic component rendering
   */
  getStatCards(): StatCard[] {
    return [
      {
        label: 'Total Cámaras',
        value: this.stats.totalCameras,
        borderColor: 'red',
        textColor: 'text-red-600 dark:text-red-400',
      },
      {
        label: 'Activas',
        value: this.stats.activeCameras,
        borderColor: 'green',
        textColor: 'text-green-600 dark:text-green-400',
      },
      {
        label: 'Inactivas',
        value: this.stats.inactiveCameras,
        borderColor: 'gray',
        textColor: 'text-gray-600 dark:text-gray-400',
      },
      {
        label: 'Con Fallo',
        value: this.stats.failingCameras,
        borderColor: 'orange',
        textColor: 'text-orange-600 dark:text-orange-400',
      },
      {
        label: 'Vehículos Detectados',
        value: this.stats.vehiclesDetected,
        borderColor: 'purple',
        textColor: 'text-purple-600 dark:text-purple-400',
      },
    ];
  }
}
