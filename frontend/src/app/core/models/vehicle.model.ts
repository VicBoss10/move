/**
 * Vehicle classification types detected by the YOLO detection system.
 * @enum {string}
 */
export enum VehicleType {
  CAR = 'CAR',
  TRUCK = 'TRUCK',
  BUS = 'BUS',
  MOTORCYCLE = 'MOTORCYCLE',
  BICYCLE = 'BICYCLE',
}

/**
 * Vehicle detection event recorded when a vehicle is detected by a camera device.
 * @interface VehicleDetected
 */
export interface VehicleDetected {
  /** Unique identifier for the detection record. */
  id: number;
  /** Type of vehicle detected. */
  vehicleType: VehicleType;
  /** Timestamp when the vehicle was detected. */
  timestamp: Date;
  /** Device that captured the detection. */
  device: {
    /** Device identifier. */
    id: number;
    /** Display name of the device. */
    name?: string;
    /** Type of device (e.g., CAMERA). */
    type?: string;
    /** Geographic location of the device. */
    location?: {
      /** Location identifier. */
      id: number;
      /** Latitude coordinate. */
      latitude?: number;
      /** Longitude coordinate. */
      longitude?: number;
      /** Human-readable location description. */
      description?: string | null;
    };
  };
  /** Location data at root level for template compatibility. */
  location?: {
    /** Location identifier. */
    id: number;
    /** Latitude coordinate. */
    latitude?: number;
    /** Longitude coordinate. */
    longitude?: number;
    /** Human-readable location description. */
    description?: string | null;
  };
}

/**
 * Search criteria filter for vehicle detection queries.
 * @interface VehicleSearchCriteria
 */
export interface VehicleSearchCriteria {
  /** Filter detections by vehicle type. */
  type?: VehicleType;
  /** Filter detections by device identifiers. */
  deviceIds?: number[];
  /** Filter detections from this start date (inclusive). */
  start?: Date;
  /** Filter detections until this end date (inclusive). */
  end?: Date;
}

/**
 * Aggregated vehicle detection statistics.
 * @interface VehicleStats
 */
export interface VehicleStats {
  /** Total number of vehicle detections. */
  total: number;
  /** Detection count breakdown by vehicle type. */
  byType: {
    /** Number of cars detected. */
    car: number;
    /** Number of trucks detected. */
    truck: number;
    /** Number of buses detected. */
    bus: number;
    /** Number of motorcycles detected. */
    motorcycle: number;
  };
  /** Number of detections recorded today. */
  todayDetections: number;
  /** Timestamp when statistics were last calculated. */
  lastUpdated: Date;
}
