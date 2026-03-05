import { Component } from '@angular/core';
import { RegisterLocationViewComponent } from '../../../shared/components/locations/register-location-view/register-location-view.component';

/**
 * RegisterLocationComponent
 *
 * Página contenedor para la vista de registro de ubicaciones.
 * Orquesta el componente RegisterLocationViewComponent de shared.
 *
 * @selector app-register-location
 * @standalone true
 */
@Component({
  selector: 'app-register-location',
  standalone: true,
  imports: [RegisterLocationViewComponent],
  templateUrl: './register-location.component.html',
})
export class RegisterLocationComponent {}

