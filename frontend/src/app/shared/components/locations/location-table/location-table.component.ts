import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Location } from '../../../../core/models/location.model';

/**
 * LocationTableComponent
 *
 * Componente que muestra una tabla de ubicaciones de monitoreo.
 * Incluye información de ubicaciones con coordenadas.
 *
 * Características:
 * - Tabla de ubicaciones disponibles
 * - Coordenadas (Latitud, Longitud)
 * - Descripción de ubicación
 * - Indicadores de cobertura
 * - Responsive layout
 * - Dark mode support
 *
 * @selector app-location-table
 * @standalone true
 * @imports CommonModule
 * @returns Tabla de ubicaciones
 *
 * @example
 * <app-location-table [locations]="monitoringLocations" />
 */
@Component({
  selector: 'app-location-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './location-table.component.html',
})
export class LocationTableComponent {
  /**
   * Lista de ubicaciones de monitoreo
   * @type {Location[]}
   */
  @Input() locations: Location[] = [];

  /**
   * Formatea las coordenadas para visualización
   * @param {number} latitude - Latitud
   * @param {number} longitude - Longitud
   * @returns {string} Coordenadas formateadas
   */
  formatCoordinates(latitude: number, longitude: number): string {
    return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  }

  /**
   * Obtiene la zona según la latitud
   * @param {number} latitude - Latitud
   * @returns {string} Nombre de la zona
   */
  getZoneName(latitude: number): string {
    if (latitude > 6.28) return 'Zona Norte';
    if (latitude > 6.25) return 'Centro';
    if (latitude > 6.21) return 'Zona Sur';
    return 'Zona Conurbana';
  }

  /**
   * Obtiene el color del badge de zona
   * @param {number} latitude - Latitud
   * @returns {string} Clases Tailwind
   */
  getZoneColor(latitude: number): string {
    if (latitude > 6.28) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    if (latitude > 6.25) return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
    if (latitude > 6.21) return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
    return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
  }
}
