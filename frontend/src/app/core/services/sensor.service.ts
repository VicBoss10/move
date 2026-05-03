import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { ApiService } from './api.service';
import { BaseDataService } from './base-data.service';

/**
 * Sensor device information with hardware identifiers.
 * @interface Sensor
 */
export interface Sensor {
  /** Unique sensor identifier. */
  id: number;
  /** Associated device information. */
  device?: { id: number };
  /** MAC address of the sensor hardware. */
  macAddress?: string;
}

/**
 * Sensor device management service.
 * Extends BaseDataService for CRUD operations and adds device-specific queries.
 *
 * @class SensorService
 * @extends BaseDataService<Sensor>
 * @injectable root
 */
@Injectable({
  providedIn: 'root',
})
export class SensorService extends BaseDataService<Sensor> {
  /**
   * API endpoint path for sensor resources.
   * @protected
   */
  protected endpoint = 'sensors';

  constructor(apiService: ApiService) {
    super(apiService);
    this.cacheDuration = 10 * 60 * 1000;
  }

  /**
   * Fetches a sensor by its associated device identifier.
   *
   * @param {number} deviceId - Device identifier.
   * @returns {Observable<Sensor>} Observable with the sensor details.
   */
  getSensorByDeviceId(deviceId: number): Observable<Sensor> {
    return this.apiService.get<Sensor>(`/${this.endpoint}/device/${deviceId}`).pipe(
      tap(() => this.clearServiceError()),
      catchError((error) => {
        this.setServiceError(error, 'Error fetching sensor by device');
        return throwError(() => error);
      }),
    );
  }
}
