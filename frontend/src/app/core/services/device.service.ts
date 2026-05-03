import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { ApiService } from './api.service';
import { BaseDataService } from './base-data.service';
import {
  Device,
  DeviceSearchCriteria,
  DeviceStats,
  RegisterDevicePayload,
  RegisterDeviceResponse,
  DeviceType,
  DeviceState,
} from '../models/device.model';
import { QueryParamsBuilder } from '../utils/query-params.builder';

/**
 * Device management service for cameras, sensors, and thermal devices.
 * Extends BaseDataService for CRUD operations and adds advanced search and statistics.
 *
 * @class DeviceService
 * @extends BaseDataService<Device>
 * @injectable root
 */
@Injectable({
  providedIn: 'root',
})
export class DeviceService extends BaseDataService<Device> {
  /**
   * API endpoint path for device resources.
   * @protected
   */
  protected endpoint = 'devices';

  constructor(apiService: ApiService) {
    super(apiService);
    this.cacheDuration = 15 * 60 * 1000;
  }

  /**
   * Searches for devices matching the provided criteria.
   * Supports filtering by device type, operational state, and location.
   *
   * @param {DeviceSearchCriteria} criteria - Search filter criteria.
   * @returns {Observable<Device[]>} Observable with matching devices.
   */
  search(criteria: DeviceSearchCriteria): Observable<Device[]> {
    const queryParams = new QueryParamsBuilder()
      .addIfPresent('type', criteria.type)
      .addIfPresent('state', criteria.state)
      .addIfPresent('locationId', criteria.locationId)
      .build();

    return this.apiService.get<Device[]>(`/${this.endpoint}/search`, queryParams).pipe(
      tap((data) => {
        this.dataSubject.next(data);
        this.clearServiceError();
      }),
      catchError((error) => {
        this.setServiceError(error, 'Error searching devices');
        return throwError(() => error);
      }),
    );
  }

  /**
   * Calculates aggregated device statistics from cached data.
   * Returns counts by type and operational state.
   *
   * @returns {DeviceStats} Aggregated device statistics.
   */
  getStats(): DeviceStats {
    const devices = this.getCachedData();
    return {
      total: devices.length,
      active: devices.filter((d) => d.state === DeviceState.ACTIVE).length,
      inactive: devices.filter((d) => d.state === DeviceState.INACTIVE).length,
      byType: {
        camera: devices.filter((d) => d.type === DeviceType.CAMERA).length,
        sensor: devices.filter((d) => d.type === DeviceType.SENSOR).length,
        thermal: devices.filter((d) => d.type === DeviceType.THERMAL).length,
      },
      lastUpdated: new Date(),
    };
  }

  /**
   * Registra un dispositivo completo (Device + Camera si aplica)
   * @param deviceData - Datos del dispositivo a registrar
   * @returns Observable<string> con mensaje de confirmación
   */
  register(deviceData: unknown): Observable<RegisterDeviceResponse> {
    // Aceptamos `unknown` para facilitar llamadas desde formularios; se castea
    // a `RegisterDevicePayload` al enviar al backend.
    return this.apiService
      .post<RegisterDeviceResponse>(`/${this.endpoint}`, deviceData as RegisterDevicePayload)
      .pipe(
        tap(() => {
          // Invalidar caché para forzar recarga
          this.invalidateCache();
          this.clearServiceError();
        }),
        catchError((error) => {
          this.setServiceError(error, 'Error al registrar dispositivo');
          return throwError(() => error);
        }),
      );
  }
}
