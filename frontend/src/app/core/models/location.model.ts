/**
 * Modelo para Ubicaciones de monitoreo
 * Corresponde a Location en el backend
 */
export interface Location {
  id: number;
  latitude: number;
  length: number; // longitude
  description?: string;
}

/**
 * Criterios de búsqueda para ubicaciones
 */
export interface LocationSearchCriteria {
  description?: string;
  keyword?: string;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
}

/**
 * Ubicación con información extendida
 */
export interface LocationDetails extends Location {
  deviceCount?: number;
  vehicleDetectionCount?: number;
  lastActivity?: Date;
}

/**
 * Estadísticas de ubicaciones
 */
export interface LocationStats {
  total: number;
  activeLocations: number;
  totalVehicleDetections: number;
  lastUpdated: Date;
}
