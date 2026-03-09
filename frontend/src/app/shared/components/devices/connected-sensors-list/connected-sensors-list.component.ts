import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, of } from 'rxjs';
import { map, catchError, shareReplay } from 'rxjs/operators';
import { DeviceService } from '../../../../core/services/device.service';

interface ConnectedDevice {
  id: number;
  name: string;
  type: string;
  status: 'ONLINE' | 'OFFLINE' | 'ERROR';
}

/**
 * ConnectedDevicesListComponent (Shared/Smart Component)
 *
 * Muestra lista de dispositivos conectados disponibles en el sistema.
 * Filtra solo los dispositivos de tipo SENSOR.
 *
 * @selector app-connected-sensors-list
 * @standalone true
 */
@Component({
  selector: 'app-connected-sensors-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './connected-sensors-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConnectedSensorsListComponent {
  devices$: Observable<ConnectedDevice[]>;

  constructor(private deviceService: DeviceService) {
    this.devices$ = this.deviceService.getAll().pipe(
      map((devices) =>
        devices
          .filter((d) => d.type === 'SENSOR')
          .map((d) => ({
            id: d.id,
            name: d.name,
            type: 'DISPOSITIVO AMBIENTAL',
            status: d.state === 'ACTIVE' ? ('ONLINE' as const) : d.state === 'FAILING' ? ('ERROR' as const) : ('OFFLINE' as const),
          }))
      ),
      catchError((error) => {
        console.error('Error cargando dispositivos:', error);
        return of([] as ConnectedDevice[]);
      }),
      shareReplay(1)
    );
  }

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      ONLINE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      OFFLINE: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
      ERROR: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    };
    return colors[status] || colors['OFFLINE'];
  }

  getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      ONLINE: '🟢',
      OFFLINE: '⚫',
      ERROR: '🔴',
    };
    return icons[status] || '⚪';
  }
}
