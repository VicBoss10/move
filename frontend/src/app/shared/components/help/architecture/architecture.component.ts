import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * ArchitectureComponent
 *
 * Presenta un resumen de la arquitectura del sistema con enlaces a los
 * componentes principales y diagramas embebidos.
 */
@Component({
  selector: 'app-architecture',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './architecture.component.html',
})
export class ArchitectureComponent {}
