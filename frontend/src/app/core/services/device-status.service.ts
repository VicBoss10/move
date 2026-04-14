import { Injectable } from '@angular/core';
import { Observable, combineLatest, of } from 'rxjs';
import { map, catchError, shareReplay } from 'rxjs/operators';
import { DeviceService } from './device.service';
import { SensorDataService } from './sensor-data.service';
import { VehicleDetectedService } from './vehicle-detected.service';
import { Device, DeviceType } from '../models/device.model';
import { SensorData } from '../models/sensor-data.model';
import { VehicleDetected } from '../models/vehicle.model';

export interface DeviceStatusInfo {
  id: number;
  name: string;
  type: DeviceType;
  status: 'ACTIVE' | 'INACTIVE' | 'ERROR' | 'MAINTENANCE';
  location: {
    id: number;
    latitude: number;
    longitude: number;
    description?: string | null;
  };
  // Información de estado
  lastActivity: Date | null;
  isOnline: boolean;
  dataPoints: number;
}

/**
 * Servicio que proporciona información de estado de dispositivos
 * 
 * Responsabilidad: Mostrar información de estado general (conectividad, ubicación, actividad)
 * NO incluye: Datos específicos de sensores (temperatura, CO2, etc.) o estadísticas de cámaras
 * 
 * Los datos específicos de cada dispositivo se muestran en vistas dedicadas.
 */
@Injectable({
  providedIn: 'root'
})
export class DeviceStatusService {

  constructor(
    private deviceService: DeviceService,
    private sensorDataService: SensorDataService,
    private vehicleDetectedService: VehicleDetectedService
  ) {}

  /**
   * Obtiene el estado completo de todos los dispositivos
   * Combina datos de dispositivos con métricas reales
   */
  getDeviceStatuses(): Observable<DeviceStatusInfo[]> {
    return combineLatest([
      this.deviceService.getAll(),
      this.sensorDataService.getAll(),
      this.vehicleDetectedService.getAll()
    ]).pipe(
      map(([devices, sensorData, vehiclesDetected]) => {
        return devices.map(device => this.enrichDeviceWithMetrics(device, sensorData, vehiclesDetected));
      }),
      catchError(error => {
        console.error('Error loading device statuses:', error);
        return of([]);
      }),
      shareReplay(1)
    );
  }

  /**
   * Enriquecer un dispositivo con métricas reales
   */
  private enrichDeviceWithMetrics(
    device: Device,
    allSensorData: SensorData[],
    allVehiclesDetected: VehicleDetected[]
  ): DeviceStatusInfo {

    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Datos específicos del dispositivo
    let deviceSensorData: SensorData[] = [];
    let deviceVehiclesDetected: VehicleDetected[] = [];
    let lastActivity: Date | null = null;

    if (device.type === DeviceType.SENSOR) {
      // Para sensores, obtener sus datos ambientales
      deviceSensorData = allSensorData.filter(sd => sd.deviceId === device.id || sd.device?.id === device.id);
      if (deviceSensorData.length > 0) {
        // Usar la fecha más reciente de todos los datos disponibles
        lastActivity = new Date(Math.max(...deviceSensorData.map(sd => new Date(sd.timestamp).getTime())));
      }
    } else if (device.type === DeviceType.CAMERA) {
      // Para cámaras, obtener detecciones del dispositivo
      deviceVehiclesDetected = allVehiclesDetected.filter(vd => vd.device?.id === device.id);
      if (deviceVehiclesDetected.length > 0) {
        // Usar la fecha más reciente de todos los datos disponibles
        lastActivity = new Date(Math.max(...deviceVehiclesDetected.map(vd => new Date(vd.timestamp).getTime())));
      }
    }

    // Calcular si está online (dispositivo ACTIVE = online)
    const isOnline = device.state === 'ACTIVE';

    // Calcular métricas específicas por tipo
    const metrics = this.calculateDeviceMetrics(device, deviceSensorData, deviceVehiclesDetected, last24Hours);

    return {
      id: device.id,
      name: device.name,
      type: device.type,
      status: device.state as 'ACTIVE' | 'INACTIVE' | 'ERROR' | 'MAINTENANCE',
      location: device.location,
      lastActivity,
      isOnline,
      dataPoints: deviceSensorData.length + deviceVehiclesDetected.length,
      ...metrics
    };
  }

  /**
   * Calcular métricas - actualmente solo devuelve un objeto vacío
   * Los datos específicos de sensores se mostrarán en otra vista
   */
  private calculateDeviceMetrics(
    device: Device,
    sensorData: SensorData[],
    vehiclesDetected: VehicleDetected[],
    last24Hours: Date
  ): Partial<DeviceStatusInfo> {
    // Las tarjetas de estado muestran solo información de estado
    // Los datos de sensores/cámaras se mostrarán en vistas específicas
    return {};
  }
}