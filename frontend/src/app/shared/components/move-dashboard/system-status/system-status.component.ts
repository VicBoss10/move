import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SafeHtmlPipe } from '../../../pipe/safe-html.pipe';
import { DeviceService } from '../../../../core/services/device.service';
import { Device, DeviceType, DeviceState } from '../../../../core/models/device.model';
import { Observable, of } from 'rxjs';
import { map, catchError, shareReplay } from 'rxjs/operators';

/**
 * StatusCard interface for system component status information.
 * @interface StatusCard
 * @property {string} label - Component name
 * @property {string} icon - SVG icon as string
 * @property {'online' | 'offline' | 'active' | 'inactive'} status - Current status
 * @property {string} primary - Primary status or value text
 * @property {string} [secondary] - Optional secondary status text
 */
interface StatusCard {
  label: string;
  icon: string;
  status: 'online' | 'offline' | 'active' | 'inactive';
  primary: string;
  secondary?: string;
}

/**
 * SystemStatusComponent
 *
 * Displays three status cards showing system health, device connectivity (sensors), and camera status.
 * Each card shows real-time online/offline or active/inactive status with color-coded indicators and counts.
 * Connected to DeviceService for reactive device state information.
 *
 * Features:
 * - Three status cards: System (backend availability), Devices (sensor count), Cameras (camera count)
 * - Color-coded indicators: green for online/active, red for offline/inactive
 * - Device filtering by type: SENSOR devices vs CAMERA devices
 * - Active vs total device counts displayed per card
 * - Reactive data updates from DeviceService with error fallback to offline status
 * - Dark mode support with Tailwind dark: prefix and color-specific classes
 * - Dynamic Tailwind class generation based on status via helper methods
 * - shareReplay pattern for subscription efficiency
 * - OnPush change detection for performance
 *
 * @selector app-system-status
 * @standalone true
 * @imports CommonModule, SafeHtmlPipe
 * @example
 * <app-system-status />
 */
@Component({
  selector: 'app-system-status',
  standalone: true,
  imports: [CommonModule, SafeHtmlPipe],
  templateUrl: './system-status.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SystemStatusComponent {
  /**
   * Observable emitting array of three status cards for system, devices, and cameras
   */
  statusCards$!: Observable<StatusCard[]>;

  /**
   * SVG icons for system, device, and camera status indicators
   */
  public readonly icons = {
    systemIcon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor"/></svg>`,
    deviceIcon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C11.4477 2 11 2.44772 11 3V4H6C4.89543 4 4 4.89543 4 6V8H3C2.44772 8 2 8.44772 2 9C2 9.55228 2.44772 10 3 10H4V14H3C2.44772 14 2 14.4477 2 15C2 15.5523 2.44772 16 3 16H4V18C4 19.1046 4.89543 20 6 20H11V21C11 21.5523 11.4477 22 12 22C12.5523 22 13 21.5523 13 21V20H18C19.1046 20 20 19.1046 20 18V16H21C21.5523 16 22 15.5523 22 15C22 14.4477 21.5523 14 21 14H20V10H21C21.5523 10 22 9.55228 22 9C22 8.44772 21.5523 8 21 8H20V6C20 4.89543 19.1046 4 18 4H13V3C13 2.44772 12.5523 2 12 2ZM6 6H18V18H6V6Z" fill="currentColor"/></svg>`,
    cameraIcon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none"><rect x="3" y="7" width="13" height="10" rx="2" stroke="currentColor" stroke-width="2"/><path d="M17 9l4-2v10l-4-2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  };

  /**
   * Default offline status cards shown on service error
   * @private
   */
  private readonly defaultStatusCards: StatusCard[] = [
    {
      label: 'System',
      icon: this.icons.systemIcon,
      status: 'offline',
      primary: '● OFFLINE',
      secondary: 'No connection',
    },
    {
      label: 'Devices',
      icon: this.icons.deviceIcon,
      status: 'offline',
      primary: '0 / 0',
      secondary: 'No connection',
    },
    {
      label: 'Cameras',
      icon: this.icons.cameraIcon,
      status: 'inactive',
      primary: '0',
      secondary: 'No connection',
    },
  ];

  constructor(private deviceService: DeviceService) {
    this.initializeStatusCards();
  }

  /**
   * Initializes status cards combining device and location data
   * @private
   */
  private initializeStatusCards(): void {
    this.statusCards$ = this.deviceService.getAll().pipe(
      map((devices: Device[]) => {
        const allDevices = devices || [];
        const sensors = allDevices.filter((d) => d.type === DeviceType.SENSOR);
        const cameras = allDevices.filter((d) => d.type === DeviceType.CAMERA);

        const sensorsActive = sensors.filter((d) => d.state === DeviceState.ACTIVE).length;
        const sensorsTotal = sensors.length;

        const camerasActive = cameras.filter((d) => d.state === DeviceState.ACTIVE).length;
        const camerasTotal = cameras.length;

        const backendAvailable = true;

        const activeDevicesTotal = sensorsActive + camerasActive;

        return [
          {
            label: 'System',
            icon: this.icons.systemIcon,
            status: 'online' as const,
            primary: '● ONLINE',
            secondary:
              backendAvailable && allDevices.length === 0
                ? 'Backend available — no devices registered'
                : `${activeDevicesTotal} active devices`,
          },
          {
            label: 'Devices',
            icon: this.icons.deviceIcon,
            status: (sensorsActive > 0 ? 'online' : 'offline') as 'online' | 'offline',
            primary: `${sensorsActive} / ${sensorsTotal}`,
            secondary: 'Active / Registered sensors',
          },
          {
            label: 'Cameras',
            icon: this.icons.cameraIcon,
            status: (camerasActive > 0 ? 'active' : 'inactive') as 'active' | 'inactive',
            primary: `${camerasActive} / ${camerasTotal}`,
            secondary: 'Active / Registered',
          },
        ];
      }),
      catchError((error) => {
        console.error('Error loading system status:', error);
        return of(this.defaultStatusCards);
      }),
      shareReplay(1),
    );
  }

  /**
   * Returns Tailwind CSS classes for card background color based on status
   * Green for online/active, red for offline/inactive, gray default
   * @param status Device status (online/offline/active/inactive)
   * @returns Tailwind CSS classes for background and border
   */
  getStatusColor(status: string): string {
    switch (status) {
      case 'online':
      case 'active':
        return 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800';
      case 'offline':
      case 'inactive':
        return 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800';
      default:
        return 'bg-gray-50 dark:bg-gray-900/10 border-gray-200 dark:border-gray-800';
    }
  }

  /**
   * Returns Tailwind CSS classes for text color based on status
   * Green for online/active, red for offline/inactive, gray default
   * @param status Device status (online/offline/active/inactive)
   * @returns Tailwind CSS classes for text color
   */
  getTextColor(status: string): string {
    switch (status) {
      case 'online':
      case 'active':
        return 'text-green-600 dark:text-green-400';
      case 'offline':
      case 'inactive':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  }
}
