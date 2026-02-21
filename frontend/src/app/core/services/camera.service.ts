import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { BaseDataService } from './base-data.service';
import { Camera, StreamStartRequest, StreamResponse, StreamStopResponse, StreamType } from '../models/camera.model';

@Injectable({
  providedIn: 'root'
})
export class CameraService extends BaseDataService<Camera> {
  protected endpoint = 'cameras';

  constructor(apiService: ApiService) {
    super(apiService);
    this.cacheDuration = 10 * 60 * 1000;
  }

  getCameraByDeviceId(deviceId: number): Observable<Camera> {
    return this.apiService.get<Camera>(`/${this.endpoint}/device/${deviceId}`);
  }

  getCamerasByStreamType(streamType: StreamType): Observable<Camera[]> {
    return this.apiService.get<Camera[]>(`/${this.endpoint}/type/${streamType}`);
  }

  startStream(cameraId: number): Observable<StreamResponse> {
    const request: StreamStartRequest = { cameraId };
    return this.apiService.post<StreamResponse>('/streams/start', request);
  }

  stopStream(sessionId: string): Observable<StreamStopResponse> {
    return this.apiService.post<StreamStopResponse>(`/streams/stop/${sessionId}`, null);
  }

  getStreamStatus(sessionId: string): Observable<StreamResponse> {
    return this.apiService.get<StreamResponse>(`/streams/status/${sessionId}`);
  }
}
