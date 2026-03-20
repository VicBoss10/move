import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * HowItWorksComponent
 *
 * Componente compartido que documenta de forma concisa cómo funciona el
 * sistema: flujos principales, capturas de datos, procesamiento y salida.
 * Está pensado para ser simple y legible dentro de la sección de ayuda.
 */
@Component({
  selector: 'app-how-it-works',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './how-it-works.component.html'
})
export class HowItWorksComponent {}
