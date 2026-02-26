import { Component } from '@angular/core';
import { LocationHistoryViewComponent } from '../../../shared/components/locations/location-history-view/location-history-view.component';

/**
 * LocationHistoryPageComponent
 * 
 * Página contenedor para la vista de histórico de detecciones.
 * Orquesta el componente LocationHistoryViewComponent de shared.
 * 
 * @selector app-location-history
 * @standalone true
 */
@Component({
  selector: 'app-location-history',
  standalone: true,
  imports: [LocationHistoryViewComponent],
  templateUrl: './location-history.component.html',
})
export class LocationHistoryComponent {}
