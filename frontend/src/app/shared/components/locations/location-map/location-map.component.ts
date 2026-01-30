import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Interfaz para ubicación de monitoreo
 * @interface Location
 * @property {number} id - ID único
 * @property {number} latitude - Latitud
 * @property {number} length - Longitud
 * @property {string} description - Descripción de ubicación
 */
export interface Location {
  id: number;
  latitude: number;
  length: number;
  description: string;
}

/**
 * LocationMapComponent
 *
 * Componente que muestra un mapa de ubicaciones de monitoreo.
 * Incluye tabla de ubicaciones con coordenadas.
 *
 * Características:
 * - Tabla de ubicaciones disponibles
 * - Coordenadas (Latitud, Longitud)
 * - Descripción de ubicación
 * - Indicadores de cobertura
 * - Responsive layout
 * - Dark mode support
 *
 * @selector app-location-map
 * @standalone true
 * @imports CommonModule
 * @returns Tabla/Mapa de ubicaciones
 *
 * @example
 * <app-location-map [locations]="monitoringLocations" />
 */
@Component({
  selector: 'app-location-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './location-map.component.html',
})
export class LocationMapComponent {
  /**
   * Lista de ubicaciones de monitoreo
   * @type {Location[]}
   */
  @Input() locations: Location[] = [
    {
      id: 1,
      latitude: 6.244192,
      length: -75.563199,
      description: 'Carrera 7 con Calle 10 - Centro',
    },
    {
      id: 2,
      latitude: 6.320284,
      length: -75.531389,
      description: 'Parque Arvi - Zona Norte',
    },
    {
      id: 3,
      latitude: 6.217038,
      length: -75.574668,
      description: 'Centro Comercial El Hueco - Zona Comercial',
    },
    {
      id: 4,
      latitude: 6.253523,
      length: -75.527319,
      description: 'Terminal de Transporte - Punto Clave',
    },
    {
      id: 5,
      latitude: 6.168383,
      length: -75.595947,
      description: 'Calle Principal Envigado - Zona Conurbana',
    },
    {
      id: 6,
      latitude: 6.280556,
      length: -75.520556,
      description: 'Estadio Metropolitano - Área Deportiva',
    },
  ];

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
