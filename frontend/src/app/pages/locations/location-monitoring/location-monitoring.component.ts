import { Component } from '@angular/core';
import { LocationMonitoringViewComponent } from '../../../shared/components/locations/location-monitoring-view/location-monitoring-view.component';

/**
 * LocationMonitoringPageComponent
 *
 * Página contenedor para la vista de puntos de monitoreo.
 * Orquesta el componente LocationMonitoringViewComponent de shared.
 *
 * @selector app-location-monitoring
 * @standalone true
 */
@Component({
  selector: 'app-location-monitoring',
  standalone: true,
  imports: [LocationMonitoringViewComponent],
  templateUrl: './location-monitoring.component.html',
})
export class LocationMonitoringComponent {}
