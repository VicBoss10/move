import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { tap, map, catchError } from 'rxjs/operators';
import { HttpParams } from '@angular/common/http';
import { ApiService } from './api.service';
import { BaseDataService } from './base-data.service';
import { VehicleDetected, VehicleSearchCriteria, VehicleStats } from '../models/vehicle.model';
import { QueryParamsBuilder } from '../utils/query-params.builder';

/**
 * Servicio para gestionar Vehículos Detectados
 * Hereda funcionalidad CRUD base de BaseDataService
 * Agrega búsqueda avanzada y cálculo de estadísticas
 * 
 * @service
 * @providedIn root
 */
@Injectable({
  providedIn: 'root'
})
export class VehicleDetectedService extends BaseDataService<VehicleDetected> {
  /**
   * Endpoint del API para vehículos
   */
  protected endpoint = 'vehicles';

  constructor(apiService: ApiService) {
    super(apiService);
    // Datos de vehículos son medianamente dinámicos - TTL de 5 minutos
    this.cacheDuration = 5 * 60 * 1000;
  }

  /**
   * Busca vehículos con criterios específicos
   * @param criteria - Criterios de búsqueda
   * @returns Observable<VehicleDetected[]>
   */
  search(criteria: VehicleSearchCriteria): Observable<VehicleDetected[]> {
    const queryParams = new QueryParamsBuilder()
      .addIfPresent('type', criteria.type)
      .addIfPresent('locationId', criteria.locationId)
      .addDateRange(criteria.start, criteria.end)
      .build();

    return this.apiService.get<VehicleDetected[]>(`/${this.endpoint}/search`, queryParams).pipe(
      map(data => {
        // Si data es un array, usarlo normalmente
        if (Array.isArray(data)) {
          return data;
        }
        // Si no es array (backend retornó mensaje de texto), retornar array vacío
        console.warn('Backend retornó respuesta no-JSON:', data);
        this.setServiceError(null, 'Respuesta inválida del backend para vehículos');
        return [];
      }),
      catchError((error) => {
        // Manejo de errores de parsing JSON (cuando backend retorna texto plano)
        // Esto ocurre cuando no hay datos y el backend retorna un mensaje de texto
        if (error && (error.message?.includes('Http failure during parsing') || error.message?.includes('Unexpected token'))) {
          console.warn('No hay datos disponibles para los criterios especificados');
          this.clearServiceError();
          return of([]);
        }
        // Re-lanzar otros errores
        this.setServiceError(error, 'Error al buscar vehículos');
        return throwError(() => error);
      }),
      tap(data => {
        this.dataSubject.next(data);
        this.clearServiceError();
      })
    );
  }

  /**
   * Obtiene estadísticas de vehículos desde los datos actual
   */
  getStats(): VehicleStats {
    const vehicles = this.getCachedData();
    return {
      total: vehicles.length,
      byType: {
        car: vehicles.filter(v => v.vehicleType === 'CAR').length,
        truck: vehicles.filter(v => v.vehicleType === 'TRUCK').length,
        bus: vehicles.filter(v => v.vehicleType === 'BUS').length,
        motorcycle: vehicles.filter(v => v.vehicleType === 'MOTORCYCLE').length,
      },
      todayDetections: vehicles.filter(v => {
        const today = new Date();
        const vDate = new Date(v.timestamp);
        return vDate.toDateString() === today.toDateString();
      }).length,
      lastUpdated: new Date()
    };
  }

  deleteAll(): Observable<any> {
    return this.apiService.deleteText(`/${this.endpoint}`).pipe(
      tap(() => this.invalidateCache())
    );
  }

  deleteByDateRange(start: Date, end: Date): Observable<any> {
    const params = new HttpParams()
      .set('start', start.toISOString())
      .set('end', end.toISOString());
    return this.apiService['http'].delete(
      `${this.apiService['apiUrl']}/${this.endpoint}/range`,
      { params, responseType: 'text' }
    ).pipe(tap(() => this.invalidateCache()));
  }

  getFirstRecord(): Observable<VehicleDetected> {
    return this.apiService.get<VehicleDetected>(`/${this.endpoint}/first`);
  }

  getLastRecord(): Observable<VehicleDetected> {
    return this.apiService.get<VehicleDetected>(`/${this.endpoint}/last`);
  }
}
