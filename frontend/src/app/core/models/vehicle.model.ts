/**
 * Modelo para Vehículos Detectados
 * Corresponde a VehicleDetected en el backend
 */
export enum VehicleType {
  CAR = 'CAR',
  TRUCK = 'TRUCK',
  BUS = 'BUS',
  MOTORCYCLE = 'MOTORCYCLE'
}

export interface VehicleDetected {
  id: number;
  vehicleType: VehicleType;
  timestamp: Date;
  location: {
    id: number;
    latitude: number;
    longitude: number;
    /**
     * Puede no existir o venir null dependiendo del endpoint.
     */
    description?: string | null;
  };
}

/**
 * Criterios de búsqueda para vehículos
 */
export interface VehicleSearchCriteria {
  type?: VehicleType;
  locationId?: number;
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
