/**
 * Device hardware types in the MOVE monitoring system.
 * @enum {string}
 */
export enum DeviceType {
  CAMERA = 'CAMERA',
  SENSOR = 'SENSOR',
  THERMAL = 'THERMAL',
}

/**
 * Device operational states.
 * @enum {string}
 */
export enum DeviceState {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  FAILING = 'FAILING',
}

/**
 * Supported video streaming protocols and sources for camera devices.
 * @typedef {string} DeviceStreamType
 */
export type DeviceStreamType = 'RTSP' | 'URL' | 'USB' | 'YOUTUBE';

/**
 * Device entity representing a camera, sensor, or thermal camera in the system.
 * @interface Device
 */
export interface Device {
  /** Unique identifier for the device. */
  id: number;
  /** Human-readable device name. */
  name: string;
  /** Type of device (CAMERA, SENSOR, or THERMAL). */
  type: DeviceType;
  /** Current operational state of the device. */
  state: DeviceState;
  /** Geographic location where the device is deployed. */
  location: {
    /** Location identifier. */
    id: number;
    /** Latitude coordinate. */
    latitude: number;
    /** Longitude coordinate. */
    longitude: number;
    /** Location description, may be null if not provided. */
    description?: string | null;
  };
}

/**
 * Search criteria filter for device queries.
 * @interface DeviceSearchCriteria
 */
export interface DeviceSearchCriteria {
  /** Filter devices by type. */
  type?: DeviceType;
  /** Filter devices by operational state. */
  state?: DeviceState;
  /** Filter devices deployed at a specific location. */
  locationId?: number;
}

/**
 * Aggregated device statistics.
 * @interface DeviceStats
 */
export interface DeviceStats {
  /** Total number of devices in the system. */
  total: number;
  /** Number of active devices. */
  active: number;
  /** Number of inactive devices. */
  inactive: number;
  /** Device count breakdown by type. */
  byType: {
    /** Number of camera devices. */
    camera: number;
    /** Number of sensor devices. */
    sensor: number;
    /** Number of thermal devices. */
    thermal: number;
  };
  /** Timestamp when statistics were last calculated. */
  lastUpdated: Date;
}

/**
 * Request payload for registering a new camera device.
 * Camera devices require stream type and source information.
 * @typedef {Object} CameraRegistrationRequest
 */
interface CameraRegistrationRequest {
  /** Device name for display. */
  name: string;
  /** Device type (CAMERA). */
  type: DeviceType.CAMERA;
  /** Initial device state. */
  state: DeviceState;
  /** Location identifier where device will be deployed. */
  locationId: number;
  /** Video stream protocol or source type. */
  streamType: DeviceStreamType;
  /** Stream source URL or identifier. */
  source: string;
}

/**
 * Request payload for registering a non-camera device (sensor or thermal).
 * These devices do not require stream information.
 * @typedef {Object} NonCameraRegistrationRequest
 */
interface NonCameraRegistrationRequest {
  /** Device name for display. */
  name: string;
  /** Device type (SENSOR or THERMAL). */
  type: Exclude<DeviceType, DeviceType.CAMERA>;
  /** Initial device state. */
  state: DeviceState;
  /** Location identifier where device will be deployed. */
  locationId: number;
}

/**
 * Union type for standard device registration requests.
 * @typedef {CameraRegistrationRequest | NonCameraRegistrationRequest} RegisterDeviceRequest
 */
export type RegisterDeviceRequest = CameraRegistrationRequest | NonCameraRegistrationRequest;

/**
 * Keycloak OAuth2 client credentials for device authentication.
 * Provided during device self-registration for provisioning.
 * @interface KeycloakClientInfo
 */
export interface KeycloakClientInfo {
  /** Keycloak client ID for the device. */
  clientId: string | null;
  /** Keycloak client secret for the device. */
  clientSecret: string | null;
  /** Internal Keycloak identifier. */
  internalId?: string | null;
}

/**
 * Backend response to a device registration request.
 * @interface RegisterDeviceResponse
 */
export interface RegisterDeviceResponse {
  /** Identifier of the newly registered device. */
  deviceId: number;
  /** Status message from the registration process. */
  message: string;
  /** Keycloak credentials if device registration succeeded. */
  keycloakClientInfo?: KeycloakClientInfo | null;
}

/**
 * Request payload for registering a sensor device with hardware details.
 * Extends standard registration with sensor-specific configuration.
 * @typedef {Object} RegisterSensorRequest
 */
export type RegisterSensorRequest = {
  /** Device name for display. */
  name: string;
  /** Device type (SENSOR). */
  type: DeviceType.SENSOR;
  /** Initial device state. */
  state: DeviceState;
  /** Location identifier where device will be deployed. */
  locationId: number;
  /** MAC address of the sensor device. */
  macAddress: string;
  /** Firmware version installed on the device. */
  firmwareVersion: string;
  /** WiFi SSID for device network connection. */
  wifiSsid?: string | null;
  /** WiFi password for device network connection. */
  wifiPassword?: string | null;
};

/**
 * Union type for all device registration payloads supported by the frontend.
 * Allows standard or sensor-specific registration requests.
 * @typedef {RegisterDeviceRequest | RegisterSensorRequest} RegisterDevicePayload
 */
export type RegisterDevicePayload = RegisterDeviceRequest | RegisterSensorRequest;
