/// <reference types="jasmine" />

import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';
import { LocationService } from './location.service';
import { ApiService } from './api.service';
import { VehicleDetectedService } from './vehicle-detected.service';
import { Location, LocationSearchCriteria } from '../models/location.model';

/**
 * Test suite for LocationService.
 *
 * Covers:
 * - Service instantiation and endpoint configuration
 * - Filtering provisional location (id === 0) from all results
 * - getAll() override with custom caching logic
 * - create() override using postText() instead of post()
 * - Search with filtering of provisional location
 * - Statistics aggregation (getStats) with VehicleDetectedService integration
 * - Cache invalidation after create operations
 * - Error handling and error$ observable propagation
 * - Cache duration and validity window management
 * - Observable data$ emission for getAll and search operations
 * - Search with multiple criteria (description, coordinates, radius)
 */
describe('LocationService', () => {
  let service: LocationService;
  let apiServiceMock: jasmine.SpyObj<ApiService>;
  let vehicleServiceMock: jasmine.SpyObj<VehicleDetectedService>;

  const mockLocations: Location[] = [
    {
      id: 0,
      description: 'Provisional Location',
      latitude: 0,
      longitude: 0,
    },
    {
      id: 1,
      description: 'Downtown',
      latitude: 40.7128,
      longitude: -74.006,
    },
    {
      id: 2,
      description: 'Park',
      latitude: 40.785,
      longitude: -73.968,
    },
    {
      id: 3,
      description: 'Airport',
      latitude: 40.6413,
      longitude: -73.7781,
    },
  ];

  beforeEach(() => {
    const apiSpy = jasmine.createSpyObj('ApiService', ['get', 'post', 'postText', 'put', 'delete']);
    const vehicleSpy = jasmine.createSpyObj('VehicleDetectedService', [
      'getStats',
      'getCachedData',
    ]);

    apiSpy.get.and.returnValue(of([]));
    vehicleSpy.getStats.and.returnValue({
      total: 10,
      lastUpdated: new Date(),
    });

    TestBed.configureTestingModule({
      providers: [
        LocationService,
        { provide: ApiService, useValue: apiSpy },
        { provide: VehicleDetectedService, useValue: vehicleSpy },
        provideHttpClient(),
      ],
    });

    service = TestBed.inject(LocationService);
    apiServiceMock = TestBed.inject(ApiService) as jasmine.SpyObj<ApiService>;
    vehicleServiceMock = TestBed.inject(
      VehicleDetectedService,
    ) as jasmine.SpyObj<VehicleDetectedService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have correct endpoint', () => {
    expect(service['endpoint']).toBe('locations');
  });

  it('should have 1-hour cache duration', () => {
    expect(service['cacheDuration']).toBe(60 * 60 * 1000);
  });

  describe('getAll()', () => {
    it('should filter out provisional location (id=0)', (done) => {
      apiServiceMock.get.and.returnValue(of(mockLocations));

      service.getAll().subscribe((locations) => {
        expect(locations.length).toBe(3);
        expect(locations.some((l) => l.id === 0)).toBe(false);
        expect(locations.every((l) => l.id > 0)).toBe(true);
        done();
      });
    });

    it('should call API with correct endpoint', (done) => {
      apiServiceMock.get.and.returnValue(of(mockLocations));

      service.getAll().subscribe(() => {
        expect(apiServiceMock.get).toHaveBeenCalledWith('/locations');
        done();
      });
    });

    it('should cache filtered results', (done) => {
      apiServiceMock.get.and.returnValue(of(mockLocations));

      service.getAll().subscribe(() => {
        service.getAll().subscribe(() => {
          expect(apiServiceMock.get).toHaveBeenCalledTimes(1);
          done();
        });
      });
    });

    it('should return cached data within cache duration', (done) => {
      apiServiceMock.get.and.returnValue(of(mockLocations));

      service.getAll().subscribe(() => {
        apiServiceMock.get.calls.reset();

        service.getAll().subscribe((locations) => {
          expect(apiServiceMock.get).not.toHaveBeenCalled();
          expect(locations.length).toBe(3);
          done();
        });
      });
    });

    it('should handle API errors', (done) => {
      const error = new Error('API Error');
      apiServiceMock.get.and.returnValue(throwError(() => error));

      service.getAll().subscribe({
        error: (err) => {
          expect(err).toEqual(error);
          done();
        },
      });
    });

    it('should handle empty response', (done) => {
      apiServiceMock.get.and.returnValue(of(null));

      service.getAll().subscribe((locations) => {
        expect(locations.length).toBe(0);
        done();
      });
    });

    it('should emit via data$ observable', (done) => {
      apiServiceMock.get.and.returnValue(of(mockLocations));

      let dataEmitted = false;
      const dataSub = service.data$.subscribe((locations) => {
        if (locations.length > 0) {
          dataEmitted = true;
          expect(locations.length).toBe(3);
          expect(locations.every((l) => l.id !== 0)).toBe(true);
        }
      });

      service.getAll().subscribe(() => {
        setTimeout(() => {
          expect(dataEmitted).toBe(true);
          dataSub.unsubscribe();
          done();
        }, 100);
      });
    });
  });

  describe('create()', () => {
    it('should use postText instead of post', (done) => {
      const newLocation: Location = {
        id: 4,
        description: 'New Location',
        latitude: 41.0,
        longitude: -73.0,
      };

      apiServiceMock.postText.and.returnValue(of('Location created successfully'));

      service.create(newLocation).subscribe(() => {
        expect(apiServiceMock.postText).toHaveBeenCalledWith('/locations', newLocation);
        expect(apiServiceMock.post).not.toHaveBeenCalled();
        done();
      });
    });

    it('should return original location object on success', (done) => {
      const newLocation: Location = {
        id: 5,
        description: 'Another Location',
        latitude: 42.0,
        longitude: -74.0,
      };

      apiServiceMock.postText.and.returnValue(of('Created'));

      service.create(newLocation).subscribe((result) => {
        expect(result).toEqual(newLocation);
        done();
      });
    });

    it('should invalidate cache after create', (done) => {
      const newLocation: Location = {
        id: 6,
        description: 'Cache Test Location',
        latitude: 43.0,
        longitude: -75.0,
      };

      apiServiceMock.get.and.returnValue(of(mockLocations));
      apiServiceMock.postText.and.returnValue(of('Created'));

      service.getAll().subscribe(() => {
        expect(apiServiceMock.get).toHaveBeenCalledTimes(1);

        service.create(newLocation).subscribe(() => {
          apiServiceMock.get.calls.reset();

          service.getAll().subscribe(() => {
            expect(apiServiceMock.get).toHaveBeenCalledTimes(1);
            done();
          });
        });
      });
    });

    it('should clear error on successful create', (done) => {
      const newLocation: Location = {
        id: 7,
        description: 'Error Clear Location',
        latitude: 44.0,
        longitude: -76.0,
      };

      apiServiceMock.postText.and.returnValue(of('Success'));

      service.create(newLocation).subscribe(() => {
        expect(service['errorSubject'].getValue()).toBeNull();
        done();
      });
    });

    it('should handle postText error', (done) => {
      const newLocation: Location = {
        id: 8,
        description: 'Error Location',
        latitude: 45.0,
        longitude: -77.0,
      };

      const error = new Error('Text post failed');
      apiServiceMock.postText.and.returnValue(throwError(() => error));

      service.create(newLocation).subscribe({
        error: (err) => {
          expect(err).toEqual(error);
          done();
        },
      });
    });
  });

  describe('search()', () => {
    it('should search with description criteria', (done) => {
      const criteria: LocationSearchCriteria = { description: 'Park' };

      apiServiceMock.get.and.returnValue(of([mockLocations[2]]));

      service.search(criteria).subscribe((locations) => {
        expect(locations.length).toBe(1);
        expect(locations[0].description).toBe('Park');
        done();
      });
    });

    it('should filter out provisional location (id=0) from search results', (done) => {
      const criteria: LocationSearchCriteria = {};
      const resultsWithProvisional = [mockLocations[0], mockLocations[1], mockLocations[2]];

      apiServiceMock.get.and.returnValue(of(resultsWithProvisional));

      service.search(criteria).subscribe((locations) => {
        expect(locations.length).toBe(2);
        expect(locations.some((l) => l.id === 0)).toBe(false);
        done();
      });
    });

    it('should search with multiple criteria', (done) => {
      const criteria: LocationSearchCriteria = {
        description: 'Downtown',
        latitude: 40.7128,
        longitude: -74.006,
        radiusKm: 5,
      };

      apiServiceMock.get.and.returnValue(of([mockLocations[1]]));

      service.search(criteria).subscribe(() => {
        expect(apiServiceMock.get).toHaveBeenCalledWith(
          '/locations/search',
          jasmine.objectContaining({
            description: 'Downtown',
            latitude: '40.7128',
            longitude: '-74.006',
            radiusKm: '5',
          }),
        );
        done();
      });
    });

    it('should emit search results via data$', (done) => {
      const criteria: LocationSearchCriteria = { keyword: 'Park' };
      const filtered = [mockLocations[2]];

      apiServiceMock.get.and.returnValue(of(filtered));

      let dataEmitted = false;
      const dataSub = service.data$.subscribe((locations) => {
        if (locations.length > 0) {
          dataEmitted = true;
          expect(locations.length).toBe(1);
          expect(locations[0].description).toBe('Park');
        }
      });

      service.search(criteria).subscribe(() => {
        setTimeout(() => {
          expect(dataEmitted).toBe(true);
          dataSub.unsubscribe();
          done();
        }, 100);
      });
    });

    it('should handle search error', (done) => {
      const criteria: LocationSearchCriteria = {};
      const error = new Error('Search failed');

      apiServiceMock.get.and.returnValue(throwError(() => error));

      service.search(criteria).subscribe({
        error: (err) => {
          expect(err).toEqual(error);
          done();
        },
      });
    });

    it('should handle null search results', (done) => {
      const criteria: LocationSearchCriteria = {};

      apiServiceMock.get.and.returnValue(of(null));

      service.search(criteria).subscribe((locations) => {
        expect(locations.length).toBe(0);
        done();
      });
    });
  });

  describe('getStats()', () => {
    it('should return aggregated statistics', () => {
      service['cacheData'] = mockLocations.filter((l) => l.id !== 0);

      const stats = service.getStats();

      expect(stats.total).toBe(3);
      expect(stats.activeLocations).toBe(3);
      expect(stats.totalVehicleDetections).toBe(10);
      expect(stats.lastUpdated instanceof Date).toBe(true);
    });

    it('should exclude provisional location from stats', () => {
      service['cacheData'] = mockLocations;

      const stats = service.getStats();

      expect(stats.total).toBe(3);
      expect(stats.activeLocations).toBe(3);
    });

    it('should integrate with VehicleDetectedService stats', () => {
      vehicleServiceMock.getStats.and.returnValue({
        total: 25,
        byType: {
          car: 15,
          truck: 5,
          bus: 3,
          motorcycle: 2,
        },
        todayDetections: 10,
        lastUpdated: new Date(),
      });
      service['cacheData'] = mockLocations.filter((l) => l.id !== 0);

      const stats = service.getStats();

      expect(stats.totalVehicleDetections).toBe(25);
      expect(vehicleServiceMock.getStats).toHaveBeenCalled();
    });

    it('should handle empty cache', () => {
      service['cacheData'] = [];

      const stats = service.getStats();

      expect(stats.total).toBe(0);
      expect(stats.activeLocations).toBe(0);
    });

    it('should update lastUpdated timestamp', (done) => {
      service['cacheData'] = mockLocations.filter((l) => l.id !== 0);

      const beforeStats = service.getStats();
      const beforeTimestamp = beforeStats.lastUpdated.getTime();

      setTimeout(() => {
        const afterStats = service.getStats();
        const afterTimestamp = afterStats.lastUpdated.getTime();

        expect(afterTimestamp).toBeGreaterThanOrEqual(beforeTimestamp);
        done();
      }, 10);
    });
  });

  describe('Error handling', () => {
    it('should set error on API failure', (done) => {
      const error = new Error('Network error');
      apiServiceMock.get.and.returnValue(throwError(() => error));

      service.getAll().subscribe({
        next: () => {},
        error: () => {
          const errorMessage = service['errorSubject'].getValue();
          expect(errorMessage).toBe('Network error');
          done();
        },
      });
    });

    it('should clear error on successful operation', (done) => {
      apiServiceMock.get.and.returnValue(of(mockLocations));

      service.getAll().subscribe(() => {
        const errorMessage = service['errorSubject'].getValue();
        expect(errorMessage).toBeNull();
        done();
      });
    });

    it('should set error on search failure', (done) => {
      const error = new Error('Search failed');
      apiServiceMock.get.and.returnValue(throwError(() => error));

      service.search({}).subscribe({
        next: () => {},
        error: () => {
          const errorMessage = service['errorSubject'].getValue();
          expect(errorMessage).toBe('Search failed');
          done();
        },
      });
    });
  });

  describe('Cache invalidation', () => {
    it('should invalidate cache when create succeeds', (done) => {
      apiServiceMock.get.and.returnValue(of(mockLocations));
      apiServiceMock.postText.and.returnValue(of('Created'));

      service.getAll().subscribe(() => {
        const newLocation: Location = {
          id: 99,
          description: 'Cache Test',
          latitude: 50.0,
          longitude: -80.0,
        };

        service.create(newLocation).subscribe(() => {
          expect(service['lastFetch']).toBe(0);
          done();
        });
      });
    });

    it('should not use cache after invalidation', (done) => {
      apiServiceMock.get.and.returnValue(of(mockLocations));
      apiServiceMock.postText.and.returnValue(of('Created'));

      service.getAll().subscribe(() => {
        apiServiceMock.get.calls.reset();

        const newLocation: Location = {
          id: 100,
          description: 'New',
          latitude: 51.0,
          longitude: -81.0,
        };

        service.create(newLocation).subscribe(() => {
          apiServiceMock.get.calls.reset();

          service.getAll().subscribe(() => {
            expect(apiServiceMock.get).toHaveBeenCalled();
            done();
          });
        });
      });
    });
  });
});
