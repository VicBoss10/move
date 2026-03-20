import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * SystemParamsFormComponent (Shared/Smart Component)
 *
 * Gestión de parámetros generales del sistema.
 *
 * @selector app-system-params-form
 * @standalone true
 */
@Component({
  selector: 'app-system-params-form',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './system-params-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SystemParamsFormComponent {}
