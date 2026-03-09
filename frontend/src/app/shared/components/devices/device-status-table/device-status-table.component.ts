import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, of } from 'rxjs';
import { map, catchError, shareReplay } from 'rxjs/operators';
import { DeviceStatusService, DeviceStatusInfo } from '../../../../core/services/device-status.service';
import { DeviceType } from '../../../../core/models/device.model';

/**
 * DeviceStatusTableComponent (Shared/Smart Component)
 *
 * Muestra el estado actual de todos los dispositivos registrados.
 *
 * @selector app-device-status-table
 * @standalone true
 */
@Component({
  selector: 'app-device-status-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './device-status-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeviceStatusTableComponent {
  devices$: Observable<DeviceStatusInfo[]>;

  constructor(private deviceStatusService: DeviceStatusService) {
    this.devices$ = this.deviceStatusService.getDeviceStatuses().pipe(
      catchError((error) => {
        console.error('Error loading device statuses:', error);
        return of([]);
      }),
      shareReplay(1)
    );
  }

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      INACTIVE: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
      ERROR: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      MAINTENANCE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    };
    return colors[status] || colors['INACTIVE'];
  }

  getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      ACTIVE: '●',
      INACTIVE: '○',
      ERROR: '●',
      MAINTENANCE: '●',
    };
    return icons[status] || '○';
  }

  getStatusText(status: string): string {
    const texts: Record<string, string> = {
      ACTIVE: 'Activo',
      INACTIVE: 'Inactivo',
      ERROR: 'Error',
      MAINTENANCE: 'Mantenimiento',
    };
    return texts[status] || 'Desconocido';
  }

  getDeviceTypeText(type: string): string {
    const texts: Record<string, string> = {
      SENSOR: 'Sensor',
      CAMERA: 'Cámara',
    };
    return texts[type] || type;
  }
}
