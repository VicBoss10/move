import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { ApiService } from './api.service';
import { BaseDataService } from './base-data.service';

export interface Sensor {
  id: number;
  device?: { id: number };
  macAddress?: string;
}

@Injectable({
  providedIn: 'root',
})
export class SensorService extends BaseDataService<Sensor> {
  protected endpoint = 'sensors';

  constructor(apiService: ApiService) {
    super(apiService);
    this.cacheDuration = 10 * 60 * 1000;
  }

  getSensorByDeviceId(deviceId: number): Observable<Sensor> {
    return this.apiService.get<Sensor>(`/${this.endpoint}/device/${deviceId}`).pipe(
      tap(() => this.clearServiceError()),
      catchError((error) => {
        this.setServiceError(error, 'Error al obtener sensor por dispositivo');
        return throwError(() => error);
      }),
    );
  }
}
