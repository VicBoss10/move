import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { ApiService } from './api.service';
import { BaseDataService } from './base-data.service';
import { User, UserSearchCriteria, UserStats } from '../models/user.model';
import { QueryParamsBuilder } from '../utils/query-params.builder';

/**
 * User management service for system users and access control.
 * Extends BaseDataService for CRUD operations and adds advanced search and statistics.
 *
 * @class UserService
 * @extends BaseDataService<User>
 * @injectable root
 */
@Injectable({
  providedIn: 'root',
})
export class UserService extends BaseDataService<User> {
  /**
   * API endpoint path for user resources.
   * @protected
   */
  protected endpoint = 'users';

  constructor(apiService: ApiService) {
    super(apiService);
    this.cacheDuration = 30 * 60 * 1000;
  }

  /**
   * Searches for users matching the provided criteria.
   * Supports filtering by role and keyword matching.
   *
   * @param {UserSearchCriteria} criteria - Search filter criteria.
   * @returns {Observable<User[]>} Observable with matching users.
   */
  search(criteria: UserSearchCriteria): Observable<User[]> {
    const queryParams = new QueryParamsBuilder()
      .addIfPresent('role', criteria.role)
      .addIfPresent('keyword', criteria.keyword)
      .build();

    return this.apiService.get<User[]>(`/${this.endpoint}/search`, queryParams).pipe(
      tap((data) => {
        this.dataSubject.next(data);
        this.clearServiceError();
      }),
      catchError((error) => {
        this.setServiceError(error, 'Error al buscar usuarios');
        return throwError(() => error);
      }),
    );
  }

  /**
   * Calculates aggregated user statistics from cached data.
   * Returns counts by role.
   *
   * @returns {UserStats} Aggregated user statistics.
   */
  getStats(): UserStats {
    const users = this.getCachedData();
    return {
      total: users.length,
      byRole: {
        admin: users.filter((u) => u.role === 'ADMIN').length,
        user: users.filter((u) => u.role === 'USER').length,
        viewer: users.filter((u) => u.role === 'VIEWER').length,
      },
      lastUpdated: new Date(),
    };
  }
}
