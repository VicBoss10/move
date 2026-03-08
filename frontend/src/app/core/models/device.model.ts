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

/**
 * Tipos de stream válidos para registro de cámaras.
 * Se mantiene local para evitar acoplar este modelo al de cámara.
 */
export type DeviceStreamType = 'RTSP' | 'URL' | 'USB' | 'YOUTUBE';

export interface Device {
  id: number;
  name: string;
  type: DeviceType;
  state: DeviceState;
  location: {
    id: number;
    latitude: number;
    longitude: number;
    /**
     * Puede no venir en todas las respuestas o venir como null.
     */
    description?: string | null;
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

/**
 * DTO tipado para registrar dispositivos en backend.
 * Para cámaras exige streamType y source; para otros tipos no aplica.
 */
export type RegisterDeviceRequest =
  | {
      name: string;
      type: DeviceType.CAMERA;
      state: DeviceState;
      locationId: number;
      streamType: DeviceStreamType;
      source: string;
    }
  | {
      name: string;
      type: Exclude<DeviceType, DeviceType.CAMERA>;
      state: DeviceState;
      locationId: number;
    };
