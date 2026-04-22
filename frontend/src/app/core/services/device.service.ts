import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { ApiService } from './api.service';
import { BaseDataService } from './base-data.service';
import {
  Device,
  DeviceSearchCriteria,
  DeviceStats,
  RegisterDeviceRequest,
} from '../models/device.model';
import { QueryParamsBuilder } from '../utils/query-params.builder';

/**
 * Servicio para gestionar Dispositivos (Cámaras, Sensores)
 * Hereda funcionalidad CRUD base de BaseDataService
 * Agrega búsqueda avanzada y cálculo de estadísticas
 *
 * @service
 * @providedIn root
 */
@Injectable({
  providedIn: 'root',
})
export class DeviceService extends BaseDataService<Device> {
  /**
   * Endpoint del API para dispositivos
   */
  protected endpoint = 'devices';

  constructor(apiService: ApiService) {
    super(apiService);
    // Datos de dispositivos son relativamente estáticos - TTL de 15 minutos
    this.cacheDuration = 15 * 60 * 1000;
  }

  /**
   * Busca dispositivos con criterios específicos
   * @param criteria - Criterios de búsqueda
   * @returns Observable<Device[]>
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
        this.setServiceError(error, 'Error al buscar dispositivos');
        return throwError(() => error);
      }),
    );
  }

  /**
   * Obtiene estadísticas de dispositivos
   */
  getStats(): DeviceStats {
    const devices = this.getCachedData();
    return {
      total: devices.length,
      active: devices.filter((d) => d.state === 'ACTIVE').length,
      inactive: devices.filter((d) => d.state === 'INACTIVE').length,
      byType: {
        camera: devices.filter((d) => d.type === 'CAMERA').length,
        sensor: devices.filter((d) => d.type === 'SENSOR').length,
        thermal: devices.filter((d) => d.type === 'THERMAL').length,
      },
      lastUpdated: new Date(),
    };
  }

  /**
   * Registra un dispositivo completo (Device + Camera si aplica)
   * @param deviceData - Datos del dispositivo a registrar
   * @returns Observable<string> con mensaje de confirmación
   */
  register(deviceData: any): Observable<import('../models/device.model').RegisterDeviceResponse> {
    return this.apiService
      .post<
        import('../models/device.model').RegisterDeviceResponse
      >(`/${this.endpoint}`, deviceData)
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
