import { Injectable } from '@angular/core';
import { Observable, throwError, of, BehaviorSubject } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { ApiService } from './api.service';
import { BaseDataService } from './base-data.service';
import {
  Camera,
  StreamStartRequest,
  StreamResponse,
  StreamStopResponse,
  StreamType,
} from '../models/camera.model';

/**
 * Camera management and stream control service.
 * Extends BaseDataService for CRUD operations and adds stream lifecycle management.
 * Handles camera data fetching, streaming sessions, and stream status queries.
 *
 * @class CameraService
 * @extends BaseDataService<Camera>
 * @injectable root
 */
@Injectable({
  providedIn: 'root',
})
export class CameraService extends BaseDataService<Camera> {
  /**
   * API endpoint path for camera resources.
   * @protected
   */
  protected endpoint = 'cameras';
  /**
   * Subject emitting refresh events for camera list updates.
   * @private
   */
  private refreshSubject = new BehaviorSubject<void>(undefined);
  /**
   * Observable stream of refresh events for external subscribers.
   */
  refresh$ = this.refreshSubject.asObservable();

  constructor(apiService: ApiService) {
    super(apiService);
    this.cacheDuration = 10 * 60 * 1000;
  }

  /**
   * Triggers a cache invalidation and fresh data fetch for the camera list.
   * Notifies subscribers of the refresh event.
   */
  triggerRefresh(): void {
    this.refreshSubject.next();
    this.refresh()
      .pipe(
        catchError((err) => {
          this.setServiceError(err, 'Error refreshing cameras');
          return of([] as Camera[]);
        }),
      )
      .subscribe();
  }

  /**
   * Fetches a single camera by its associated device identifier.
   *
   * @param {number} deviceId - Device identifier.
   * @returns {Observable<Camera>} Observable with the camera details.
   */
  getCameraByDeviceId(deviceId: number): Observable<Camera> {
    return this.apiService.get<Camera>(`/${this.endpoint}/device/${deviceId}`).pipe(
      tap(() => this.clearServiceError()),
      catchError((error) => {
        this.setServiceError(error, 'Error fetching camera by device');
        return throwError(() => error);
      }),
    );
  }

  /**
   * Fetches cameras filtered by stream type.
   *
   * @param {StreamType} streamType - Video stream protocol or source type.
   * @returns {Observable<Camera[]>} Observable with filtered cameras.
   */
  getCamerasByStreamType(streamType: StreamType): Observable<Camera[]> {
    return this.apiService.get<Camera[]>(`/${this.endpoint}/type/${streamType}`).pipe(
      tap(() => this.clearServiceError()),
      catchError((error) => {
        this.setServiceError(error, 'Error filtering cameras by stream type');
        return throwError(() => error);
      }),
    );
  }

  /**
   * Initiates a live video stream session for a camera.
   *
   * @param {number} cameraId - Camera identifier to stream from.
   * @returns {Observable<StreamResponse>} Observable with stream session details.
   */
  startStream(cameraId: number): Observable<StreamResponse> {
    const request: StreamStartRequest = { cameraId };
    return this.apiService.post<StreamResponse>('/streams/start', request).pipe(
      tap(() => this.clearServiceError()),
      catchError((error) => {
        this.setServiceError(error, 'Error starting stream');
        return throwError(() => error);
      }),
    );
  }

  /**
   * Terminates an active streaming session.
   *
   * @param {string} sessionId - Unique identifier of the streaming session.
   * @returns {Observable<StreamStopResponse>} Observable with stop confirmation.
   */
  stopStream(sessionId: string): Observable<StreamStopResponse> {
    return this.apiService.post<StreamStopResponse>(`/streams/stop/${sessionId}`, null).pipe(
      tap(() => this.clearServiceError()),
      catchError((error) => {
        this.setServiceError(error, 'Error stopping stream');
        return throwError(() => error);
      }),
    );
  }

  /**
   * Queries the current status of an active streaming session.
   *
   * @param {string} sessionId - Unique identifier of the streaming session.
   * @returns {Observable<StreamResponse>} Observable with current stream status.
   */
  getStreamStatus(sessionId: string): Observable<StreamResponse> {
    return this.apiService.get<StreamResponse>(`/streams/status/${sessionId}`).pipe(
      tap(() => this.clearServiceError()),
      catchError((error) => {
        this.setServiceError(error, 'Error querying stream status');
        return throwError(() => error);
      }),
    );
  }

  /**
   * Fetches the currently active stream session for a specific device.
   *
   * @param {number} deviceId - Device identifier.
   * @returns {Observable<StreamResponse>} Observable with active stream details.
   */
  getActiveStreamByDevice(deviceId: number): Observable<StreamResponse> {
    return this.apiService.get<StreamResponse>(`/streams/active/device/${deviceId}`).pipe(
      tap(() => this.clearServiceError()),
      catchError((error) => {
        this.setServiceError(error, 'Error fetching active stream by device');
        return throwError(() => error);
      }),
    );
  }

  /**
   * Clears all active streaming sessions from the database.
   * WARNING: This will terminate all active streams.
   *
   * @returns {Observable<any>} Observable with clear confirmation.
   */
  clearAllSessions(): Observable<any> {
    return this.apiService.delete('/streams/clear-all').pipe(
      tap(() => this.clearServiceError()),
      catchError((error) => {
        this.setServiceError(error, 'Error clearing stream sessions');
        return throwError(() => error);
      }),
    );
  }
}
