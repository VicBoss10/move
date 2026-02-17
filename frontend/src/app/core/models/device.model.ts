/**
 * Modelo para Dispositivos (Cámaras, Sensores)
 * Corresponde a Device en el backend
 */
export enum DeviceType {
  CAMERA = 'CAMERA',
  SENSOR = 'SENSOR',
  THERMAL = 'THERMAL'
}

export enum DeviceState {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  MAINTENANCE = 'MAINTENANCE',
  ERROR = 'ERROR'
}

export interface Device {
  id: number;
  name: string;
  type: DeviceType;
  state: DeviceState;
  location: {
    id: number;
    latitude: number;
    length: number;
    description?: string;
  };
}

/**
 * Criterios de búsqueda para dispositivos
 */
export interface DeviceSearchCriteria {
  type?: DeviceType;
  state?: DeviceState;
  locationId?: number;
}

/**
 * Estadísticas de dispositivos
 */
export interface DeviceStats {
  total: number;
  active: number;
  inactive: number;
  byType: {
    camera: number;
    sensor: number;
    thermal: number;
  };
  lastUpdated: Date;
}
