import { Component } from '@angular/core';

import { ArchitectureComponent } from '../../../shared/components/help/architecture/architecture.component';

/**
 * ArchitecturePage
 *
 * Contenedor de página para "Arquitectura del Sistema". Renderiza el
 * componente compartido `ArchitectureComponent`.
 */
@Component({
  selector: 'app-architecture-page',
  standalone: true,
  imports: [ArchitectureComponent],
  templateUrl: './architecture.component.html',
})
export class ArchitecturePageComponent {}
