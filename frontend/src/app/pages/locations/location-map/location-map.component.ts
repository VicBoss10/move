import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LocationFiltersComponent } from '../../../shared/components/locations/location-filters/location-filters.component';

/**
 * Location interface for map display
 */
export interface MapLocation {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  description: string;
  status: 'active' | 'inactive' | 'warning';
  vehiclesDetected: number;
  zone: string;
}

/**
 * LocationMapComponent
 * 
 * Página de visualización de mapa interactivo con ubicaciones de monitoreo
 * Muestra todas las ubicaciones en una vista geográfica de Medellín.
 * 
 * @component
 * @standalone true
 */
@Component({
  selector: 'app-location-map-page',
  standalone: true,
  imports: [CommonModule, LocationFiltersComponent],
  templateUrl: './location-map.component.html',
  styleUrls: ['./location-map.component.css'],
})
export class LocationMapPageComponent implements OnInit {
  /**
   * Lista de ubicaciones con coordenadas reales de Medellín
   */
  locations: MapLocation[] = [
    {
      id: 1,
      name: 'Carrera 7',
      latitude: 6.2476,
      longitude: -75.5631,
      description: 'Avenida principal centro',
      status: 'active',
      vehiclesDetected: 145,
      zone: 'Centro',
    },
    {
      id: 2,
      name: 'Parque Arvi',
      latitude: 6.2631,
      longitude: -75.5144,
      description: 'Zona nororiental',
      status: 'active',
      vehiclesDetected: 89,
      zone: 'Zona Norte',
    },
    {
      id: 3,
      name: 'Centro Comercial',
      latitude: 6.2208,
      longitude: -75.5753,
      description: 'Zona sur',
      status: 'warning',
      vehiclesDetected: 234,
      zone: 'Zona Sur',
    },
    {
      id: 4,
      name: 'Terminal',
      latitude: 6.2144,
      longitude: -75.5906,
      description: 'Terminal de transportes',
      status: 'active',
      vehiclesDetected: 312,
      zone: 'Zona Sur',
    },
    {
      id: 5,
      name: 'Envigado',
      latitude: 6.1744,
      longitude: -75.5928,
      description: 'Municipio de Envigado',
      status: 'active',
      vehiclesDetected: 156,
      zone: 'Zona Conurbana',
    },
    {
      id: 6,
      name: 'Estadio Metropolitano',
      latitude: 6.2267,
      longitude: -75.5758,
      description: 'Zona de eventos',
      status: 'active',
      vehiclesDetected: 198,
      zone: 'Centro',
    },
  ];

  /**
   * Ubicación seleccionada en el mapa
   */
  selectedLocation: MapLocation | null = null;

  /**
   * Escala del zoom (1-20)
   */
  zoomLevel = 12;

  /**
   * Centro del mapa (Medellín)
   */
  mapCenter = { lat: 6.2226, lng: -75.5558 };

  /**
   * Filtros actuales aplicados
   */
  activeFilters: any = null;

  constructor() {}

  /**
   * Inicializa el componente
   */
  ngOnInit(): void {
    // Inicialización del mapa
  }

  /**
   * Maneja cambios en los filtros
   * @param filters - Filtros aplicados
   */
  onFiltersChanged(filters: any): void {
    this.activeFilters = filters;
  }

  /**
   * Selecciona una ubicación en el mapa
   * @param location - Ubicación a seleccionar
   */
  selectLocation(location: MapLocation): void {
    this.selectedLocation = location;
  }

  /**
   * Deselecciona la ubicación actual
   */
  deselectLocation(): void {
    this.selectedLocation = null;
  }

  /**
   * Obtiene el color del marcador según el estado
   * @param status - Estado de la ubicación
   * @returns Clase de color de Tailwind
   */
  getStatusColor(status: string): string {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'inactive':
        return 'bg-gray-400';
      case 'warning':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  }

  /**
   * Obtiene el color del ícono de estado
   * @param status - Estado de la ubicación
   * @returns Clase de color
   */
  getStatusTextColor(status: string): string {
    switch (status) {
      case 'active':
        return 'text-green-600 dark:text-green-400';
      case 'inactive':
        return 'text-gray-600 dark:text-gray-400';
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400';
      default:
        return 'text-gray-600';
    }
  }

  /**
   * Obtiene la etiqueta de estado
   * @param status - Estado de la ubicación
   * @returns Etiqueta legible
   */
  getStatusLabel(status: string): string {
    switch (status) {
      case 'active':
        return 'Activa';
      case 'inactive':
        return 'Inactiva';
      case 'warning':
        return 'Advertencia';
      default:
        return 'Desconocido';
    }
  }

  /**
   * Calcula la posición en píxeles relativa al contenedor del mapa
   * @param latitude - Latitud
   * @param longitude - Longitud
   * @returns Objeto con propiedades top y left en porcentaje
   */
  getMarkerPosition(latitude: number, longitude: number): { top: string; left: string } {
    // Rango aproximado de Medellín
    const minLat = 6.1;
    const maxLat = 6.35;
    const minLng = -75.65;
    const maxLng = -75.45;

    const top = ((maxLat - latitude) / (maxLat - minLat)) * 100;
    const left = ((longitude - minLng) / (maxLng - minLng)) * 100;

    return {
      top: Math.max(0, Math.min(100, top)) + '%',
      left: Math.max(0, Math.min(100, left)) + '%',
    };
  }
}
