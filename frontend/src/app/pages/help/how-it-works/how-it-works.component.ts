import { Component } from '@angular/core';

import { HowItWorksComponent } from '../../../shared/components/help/how-it-works/how-it-works.component';

/**
 * HowItWorksPage
 *
 * Contenedor de página para "Cómo Funciona". Utiliza el componente
 * compartido `HowItWorksComponent` para mostrar el contenido.
 */
@Component({
  selector: 'app-how-it-works-page',
  standalone: true,
  imports: [HowItWorksComponent],
  templateUrl: './how-it-works.component.html',
})
export class HowItWorksPageComponent {}
