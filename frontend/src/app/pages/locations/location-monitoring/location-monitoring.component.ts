import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LocationMapComponent } from '../../../shared/components/locations/location-map/location-map.component';
import { LocationFiltersComponent } from '../../../shared/components/locations/location-filters/location-filters.component';

/**
 * LocationMonitoringComponent
 *
 * Página que muestra los puntos de monitoreo (ubicaciones)
 * disponibles en el sistema con información geográfica.
 *
 * Características:
 * - Mapa de ubicaciones (tabla interactiva)
 * - Información de coordenadas GPS
 * - Filtros por zona geográfica
 * - Descripción de cada ubicación
 * - Acciones por ubicación
 * - Panel de información del sistema
 *
 * @selector app-location-monitoring
 * @standalone true
 * @imports CommonModule, LocationMapComponent, LocationFiltersComponent
 * @returns Página de puntos de monitoreo
 *
 * @example
 * <app-location-monitoring />
 */
@Component({
  selector: 'app-location-monitoring',
  standalone: true,
  imports: [CommonModule, LocationMapComponent, LocationFiltersComponent],
  templateUrl: './location-monitoring.component.html',
})
export class LocationMonitoringComponent {
  /**
   * Información general del sistema
   * @type {object}
   */
  systemInfo = {
    totalLocations: 6,
    activeLocations: 5,
    coverage: '92.5%',
    lastUpdate: '30/01/2026 14:35:45',
  };

  /**
   * Maneja cambios en los filtros
   * @param {any} filters - Filtros aplicados
   */
  onFiltersChanged(filters: any): void {
    console.log('Filtros de ubicación aplicados:', filters);
    // Aquí se conectaría con el backend para filtrar ubicaciones
  }
}
