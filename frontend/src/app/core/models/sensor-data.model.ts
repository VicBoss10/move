/**
 * Modelo para Datos de Sensores
 * Corresponde a SensorData en el backend
 */
export interface SensorData {
  id: number;
  temperature: number; // °C
  humidity: number; // %
  co2: number; // ppm
  pm25: number; // µg/m³
  pm10: number; // µg/m³
  co: number; // ppm
  no2: number; // ppb
  nh3: number; // ppb
  timestamp: Date;
  deviceId: number;
  /**
   * Relación opcional expandida; algunos endpoints solo retornan deviceId.
   */
  device?: {
    id: number;
    name: string;
    /**
     * Ubicación opcional cuando el backend no hace join de location.
     */
    location?: {
      id: number;
      latitude: number;
      longitude: number;
      /** Puede ser null si la ubicación no tiene descripción. */
      description?: string | null;
    };
  };
}

/**
 * Criterios de búsqueda para datos de sensores
 */
export interface SensorDataSearchCriteria {
  minTemperature?: number;
  maxTemperature?: number;
  minHumidity?: number;
  maxHumidity?: number;
  minCo2?: number;
  maxCo2?: number;
  minPm25?: number;
  maxPm25?: number;
  minPm10?: number;
  maxPm10?: number;
  minCo?: number;
  maxCo?: number;
  minNo2?: number;
  maxNo2?: number;
  minNh3?: number;
  maxNh3?: number;
  deviceId?: number;
  locationId?: number;
  start?: Date;
  end?: Date;
  page?: number;
  size?: number;
}

/**
 * Estadísticas agregadas de sensores
 */
export interface SensorStats {
  temperature: { current: number; avg: number; min: number; max: number };
  humidity: { current: number; avg: number; min: number; max: number };
  co2: { current: number; avg: number; min: number; max: number };
  pm25: { current: number; avg: number; min: number; max: number };
  pm10: { current: number; avg: number; min: number; max: number };
  co: { current: number; avg: number; min: number; max: number };
  no2: { current: number; avg: number; min: number; max: number };
  nh3: { current: number; avg: number; min: number; max: number };
  dataPoints: number;
  lastUpdated: Date;
}

/**
 * Rango de valores para comparación
 */
export interface ValueRange {
  good: number;
  moderate: number;
  poor: number;
}

/**
 * Estados de calidad del aire
 */
export enum AirQualityStatus {
  GOOD = 'good',
  MODERATE = 'moderate',
  POOR = 'poor',
}
