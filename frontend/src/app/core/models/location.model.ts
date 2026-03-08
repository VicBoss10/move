/**
 * Modelo para Ubicaciones de monitoreo
 * Corresponde a Location en el backend
 */
export interface Location {
  id: number;
  latitude: number;
  longitude: number;
  /**
   * Campo opcional; puede venir como null cuando no se registró descripción.
   */
  description?: string | null;
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
  /** Cantidad opcional calculada en frontend o backend. */
  deviceCount?: number;
  /** Cantidad opcional agregada desde detecciones. */
  vehicleDetectionCount?: number;
  /** Puede no estar disponible para ubicaciones sin actividad. */
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
