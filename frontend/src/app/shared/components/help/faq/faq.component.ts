import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * FAQ component
 * Preguntas frecuentes rápidas sobre el proyecto: dispositivos, sensores,
 * seguridad y administración.
 */
@Component({
  selector: 'app-faq',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './faq.component.html'
})
export class FaqComponent {}
