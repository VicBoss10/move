import { Component } from '@angular/core';
import { LocationMapViewComponent } from '../../../shared/components/locations/location-map-view/location-map-view.component';

/**
 * LocationMapPageComponent
 * 
 * Página contenedor para la vista de mapa de monitoreo.
 * Orquesta el componente LocationMapViewComponent de shared.
 * 
 * @selector app-location-map-page
 * @standalone true
 */
@Component({
  selector: 'app-location-map-page',
  standalone: true,
  imports: [LocationMapViewComponent],
  templateUrl: './location-map.component.html',
})
export class LocationMapPageComponent {}
