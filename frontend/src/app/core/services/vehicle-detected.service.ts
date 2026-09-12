import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { tap, map, catchError } from 'rxjs/operators';
import { ApiService } from './api.service';
import { BaseDataService } from './base-data.service';
import { VehicleDetected, VehicleSearchCriteria, VehicleStats } from '../models/vehicle.model';
import { QueryParamsBuilder } from '../utils/query-params.builder';

/**
 * Vehicle detection management service for detected vehicle events.
 * Extends BaseDataService for CRUD operations and adds advanced search and statistics.
 *
 * @class VehicleDetectedService
 * @extends BaseDataService<VehicleDetected>
 * @injectable root
 */
@Injectable({
  providedIn: 'root',
})
export class VehicleDetectedService extends BaseDataService<VehicleDetected> {
  /**
   * API endpoint path for vehicle detection resources.
   * @protected
   */
  protected endpoint = 'vehicles';

  constructor(apiService: ApiService) {
    super(apiService);
    this.cacheDuration = 5 * 60 * 1000;
  }

  /**
   * Searches for detected vehicles matching the provided criteria.
   * Supports filtering by vehicle type, device IDs, and date range.
   * @param criteria - Search filter criteria
   * @returns Observable with matching detected vehicles
   */
  search(criteria: VehicleSearchCriteria): Observable<VehicleDetected[]> {
    const queryParams = new QueryParamsBuilder()
      .addIfPresent('type', criteria.type)
      .addIfPresent('deviceIds', criteria.deviceIds?.join(','))
      .addDateRange(criteria.start, criteria.end)
      .build();

    return this.apiService.get<VehicleDetected[]>(`/${this.endpoint}/search`, queryParams).pipe(
      map((data) => {
        if (Array.isArray(data)) {
          return data;
        }
        console.warn('Backend retornó respuesta no-JSON:', data);
        this.setServiceError(null, 'Respuesta inválida del backend para vehículos');
        return [];
      }),
      catchError((error) => {
        if (
          error &&
          (error.message?.includes('Http failure during parsing') ||
            error.message?.includes('Unexpected token'))
        ) {
          console.warn('No hay datos disponibles para los criterios especificados');
          this.clearServiceError();
          return of([]);
        }
        this.setServiceError(error, 'Error al buscar vehículos');
        return throwError(() => error);
      }),
      tap((data) => {
        this.dataSubject.next(data);
        this.clearServiceError();
      }),
    );
  }

  /**
   * Obtains statistics about detected vehicles based on the currently cached data.
   * Calculates total count, counts by vehicle type, and today's detections.
   * @returns VehicleStats with aggregated statistics
   */
  getStats(): VehicleStats {
    const vehicles = this.getCachedData();
    return {
      total: vehicles.length,
      byType: {
        car: vehicles.filter((v) => v.vehicleType === 'CAR').length,
        truck: vehicles.filter((v) => v.vehicleType === 'TRUCK').length,
        bus: vehicles.filter((v) => v.vehicleType === 'BUS').length,
        motorcycle: vehicles.filter((v) => v.vehicleType === 'MOTORCYCLE').length,
      },
      todayDetections: vehicles.filter((v) => {
        const today = new Date();
        const vDate = new Date(v.timestamp);
        return vDate.toDateString() === today.toDateString();
      }).length,
      lastUpdated: new Date(),
    };
  }

  deleteAll(): Observable<void> {
    return this.apiService.delete(`/${this.endpoint}`).pipe(
      tap(() => this.invalidateCache()),
      map(() => undefined),
    );
  }

  deleteByDateRange(start: Date, end: Date): Observable<void> {
    return this.apiService
      .delete<void>(`/${this.endpoint}/range?start=${start.toISOString()}&end=${end.toISOString()}`)
      .pipe(
        tap(() => this.invalidateCache()),
        map(() => undefined),
      );
  }

  deleteByLocation(locationId: number): Observable<void> {
    return this.apiService.delete<void>(`/${this.endpoint}/location/${locationId}`).pipe(
      tap(() => this.invalidateCache()),
      map(() => undefined),
    );
  }

  getFirstRecord(): Observable<VehicleDetected> {
    return this.apiService.get<VehicleDetected>(`/${this.endpoint}/first`);
  }

  getLastRecord(): Observable<VehicleDetected> {
    return this.apiService.get<VehicleDetected>(`/${this.endpoint}/last`);
  }
}
