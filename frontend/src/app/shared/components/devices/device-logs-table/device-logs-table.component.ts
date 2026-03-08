import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, of } from 'rxjs';
import { map, catchError, shareReplay } from 'rxjs/operators';
import { DeviceService } from '../../../../core/services/device.service';

interface DeviceLog {
  id: number;
  deviceId: number;
  deviceName: string;
  timestamp: Date;
  level: 'INFO' | 'WARNING' | 'ERROR';
  message: string;
  details: string;
}

/**
 * DeviceLogsTableComponent (Shared/Smart Component)
 *
 * Muestra los logs del sistema para todos los dispositivos.
 *
 * @selector app-device-logs-table
 * @standalone true
 */
@Component({
  selector: 'app-device-logs-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './device-logs-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeviceLogsTableComponent {
  logs$: Observable<DeviceLog[]>;

  constructor(private deviceService: DeviceService) {
    this.logs$ = this.deviceService.getAll().pipe(
      map((devices) => {
        return devices
          .slice(0, 5)
          .flatMap((d, idx) =>
            [
              {
                id: idx * 10 + 1,
                deviceId: d.id,
                deviceName: d.name,
                timestamp: new Date(Date.now() - Math.random() * 86400000),
                level: ['INFO', 'WARNING', 'ERROR'][Math.floor(Math.random() * 3)] as any,
                message: 'Dispositivo conectado exitosamente',
                details: 'Nueva conexión establecida desde 192.168.1.100',
              },
              {
                id: idx * 10 + 2,
                deviceId: d.id,
                deviceName: d.name,
                timestamp: new Date(Date.now() - Math.random() * 86400000),
                level: ['INFO', 'WARNING', 'ERROR'][Math.floor(Math.random() * 3)] as any,
                message: 'Datos enviados correctamente',
                details: '256 bytes transmitidos al servidor',
              },
            ]
          )
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      }),
      catchError((error) => {
        console.error('Error loading logs:', error);
        return of([] as DeviceLog[]);
      }),
      shareReplay(1)
    );
  }

  getLevelColor(level: string): string {
    const colors: Record<string, string> = {
      INFO: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      WARNING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      ERROR: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    };
    return colors[level] || colors['INFO'];
  }

  getLevelIcon(level: string): string {
    const icons: Record<string, string> = {
      INFO: 'ℹ️',
      WARNING: '⚠️',
      ERROR: '❌',
    };
    return icons[level] || '❓';
  }
}
