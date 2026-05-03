/**
 * Camera video stream type enumeration.
 * Specifies the protocol or source type for camera stream access.
 * @enum {string}
 */
export enum StreamType {
  USB = 'USB',
  URL = 'URL',
  RTSP = 'RTSP',
  YOUTUBE = 'YOUTUBE',
}

/**
 * Camera device with associated device and stream information.
 * Represents a camera connected to a specific location with stream configuration.
 * @interface Camera
 */
export interface Camera {
  /** Unique identifier for the camera. */
  id: number;
  /** Device associated with this camera. */
  device: {
    /** Device identifier. */
    id: number;
    /** Device display name. */
    name: string;
    /** Device type (e.g., "CAMERA"). */
    type: string;
    /** Current device operational state (e.g., "ACTIVE"). */
    state: string;
    /** Geographic location of the device. */
    location: {
      /** Location identifier. */
      id: number;
      /** Location description, may be null if not provided. */
      description: string | null;
      /** Latitude coordinate. */
      latitude: number;
      /** Longitude coordinate. */
      longitude: number;
    };
  };
  /** Video stream protocol or source type. */
  streamType: StreamType;
  /** Stream source URL or identifier. */
  source: string;
}

/**
 * Request to initiate a live stream from a camera device.
 * @interface StreamStartRequest
 */
export interface StreamStartRequest {
  /** Identifier of the camera to stream from. */
  cameraId: number;
}

/**
 * Response from a stream start request containing session and stream details.
 * @interface StreamResponse
 */
export interface StreamResponse {
  /** Unique identifier for the streaming session. */
  sessionId: string;
  /** URL to access the MJPEG stream. */
  streamUrl: string;
  /** Current status of the stream. */
  status: string;
  /** Type of stream (e.g., RTSP, URL, USB). */
  streamType: string;
  /** Number of vehicle detections recorded in this session. */
  detectionCount: number;
}

/**
 * Response from a stream stop request.
 * @interface StreamStopResponse
 */
export interface StreamStopResponse {
  /** Status message from the stop operation. */
  message: string;
  /** Session identifier of the stopped stream. */
  sessionId: string;
}
