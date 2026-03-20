import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SystemParamsFormComponent } from '../../../shared/components/configuration/system-params-form/system-params-form.component';

/**
 * SystemParamsComponent (Page/Container)
 *
 * Componente de página para los parámetros generales del sistema.
 *
 * @selector app-system-params
 * @standalone true
 */
@Component({
  selector: 'app-system-params',
  standalone: true,
  imports: [CommonModule, SystemParamsFormComponent],
  templateUrl: './system-params.component.html',
})
export class SystemParamsComponent {}
