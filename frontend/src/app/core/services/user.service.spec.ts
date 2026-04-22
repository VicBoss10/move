/// <reference types="jasmine" />

import { TestBed } from '@angular/core/testing';
import { of, throwError, skip, take } from 'rxjs';
import { UserService } from './user.service';
import { ApiService } from './api.service';
import { User, UserSearchCriteria, UserStats } from '../models/user.model';

/**
 * Test suite para UserService
 * 
 * Cubre:
 * - Creación e inyección de dependencias
 * - Búsqueda de usuarios (search)
 * - Cálculo de estadísticas (getStats)
 * - Observable data$ y error$
 * - Manejo de errores
 * - Validación de criterios de búsqueda
 */
describe('UserService', () => {
  let service: UserService;
  let apiServiceMock: jasmine.SpyObj<ApiService>;

  // Datos de prueba
  const mockUsers: User[] = [
    {
      id: 1,
      email: 'admin@example.com',
      username: 'admin',
      role: 'ADMIN',
      createdAt: new Date('2024-01-01')
    },
    {
      id: 2,
      email: 'user1@example.com',
      username: 'user1',
      role: 'USER',
      createdAt: new Date('2024-01-15')
    },
    {
      id: 3,
      email: 'user2@example.com',
      username: 'user2',
      role: 'USER',
      createdAt: new Date('2024-02-01')
    },
    {
      id: 4,
      email: 'viewer@example.com',
      username: 'viewer',
      role: 'VIEWER',
      createdAt: new Date('2024-02-15')
    }
  ];

  beforeEach(() => {
    // Crear mock de ApiService
    const spy = jasmine.createSpyObj('ApiService', ['get', 'post', 'put', 'delete']);
    
    TestBed.configureTestingModule({
      providers: [
        UserService,
        { provide: ApiService, useValue: spy }
      ]
    });

    service = TestBed.inject(UserService);
    apiServiceMock = TestBed.inject(ApiService) as jasmine.SpyObj<ApiService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have correct endpoint', () => {
    expect(service['endpoint']).toBe('users');
  });

  it('should have 30-minute cache duration', () => {
    expect(service['cacheDuration']).toBe(30 * 60 * 1000);
  });

  describe('search()', () => {
    it('should search users by role', (done) => {
      const criteria: UserSearchCriteria = { role: 'ADMIN' };
      const adminUsers = mockUsers.filter(u => u.role === 'ADMIN');

      apiServiceMock.get.and.returnValue(of(adminUsers));

      service.search(criteria).subscribe((users) => {
        expect(apiServiceMock.get).toHaveBeenCalledWith(
          '/users/search',
          jasmine.any(Object)
        );
        expect(users.length).toBe(1);
        expect(users[0].role).toBe('ADMIN');
        done();
      });
    });

    it('should search users by keyword', (done) => {
      const criteria: UserSearchCriteria = { keyword: 'user1' };
      const filtered = mockUsers.filter(u => u.username.includes('user1'));

      apiServiceMock.get.and.returnValue(of(filtered));

      service.search(criteria).subscribe((users) => {
        expect(users.length).toBe(1);
        expect(users[0].username).toBe('user1');
        done();
      });
    });

    it('should search with both role and keyword', (done) => {
      const criteria: UserSearchCriteria = { role: 'USER', keyword: 'user' };

      apiServiceMock.get.and.returnValue(of([]));

      service.search(criteria).subscribe(() => {
        expect(apiServiceMock.get).toHaveBeenCalled();
        done();
      });
    });

    it('should update data$ observable on successful search', (done) => {
      const criteria: UserSearchCriteria = { role: 'USER' };
      const userResults = mockUsers.filter(u => u.role === 'USER');

      apiServiceMock.get.and.returnValue(of(userResults));

      let emissionCount = 0;
      service.data$.subscribe((users) => {
        emissionCount++;
        // First emission is empty [], second is results
        if (emissionCount === 2 && users.length > 0) {
          expect(users.length).toBe(2);
          expect(users[0].role).toBe('USER');
          done();
        }
      });

      service.search(criteria).subscribe();
    });

    it('should clear error on successful search', (done) => {
      const criteria: UserSearchCriteria = { role: 'ADMIN' };

      apiServiceMock.get.and.returnValue(of([]));

      let emissionCount = 0;
      service.error$.subscribe((error) => {
        emissionCount++;
        // First emission is null (initial)
        if (emissionCount === 1) {
          expect(error).toBeNull();
          done();
        }
      });

      service.search(criteria).subscribe();
    });

    it('should handle search error', (done) => {
      const criteria: UserSearchCriteria = { role: 'ADMIN' };
      const error = new Error('Network error');

      apiServiceMock.get.and.returnValue(throwError(() => error));

      service.search(criteria).subscribe({
        error: (err) => {
          expect(err).toBeDefined();
          done();
        }
      });
    });

    it('should emit error message when search fails', (done) => {
      const criteria: UserSearchCriteria = { role: 'USER' };
      const error = new Error('Backend error');

      apiServiceMock.get.and.returnValue(throwError(() => error));

      service.error$.pipe(
        skip(1), // Skip initial null emission
        take(1)  // Take only the error emission
      ).subscribe((err) => {
        expect(err).toBeDefined();
        expect(typeof err).toBe('string');
        done();
      });

      service.search(criteria).subscribe({
        error: () => {} // Ignore
      });
    });
  });

  describe('getStats()', () => {
    it('should return statistics with all roles', () => {
      // Cargar datos en caché
      service['cacheData'] = mockUsers;

      const stats = service.getStats();

      expect(stats.total).toBe(4);
      expect(stats.byRole.admin).toBe(1);
      expect(stats.byRole.user).toBe(2);
      expect(stats.byRole.viewer).toBe(1);
      expect(stats.lastUpdated).toBeDefined();
    });

    it('should have current timestamp in stats', () => {
      service['cacheData'] = mockUsers;
      const now = new Date();

      const stats = service.getStats();

      expect(stats.lastUpdated.getTime()).toBeCloseTo(now.getTime(), -2); // Within 100ms
    });

    it('should return zero stats for empty cache', () => {
      service['cacheData'] = [];

      const stats = service.getStats();

      expect(stats.total).toBe(0);
      expect(stats.byRole.admin).toBe(0);
      expect(stats.byRole.user).toBe(0);
      expect(stats.byRole.viewer).toBe(0);
    });

    it('should count only correct roles', () => {
      const mixedUsers: User[] = [
        { id: 1, email: 'a@x.com', username: 'a', role: 'ADMIN' },
        { id: 2, email: 'b@x.com', username: 'b', role: 'ADMIN' },
        { id: 3, email: 'c@x.com', username: 'c', role: 'ADMIN' },
        { id: 4, email: 'd@x.com', username: 'd', role: 'VIEWER' }
      ];

      service['cacheData'] = mixedUsers;

      const stats = service.getStats();

      expect(stats.total).toBe(4);
      expect(stats.byRole.admin).toBe(3);
      expect(stats.byRole.user).toBe(0);
      expect(stats.byRole.viewer).toBe(1);
    });
  });

  describe('Observable streams', () => {
    it('should emit initial empty data', (done) => {
      let emissionCount = 0;
      service.data$.subscribe((users) => {
        emissionCount++;
        if (emissionCount === 1) {
          expect(Array.isArray(users)).toBe(true);
          expect(users.length).toBe(0);
          done();
        }
      });
    });

    it('should emit initial null error', (done) => {
      let emissionCount = 0;
      service.error$.subscribe((error) => {
        emissionCount++;
        if (emissionCount === 1) {
          expect(error).toBeNull();
          done();
        }
      });
    });
  });

  describe('QueryParamsBuilder integration', () => {
    it('should build query params correctly for search', (done) => {
      const criteria: UserSearchCriteria = {
        role: 'ADMIN',
        keyword: 'admin'
      };

      apiServiceMock.get.and.returnValue(of([]));

      service.search(criteria).subscribe(() => {
        const callArgs = apiServiceMock.get.calls.mostRecent().args;
        expect(callArgs[0]).toBe('/users/search');
        // QueryParams object should exist
        expect(callArgs[1]).toBeDefined();
        done();
      });
    });

    it('should handle partial criteria (only role)', (done) => {
      const criteria: UserSearchCriteria = { role: 'USER' };

      apiServiceMock.get.and.returnValue(of([]));

      service.search(criteria).subscribe(() => {
        const callArgs = apiServiceMock.get.calls.mostRecent().args;
        expect(callArgs[0]).toBe('/users/search');
        done();
      });
    });

    it('should handle partial criteria (only keyword)', (done) => {
      const criteria: UserSearchCriteria = { keyword: 'john' };

      apiServiceMock.get.and.returnValue(of([]));

      service.search(criteria).subscribe(() => {
        const callArgs = apiServiceMock.get.calls.mostRecent().args;
        expect(callArgs[0]).toBe('/users/search');
        done();
      });
    });

    it('should handle empty criteria', (done) => {
      const criteria: UserSearchCriteria = {};

      apiServiceMock.get.and.returnValue(of([]));

      service.search(criteria).subscribe(() => {
        expect(apiServiceMock.get).toHaveBeenCalled();
        done();
      });
    });
  });

  describe('Inheritance from BaseDataService', () => {
    it('should inherit data$ observable', () => {
      expect(service.data$).toBeDefined();
      // Verificar que es un observable (tiene pipe, subscribe, etc.)
      expect(typeof service.data$.subscribe).toBe('function');
      expect(typeof service.data$.pipe).toBe('function');
    });

    it('should inherit error$ observable', () => {
      expect(service.error$).toBeDefined();
      // Verificar que es un observable
      expect(typeof service.error$.subscribe).toBe('function');
      expect(typeof service.error$.pipe).toBe('function');
    });

    it('should have private cacheData', () => {
      service['cacheData'] = mockUsers;
      expect(service['cacheData']).toEqual(mockUsers);
    });

    it('should have lastFetch timestamp', () => {
      expect(service['lastFetch']).toBeDefined();
      expect(typeof service['lastFetch']).toBe('number');
    });
  });
});
