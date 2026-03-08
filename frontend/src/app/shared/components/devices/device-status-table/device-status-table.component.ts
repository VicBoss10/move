import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, of } from 'rxjs';
import { map, catchError, shareReplay } from 'rxjs/operators';
import { DeviceService } from '../../../../core/services/device.service';
import { DeviceState } from '../../../../core/models/device.model';

interface DeviceStatusInfo {
  id: number;
  name: string;
  type: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ERROR' | 'MAINTENANCE';
  uptime: number;
  lastSeen: Date;
  signalStrength: number;
  temperature: number;
  cpuUsage: number;
  memoryUsage: number;
}

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

  constructor(private deviceService: DeviceService) {
    this.devices$ = this.deviceService.getAll().pipe(
      map((devices) =>
        devices.map((d) => ({
          id: d.id,
          name: d.name,
          type: d.type,
          status: d.state as 'ACTIVE' | 'INACTIVE' | 'ERROR' | 'MAINTENANCE',
          uptime: Math.random() * 100,
          lastSeen: new Date(),
          signalStrength: Math.random() * 100,
          temperature: 35 + Math.random() * 15,
          cpuUsage: Math.random() * 80,
          memoryUsage: Math.random() * 85,
        }))
      ),
      catchError((error) => {
        console.error('Error loading devices:', error);
        return of([] as DeviceStatusInfo[]);
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
      ACTIVE: '🟢',
      INACTIVE: '⚫',
      ERROR: '🔴',
      MAINTENANCE: '🟡',
    };
    return icons[status] || '⚪';
  }

  getSignalColor(strength: number): string {
    if (strength >= 75) return 'text-green-600 dark:text-green-400';
    if (strength >= 50) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  }

  getUsageColor(usage: number): string {
    if (usage <= 50) return 'bg-green-500';
    if (usage <= 75) return 'bg-yellow-500';
    return 'bg-red-500';
  }
}
