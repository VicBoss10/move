import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { ApiService } from './api.service';
import { BaseDataService } from './base-data.service';
import { User, UserSearchCriteria, UserStats } from '../models/user.model';
import { QueryParamsBuilder } from '../utils/query-params.builder';

/**
 * Servicio para gestionar Usuarios
 * Hereda funcionalidad CRUD base de BaseDataService
 * Agrega búsqueda avanzada y cálculo de estadísticas
 * 
 * @service
 * @providedIn root
 */
@Injectable({
  providedIn: 'root'
})
export class UserService extends BaseDataService<User> {
  /**
   * Endpoint del API para usuarios
   */
  protected endpoint = 'users';

  constructor(apiService: ApiService) {
    super(apiService);
    // Datos de usuarios cambian ocasionalmente - TTL de 30 minutos
    this.cacheDuration = 30 * 60 * 1000;
  }

  /**
   * Busca usuarios con criterios específicos
   * @param criteria - Criterios de búsqueda
   * @returns Observable<User[]>
   */
  search(criteria: UserSearchCriteria): Observable<User[]> {
    const queryParams = new QueryParamsBuilder()
      .addIfPresent('role', criteria.role)
      .addIfPresent('keyword', criteria.keyword)
      .build();

    return this.apiService.get<User[]>(`/${this.endpoint}/search`, queryParams).pipe(
      tap(data => {
        this.dataSubject.next(data);
        this.clearServiceError();
      }),
      catchError((error) => {
        this.setServiceError(error, 'Error al buscar usuarios');
        return throwError(() => error);
      })
    );
  }

  /**
   * Obtiene estadísticas de usuarios
   */
  getStats(): UserStats {
    const users = this.getCachedData();
    return {
      total: users.length,
      byRole: {
        admin: users.filter(u => u.role === 'ADMIN').length,
        user: users.filter(u => u.role === 'USER').length,
        viewer: users.filter(u => u.role === 'VIEWER').length,
      },
      lastUpdated: new Date()
    };
  }
}
