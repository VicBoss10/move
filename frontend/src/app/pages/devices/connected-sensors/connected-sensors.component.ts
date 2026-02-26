import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, of } from 'rxjs';
import { map, catchError, shareReplay } from 'rxjs/operators';
import { DeviceService } from '../../../core/services/device.service';
import { DeviceType } from '../../../core/models/device.model';

interface ConnectedSensor {
  id: number;
  name: string;
  type: string;
  status: 'ONLINE' | 'OFFLINE' | 'ERROR';
  lastReading: number | null;
  unit: string;
  lastUpdate: Date;
}

/**
 * ConnectedSensorsComponent
 *
 * Muestra lista de sensores conectados y disponibles para el sistema.
 *
 * @selector app-connected-sensors
 * @standalone true
 */
@Component({
  selector: 'app-connected-sensors',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './connected-sensors.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConnectedSensorsComponent {
  sensors$: Observable<ConnectedSensor[]>;

  constructor(private deviceService: DeviceService) {
    this.sensors$ = this.deviceService.getAll().pipe(
      map((devices) =>
        devices
          .filter((d) => d.type === DeviceType.SENSOR)
          .map((d) => ({
            id: d.id,
            name: d.name,
            type: 'ENVIRONMENTAL',
            status: d.state === 'ACTIVE' ? 'ONLINE' as const : d.state === 'ERROR' ? 'ERROR' as const : 'OFFLINE' as const,
            lastReading: Math.random() * 100,
            unit: 'ppm',
            lastUpdate: new Date(),
          }))
      ),
      catchError((error) => {
        console.error('Error loading sensors:', error);
        return of([] as ConnectedSensor[]);
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
