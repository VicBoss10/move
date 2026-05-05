import { Injectable } from '@angular/core';
import { Observable, combineLatest, of } from 'rxjs';
import { map, catchError, shareReplay } from 'rxjs/operators';
import { DeviceService } from './device.service';
import { SensorDataService } from './sensor-data.service';
import { VehicleDetectedService } from './vehicle-detected.service';
import { Device, DeviceType } from '../models/device.model';
import { SensorData } from '../models/sensor-data.model';
import { VehicleDetected } from '../models/vehicle.model';

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
  /** Timestamp of the most recent device activity. */
  lastActivity: Date | null;
  /** Whether the device is currently online. */
  isOnline: boolean;
  /** Number of data points recorded by the device. */
  dataPoints: number;
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
  constructor(
    private deviceService: DeviceService,
    private sensorDataService: SensorDataService,
    private vehicleDetectedService: VehicleDetectedService,
  ) {}

  /**
   * Fetches the complete status of all devices.
   * Combines device information with real-time metrics and activity data.
   *
   * @returns {Observable<DeviceStatusInfo[]>} Observable with all device statuses.
   */
  getDeviceStatuses(): Observable<DeviceStatusInfo[]> {
    return combineLatest([
      this.deviceService.getAll(),
      this.sensorDataService.getAll(),
      this.vehicleDetectedService.getAll(),
    ]).pipe(
      map(([devices, sensorData, vehiclesDetected]) => {
        return devices.map((device) =>
          this.enrichDeviceWithMetrics(device, sensorData, vehiclesDetected),
        );
      }),
      catchError((error) => {
        console.error('Error loading device statuses:', error);
        return of([]);
      }),
      shareReplay(1),
    );
  }

  /**
   * Enrich a device with real metrics
   */
  private enrichDeviceWithMetrics(
    device: Device,
    allSensorData: SensorData[],
    allVehiclesDetected: VehicleDetected[],
  ): DeviceStatusInfo {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    let deviceSensorData: SensorData[] = [];
    let deviceVehiclesDetected: VehicleDetected[] = [];
    let lastActivity: Date | null = null;

    if (device.type === DeviceType.SENSOR) {
      deviceSensorData = allSensorData.filter(
        (sd) => sd.deviceId === device.id || sd.device?.id === device.id,
      );
      if (deviceSensorData.length > 0) {
        lastActivity = new Date(
          Math.max(...deviceSensorData.map((sd) => new Date(sd.timestamp).getTime())),
        );
      }
    } else if (device.type === DeviceType.CAMERA) {
      deviceVehiclesDetected = allVehiclesDetected.filter((vd) => vd.device?.id === device.id);
      if (deviceVehiclesDetected.length > 0) {
        lastActivity = new Date(
          Math.max(...deviceVehiclesDetected.map((vd) => new Date(vd.timestamp).getTime())),
        );
      }
    }

    const isOnline = device.state === 'ACTIVE';

    const metrics = this.calculateDeviceMetrics(
      device,
      deviceSensorData,
      deviceVehiclesDetected,
      last24Hours,
    );

    return {
      id: device.id,
      name: device.name,
      type: device.type,
      status: device.state as 'ACTIVE' | 'INACTIVE' | 'ERROR' | 'MAINTENANCE',
      location: device.location,
      lastActivity,
      isOnline,
      dataPoints: deviceSensorData.length + deviceVehiclesDetected.length,
      ...metrics,
    };
  }

  /**
   * Calculate device metrics - currently only returns an empty object
   * Specific sensor data will be displayed in another view
   */
  private calculateDeviceMetrics(
    _device: Device,
    _sensorData: SensorData[],
    _vehiclesDetected: VehicleDetected[],
    _last24Hours: Date,
  ): Partial<DeviceStatusInfo> {
    return {};
  }
}
