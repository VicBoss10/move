import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GenericStatsCardsComponent, StatCard } from '../../common/generic-stats-cards/generic-stats-cards.component';

/**
 * Interfaz para estadísticas de cámaras
 * @interface CameraStats
 * @property {number} totalCameras - Total de cámaras
 * @property {number} activeCameras - Cámaras activas
 * @property {number} inactiveCameras - Cámaras inactivas
 * @property {number} failingCameras - Cámaras con fallo
 * @property {number} vehiclesDetected - Vehículos detectados
 * @property {number} uptime - Tiempo de disponibilidad en %
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
 * CameraStatusCardsComponent
 *
 * Componente que muestra tarjetas con estadísticas de cámaras.
 * Usa GenericStatsCardsComponent para evitar duplicación.
 *
 * @selector app-camera-status-cards
 * @standalone true
 * @imports CommonModule, GenericStatsCardsComponent
 * @returns Tarjetas de estadísticas de cámaras
 *
 * @example
 * <app-camera-status-cards [stats]="cameraStats" />
 */
@Component({
  selector: 'app-camera-status-cards',
  standalone: true,
  imports: [CommonModule, GenericStatsCardsComponent],
  template: `
    <app-generic-stats-cards [cards]="getStatCards()" />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CameraStatusCardsComponent {
  /**
   * Estadísticas a mostrar
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
   * Convierte las estadísticas a array de StatCards
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
