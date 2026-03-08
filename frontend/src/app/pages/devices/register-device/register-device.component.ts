import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RegisterDeviceFormComponent } from '../../../shared/components/devices/register-device-form/register-device-form.component';

/**
 * RegisterDeviceComponent (Page/Container)
 *
 * Componente de página que orquesta la visualización del registro de dispositivos.
 * Solo renderiza el formulario compartido.
 *
 * @selector app-register-device
 * @standalone true
 */
@Component({
  selector: 'app-register-device',
  standalone: true,
  imports: [CommonModule, RegisterDeviceFormComponent],
  templateUrl: './register-device.component.html',
})
export class RegisterDeviceComponent {}
