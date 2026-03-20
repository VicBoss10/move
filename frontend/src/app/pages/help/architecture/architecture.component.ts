import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  imports: [CommonModule, ArchitectureComponent],
  templateUrl: './architecture.component.html'
})
export class ArchitecturePageComponent {}
