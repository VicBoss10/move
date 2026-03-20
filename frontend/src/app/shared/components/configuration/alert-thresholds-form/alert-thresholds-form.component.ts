import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * AlertThresholdsFormComponent (Shared/Smart Component)
 *
 * Gestión de umbrales de alerta del sistema.
 *
 * @selector app-alert-thresholds-form
 * @standalone true
 */
@Component({
  selector: 'app-alert-thresholds-form',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './alert-thresholds-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertThresholdsFormComponent {}
