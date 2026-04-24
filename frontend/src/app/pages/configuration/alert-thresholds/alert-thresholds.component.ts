import { Component } from '@angular/core';

import { AlertThresholdsFormComponent } from '../../../shared/components/configuration/alert-thresholds-form/alert-thresholds-form.component';

/**
 * AlertThresholdsComponent (Page/Container)
 *
 * Componente de página para la configuración de umbrales de alerta.
 *
 * @selector app-alert-thresholds
 * @standalone true
 */
@Component({
  selector: 'app-alert-thresholds',
  standalone: true,
  imports: [AlertThresholdsFormComponent],
  templateUrl: './alert-thresholds.component.html',
})
export class AlertThresholdsComponent {}
