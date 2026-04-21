import { Injectable } from '@angular/core';
import { Observable, throwError, of, BehaviorSubject } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { ApiService } from './api.service';
import { BaseDataService } from './base-data.service';
import { Camera, StreamStartRequest, StreamResponse, StreamStopResponse, StreamType } from '../models/camera.model';

@Injectable({
  providedIn: 'root'
})
export class CameraService extends BaseDataService<Camera> {
  protected endpoint = 'cameras';
  private refreshSubject = new BehaviorSubject<void>(undefined);
  refresh$ = this.refreshSubject.asObservable();

  constructor(apiService: ApiService) {
    super(apiService);
    this.cacheDuration = 10 * 60 * 1000;
  }

  triggerRefresh(): void {
    this.refreshSubject.next();
    // Invalidate cache and fetch fresh data so subscribers get updated lists
    this.refresh().pipe(
      catchError((err) => {
        this.setServiceError(err, 'Error refreshing cameras');
        return of([] as Camera[]);
      })
    ).subscribe();
  }

  getCameraByDeviceId(deviceId: number): Observable<Camera> {
    return this.apiService.get<Camera>(`/${this.endpoint}/device/${deviceId}`).pipe(
      tap(() => this.clearServiceError()),
      catchError((error) => {
        this.setServiceError(error, 'Error al obtener cámara por dispositivo');
        return throwError(() => error);
      })
    );
  }

  getCamerasByStreamType(streamType: StreamType): Observable<Camera[]> {
    return this.apiService.get<Camera[]>(`/${this.endpoint}/type/${streamType}`).pipe(
      tap(() => this.clearServiceError()),
      catchError((error) => {
        this.setServiceError(error, 'Error al filtrar cámaras por tipo de stream');
        return throwError(() => error);
      })
    );
  }

  startStream(cameraId: number): Observable<StreamResponse> {
    const request: StreamStartRequest = { cameraId };
    return this.apiService.post<StreamResponse>('/streams/start', request).pipe(
      tap(() => this.clearServiceError()),
      catchError((error) => {
        this.setServiceError(error, 'Error al iniciar stream');
        return throwError(() => error);
      })
    );
  }

  stopStream(sessionId: string): Observable<StreamStopResponse> {
    return this.apiService.post<StreamStopResponse>(`/streams/stop/${sessionId}`, null).pipe(
      tap(() => this.clearServiceError()),
      catchError((error) => {
        this.setServiceError(error, 'Error al detener stream');
        return throwError(() => error);
      })
    );
  }

  getStreamStatus(sessionId: string): Observable<StreamResponse> {
    return this.apiService.get<StreamResponse>(`/streams/status/${sessionId}`).pipe(
      tap(() => this.clearServiceError()),
      catchError((error) => {
        this.setServiceError(error, 'Error al consultar estado del stream');
        return throwError(() => error);
      })
    );
  }

  getActiveStreamByDevice(deviceId: number): Observable<StreamResponse> {
    return this.apiService.get<StreamResponse>(`/streams/active/device/${deviceId}`).pipe(
      tap(() => this.clearServiceError()),
      catchError((error) => {
        this.setServiceError(error, 'Error al obtener stream activo por device');
        return throwError(() => error);
      })
    );
  }

  override update(data: Camera): Observable<Camera> {
    return this.apiService.putText(`/${this.endpoint}`, data).pipe(
      map(() => data),
      tap(() => {
        this.invalidateCache();
        this.clearServiceError();
      }),
      catchError((error) => {
        this.setServiceError(error, 'Error al actualizar cámara');
        return throwError(() => error);
      })
    );
  }

  override delete(id: number): Observable<string> {
    return this.apiService.deleteText(`/${this.endpoint}/${id}`).pipe(
      tap(() => {
        this.invalidateCache();
        this.clearServiceError();
      }),
      catchError((error) => {
        this.setServiceError(error, 'Error al eliminar cámara');
        return throwError(() => error);
      })
    );
  }
}
