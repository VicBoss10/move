/**
 * Modelo para Vehículos Detectados
 * Corresponde a VehicleDetected en el backend
 */
export enum VehicleType {
  CAR = 'CAR',
  TRUCK = 'TRUCK',
  BUS = 'BUS',
  MOTORCYCLE = 'MOTORCYCLE',
}

export interface VehicleDetected {
  id: number;
  vehicleType: VehicleType;
  timestamp: Date;
  device: {
    id: number;
    name?: string;
    type?: string;
    location?: {
      id: number;
      latitude?: number;
      longitude?: number;
      description?: string | null;
    };
  };
  // Para compatibilidad con templates que esperan location al nivel superior
  location?: {
    id: number;
    latitude?: number;
    longitude?: number;
    description?: string | null;
  };
}

/**
 * Criterios de búsqueda para vehículos
 */
export interface VehicleSearchCriteria {
  type?: VehicleType;
  deviceId?: number;
  start?: Date;
  end?: Date;
}

/**
 * Estadísticas de vehículos
 */
export interface VehicleStats {
  total: number;
  byType: {
    car: number;
    truck: number;
    bus: number;
    motorcycle: number;
  };
  todayDetections: number;
  lastUpdated: Date;
}
