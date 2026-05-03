/**
 * Geographic monitoring location with coordinates and optional description.
 * @interface Location
 */
export interface Location {
  /** Unique identifier for the location. */
  id: number;
  /** Latitude coordinate. */
  latitude: number;
  /** Longitude coordinate. */
  longitude: number;
  /** Human-readable location description, may be null if not provided. */
  description?: string | null;
}

/**
 * Search criteria filter for location queries.
 * @interface LocationSearchCriteria
 */
export interface LocationSearchCriteria {
  /** Filter locations by description text. */
  description?: string;
  /** Search locations by keyword (matches description). */
  keyword?: string;
  /** Filter by latitude coordinate. */
  latitude?: number;
  /** Filter by longitude coordinate. */
  longitude?: number;
  /** Filter locations within radius in kilometers. */
  radiusKm?: number;
}

/**
 * Extended location information with aggregated metrics.
 * @interface LocationDetails
 * @extends {Location}
 */
export interface LocationDetails extends Location {
  /** Number of devices deployed at this location. */
  deviceCount?: number;
  /** Number of vehicle detections recorded at this location. */
  vehicleDetectionCount?: number;
  /** Timestamp of the most recent activity at this location. */
  lastActivity?: Date;
}

/**
 * Aggregated location monitoring statistics.
 * @interface LocationStats
 */
export interface LocationStats {
  /** Total number of locations in the system. */
  total: number;
  /** Number of locations with active devices. */
  activeLocations: number;
  /** Total vehicle detections across all locations. */
  totalVehicleDetections: number;
  /** Timestamp when statistics were last calculated. */
  lastUpdated: Date;
}
