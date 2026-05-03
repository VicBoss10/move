/**
 * Environmental sensor data reading from an IoT device.
 * Contains air quality and climate measurements at a specific point in time.
 * @interface SensorData
 */
export interface SensorData {
  /** Unique identifier for the sensor reading. */
  id: number;
  /** Temperature measurement in degrees Celsius. */
  temperature: number;
  /** Relative humidity percentage (0-100). */
  humidity: number;
  /** Carbon dioxide concentration in parts per million. */
  co2: number;
  /** Particulate matter 2.5 micrometers or smaller in µg/m³. */
  pm25: number;
  /** Particulate matter 10 micrometers or smaller in µg/m³. */
  pm10: number;
  /** Carbon monoxide concentration in parts per million. */
  co: number;
  /** Nitrogen dioxide concentration in parts per billion. */
  no2: number;
  /** Ammonia concentration in parts per billion. */
  nh3: number;
  /** Timestamp when the reading was recorded. */
  timestamp: Date;
  /** Identifier of the sensor device that recorded this reading. */
  deviceId: number;
  /** Device information; populated when endpoint includes device details. */
  device?: {
    /** Device identifier. */
    id: number;
    /** Device display name. */
    name: string;
    /** Geographic location of the device. */
    location?: {
      /** Location identifier. */
      id: number;
      /** Latitude coordinate. */
      latitude: number;
      /** Longitude coordinate. */
      longitude: number;
      /** Location description, may be null if not provided. */
      description?: string | null;
    };
  };
}

/**
 * Search criteria filter for sensor data queries.
 * Supports range-based filtering on all sensor parameters.
 * @interface SensorDataSearchCriteria
 */
export interface SensorDataSearchCriteria {
  /** Minimum temperature threshold in Celsius. */
  minTemperature?: number;
  /** Maximum temperature threshold in Celsius. */
  maxTemperature?: number;
  /** Minimum humidity threshold in percentage. */
  minHumidity?: number;
  /** Maximum humidity threshold in percentage. */
  maxHumidity?: number;
  /** Minimum CO2 threshold in ppm. */
  minCo2?: number;
  /** Maximum CO2 threshold in ppm. */
  maxCo2?: number;
  /** Minimum PM2.5 threshold in µg/m³. */
  minPm25?: number;
  /** Maximum PM2.5 threshold in µg/m³. */
  maxPm25?: number;
  /** Minimum PM10 threshold in µg/m³. */
  minPm10?: number;
  /** Maximum PM10 threshold in µg/m³. */
  maxPm10?: number;
  /** Minimum CO threshold in ppm. */
  minCo?: number;
  /** Maximum CO threshold in ppm. */
  maxCo?: number;
  /** Minimum NO2 threshold in ppb. */
  minNo2?: number;
  /** Maximum NO2 threshold in ppb. */
  maxNo2?: number;
  /** Minimum NH3 threshold in ppb. */
  minNh3?: number;
  /** Maximum NH3 threshold in ppb. */
  maxNh3?: number;
  /** Filter readings from a specific device. */
  deviceId?: number;
  /** Filter readings from a specific location. */
  locationId?: number;
  /** Filter readings from this start date (inclusive). */
  start?: Date;
  /** Filter readings until this end date (inclusive). */
  end?: Date;
  /** Zero-indexed page number for pagination. */
  page?: number;
  /** Number of results per page. */
  size?: number;
}

/**
 * Aggregated sensor statistics across multiple readings.
 * Includes current values, averages, and min/max ranges for each parameter.
 * @interface SensorStats
 */
export interface SensorStats {
  /** Temperature statistics (current, average, minimum, maximum). */
  temperature: { current: number; avg: number; min: number; max: number };
  /** Humidity statistics (current, average, minimum, maximum). */
  humidity: { current: number; avg: number; min: number; max: number };
  /** CO2 statistics (current, average, minimum, maximum). */
  co2: { current: number; avg: number; min: number; max: number };
  /** PM2.5 statistics (current, average, minimum, maximum). */
  pm25: { current: number; avg: number; min: number; max: number };
  /** PM10 statistics (current, average, minimum, maximum). */
  pm10: { current: number; avg: number; min: number; max: number };
  /** CO statistics (current, average, minimum, maximum). */
  co: { current: number; avg: number; min: number; max: number };
  /** NO2 statistics (current, average, minimum, maximum). */
  no2: { current: number; avg: number; min: number; max: number };
  /** NH3 statistics (current, average, minimum, maximum). */
  nh3: { current: number; avg: number; min: number; max: number };
  /** Total number of sensor readings included in the statistics. */
  dataPoints: number;
  /** Timestamp when statistics were last calculated. */
  lastUpdated: Date;
}

/**
 * Threshold ranges for air quality classification.
 * Defines boundaries between GOOD, MODERATE, and POOR air quality levels.
 * @interface ValueRange
 */
export interface ValueRange {
  /** Upper threshold for good air quality. */
  good: number;
  /** Upper threshold for moderate air quality. */
  moderate: number;
  /** Upper threshold for poor air quality. */
  poor: number;
}

/**
 * Air quality status classification based on sensor measurements.
 * @enum {string}
 */
export enum AirQualityStatus {
  GOOD = 'good',
  MODERATE = 'moderate',
  POOR = 'poor',
}
