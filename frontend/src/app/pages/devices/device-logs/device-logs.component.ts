import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DeviceLogsTableComponent } from '../../../shared/components/devices/device-logs-table/device-logs-table.component';

/**
 * DeviceLogsComponent (Page/Container)
 *
 * Componente de página que orquesta la visualización de logs del sistema.
 * Solo renderiza el componente presentacional.
 *
 * @selector app-device-logs
 * @standalone true
 */
@Component({
  selector: 'app-device-logs',
  standalone: true,
  imports: [CommonModule, DeviceLogsTableComponent],
  templateUrl: './device-logs.component.html',
})
export class DeviceLogsComponent {}
