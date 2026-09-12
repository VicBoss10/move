import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError, shareReplay } from 'rxjs/operators';
import { DeviceService } from './device.service';
import { Device, DeviceType } from '../models/device.model';

/**
 * Device status information including connectivity and activity metrics.
 * @interface DeviceStatusInfo
 */
export interface DeviceStatusInfo {
  /** Device identifier. */
  id: number;
  /** Device display name. */
  name: string;
  /** Device hardware type. */
  type: DeviceType;
  /** Device operational status. */
  status: 'ACTIVE' | 'INACTIVE' | 'ERROR' | 'MAINTENANCE';
  /** Geographic location of the device. */
  location: {
    /** Location identifier. */
    id: number;
    /** Latitude coordinate. */
    latitude: number;
    /** Longitude coordinate. */
    longitude: number;
    /** Location description. */
    description?: string | null;
  };
  /** Whether the device is currently online. */
  isOnline: boolean;
  /** Whether the device has been archived ("moved"). */
  archived: boolean;
}

/**
 * Device status and connectivity service.
 * Provides general status information (connectivity, location, activity) without device-specific data.
 * Sensor-specific metrics and camera statistics are displayed in dedicated views.
 *
 * @class DeviceStatusService
 * @injectable root
 */
@Injectable({
  providedIn: 'root',
})
export class DeviceStatusService {
  constructor(private deviceService: DeviceService) {}

  /**
   * Fetches the complete status of all devices.
   * Only the device list is requested: activity metrics that require scanning the
   * full sensor-data and detection history are intentionally left out to keep the
   * view responsive.
   *
   * @returns {Observable<DeviceStatusInfo[]>} Observable with all device statuses.
   */
  getDeviceStatuses(): Observable<DeviceStatusInfo[]> {
    return this.deviceService.getAll().pipe(
      map((devices) => devices.map((device) => this.mapDeviceToStatus(device))),
      catchError((error) => {
        console.error('Error loading device statuses:', error);
        return of([]);
      }),
      shareReplay(1),
    );
  }

  /**
   * Maps a device to its status representation.
   */
  private mapDeviceToStatus(device: Device): DeviceStatusInfo {
    return {
      id: device.id,
      name: device.name,
      type: device.type,
      status: device.state as 'ACTIVE' | 'INACTIVE' | 'ERROR' | 'MAINTENANCE',
      location: device.location,
      isOnline: device.state === 'ACTIVE',
      archived: device.archived ?? false,
    };
  }
}
