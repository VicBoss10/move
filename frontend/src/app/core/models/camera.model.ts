export enum StreamType {
  USB = 'USB',
  URL = 'URL',
  RTSP = 'RTSP',
  YOUTUBE = 'YOUTUBE'
}

export interface Camera {
  id: number;
  device: {
    id: number;
    name: string;
    type: string;
    state: string;
    location: {
      id: number;
      description: string;
      latitude: number;
      length: number;
    };
  };
  streamType: StreamType;
  source: string;
}

export interface StreamStartRequest {
  cameraId: number;
}

export interface StreamResponse {
  sessionId: string;
  streamUrl: string;
  status: string;
  streamType: string;
  detectionCount: number;
}

export interface StreamStopResponse {
  message: string;
  sessionId: string;
}
