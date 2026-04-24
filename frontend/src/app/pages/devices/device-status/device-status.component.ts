import { Component } from '@angular/core';

import { DeviceStatusTableComponent } from '../../../shared/components/devices/device-status-table/device-status-table.component';

/**
 * DeviceStatusComponent (Page/Container)
 *
 * Componente de página que orquesta la visualización del estado de dispositivos.
 * Solo renderiza el componente presentacional.
 *
 * @selector app-device-status
 * @standalone true
 */
@Component({
  selector: 'app-device-status',
  standalone: true,
  imports: [DeviceStatusTableComponent],
  templateUrl: './device-status.component.html',
})
export class DeviceStatusComponent {}
