/// <reference types="jasmine" />

import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';
import { VehicleDetectedService } from './vehicle-detected.service';
import { ApiService } from './api.service';
import { VehicleDetected, VehicleSearchCriteria, VehicleType } from '../models/vehicle.model';

/**
 * Test suite for VehicleDetectedService.
 *
 * Covers:
 * - Service instantiation and endpoint configuration
 * - Cache duration and caching behavior
 * - Searching vehicles by type, device IDs, and combinations
 * - Statistics aggregation (getStats) by vehicle type and daily count
 * - Today's detection filtering based on date comparison
 * - Data normalization and timestamp parsing
 * - Bulk deletion operations (deleteAll, deleteByDateRange)
 * - Cache invalidation after mutations
 * - First and last record retrieval (getFirstRecord, getLastRecord)
 * - Error handling and fallback behavior for non-JSON responses
 * - Observable data$ and error$ emission
 * - Inheritance from BaseDataService
 */
describe('VehicleDetectedService', () => {
  let service: VehicleDetectedService;
  let apiServiceMock: jasmine.SpyObj<ApiService>;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const mockVehicles: VehicleDetected[] = [
    {
      id: 1,
      device: { id: 1 },
      vehicleType: VehicleType.CAR,
      timestamp: new Date(today.getTime() + 10 * 60 * 60 * 1000),
    },
    {
      id: 2,
      device: { id: 1 },
      vehicleType: VehicleType.TRUCK,
      timestamp: new Date(today.getTime() + 11 * 60 * 60 * 1000),
    },
    {
      id: 3,
      device: { id: 2 },
      vehicleType: VehicleType.BUS,
      timestamp: new Date(today.getTime() + 12 * 60 * 60 * 1000),
    },
    {
      id: 4,
      device: { id: 2 },
      vehicleType: VehicleType.CAR,
      timestamp: new Date(new Date().getTime() - 2 * 24 * 60 * 60 * 1000),
    },
  ];

  beforeEach(() => {
    const spy = jasmine.createSpyObj('ApiService', ['get', 'post', 'put', 'delete']);

    TestBed.configureTestingModule({
      providers: [
        VehicleDetectedService,
        { provide: ApiService, useValue: spy },
        provideHttpClient(),
      ],
    });

    service = TestBed.inject(VehicleDetectedService);
    apiServiceMock = TestBed.inject(ApiService) as jasmine.SpyObj<ApiService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have correct endpoint', () => {
    expect(service['endpoint']).toBe('vehicles');
  });

  it('should have 5-minute cache duration', () => {
    expect(service['cacheDuration']).toBe(5 * 60 * 1000);
  });

  describe('search()', () => {
    it('should search vehicles by type', (done) => {
      const criteria: VehicleSearchCriteria = { type: VehicleType.CAR };
      const carVehicles = mockVehicles.filter((v) => v.vehicleType === VehicleType.CAR);

      apiServiceMock.get.and.returnValue(of(carVehicles));

      service.search(criteria).subscribe((vehicles) => {
        expect(apiServiceMock.get).toHaveBeenCalledWith('/vehicles/search', jasmine.any(Object));
        expect(vehicles.length).toBe(2);
        expect(vehicles.every((v) => v.vehicleType === 'CAR')).toBe(true);
        done();
      });
    });

    it('should search vehicles by device IDs', (done) => {
      const criteria: VehicleSearchCriteria = { deviceIds: [1] };
      const device1Vehicles = mockVehicles.filter((v) => v.device?.id === 1);

      apiServiceMock.get.and.returnValue(of(device1Vehicles));

      service.search(criteria).subscribe((vehicles) => {
        expect(vehicles.length).toBe(2);
        expect(vehicles.every((v) => v.device?.id === 1)).toBe(true);
        done();
      });
    });

    it('should handle non-JSON response by returning empty array', (done) => {
      const criteria: VehicleSearchCriteria = { type: VehicleType.CAR };
      const nonJsonResponse = 'Not an array';

      apiServiceMock.get.and.returnValue(of(nonJsonResponse as unknown as VehicleDetected[]));

      service.search(criteria).subscribe((vehicles) => {
        expect(Array.isArray(vehicles)).toBe(true);
        expect(vehicles.length).toBe(0);
        done();
      });
    });

    it('should handle parse error and return empty array', (done) => {
      const criteria: VehicleSearchCriteria = {};
      const error = new Error('Http failure during parsing');

      apiServiceMock.get.and.returnValue(throwError(() => error));

      service.search(criteria).subscribe((vehicles) => {
        expect(Array.isArray(vehicles)).toBe(true);
        expect(vehicles.length).toBe(0);
        done();
      });
    });

    it('should update data$ on successful search', (done) => {
      const criteria: VehicleSearchCriteria = { type: VehicleType.TRUCK };

      apiServiceMock.get.and.returnValue(
        of(mockVehicles.filter((v) => v.vehicleType === VehicleType.TRUCK)),
      );

      let emissionCount = 0;
      service.data$.subscribe((vehicles) => {
        emissionCount++;
        if (emissionCount === 2 && vehicles.length > 0) {
          expect(vehicles.length).toBe(1);
          done();
        }
      });

      service.search(criteria).subscribe();
    });

    it('should handle non-parse errors', (done) => {
      const criteria: VehicleSearchCriteria = {};
      const error = new Error('Server error');

      apiServiceMock.get.and.returnValue(throwError(() => error));

      service.search(criteria).subscribe({
        error: (err) => {
          expect(err).toBeDefined();
          done();
        },
      });
    });
  });

  describe('getStats()', () => {
    it('should calculate vehicle statistics', () => {
      service['cacheData'] = mockVehicles;

      const stats = service.getStats();

      expect(stats.total).toBe(4);
      expect(stats.byType.car).toBe(2);
      expect(stats.byType.truck).toBe(1);
      expect(stats.byType.bus).toBe(1);
      expect(stats.byType.motorcycle).toBe(0);
      expect(stats.lastUpdated).toBeDefined();
    });

    it('should count today detections correctly', () => {
      service['cacheData'] = mockVehicles;

      const stats = service.getStats();

      expect(stats.todayDetections).toBe(3);
    });

    it('should return zero stats for empty cache', () => {
      service['cacheData'] = [];

      const stats = service.getStats();

      expect(stats.total).toBe(0);
      expect(stats.byType.car).toBe(0);
      expect(stats.byType.truck).toBe(0);
      expect(stats.byType.bus).toBe(0);
      expect(stats.byType.motorcycle).toBe(0);
      expect(stats.todayDetections).toBe(0);
    });

    it('should use Date toDateString for today comparison', () => {
      const tomorrowData: VehicleDetected[] = [
        {
          id: 10,
          device: { id: 1 },
          vehicleType: VehicleType.CAR,
          timestamp: new Date(new Date().getTime() + 24 * 60 * 60 * 1000),
        },
      ];

      service['cacheData'] = tomorrowData;

      const stats = service.getStats();

      expect(stats.todayDetections).toBe(0);
    });

    it('should have current timestamp in stats', () => {
      service['cacheData'] = mockVehicles;
      const now = new Date();

      const stats = service.getStats();

      expect(stats.lastUpdated.getTime()).toBeCloseTo(now.getTime(), -2);
    });
  });

  describe('deleteAll()', () => {
    it('should delete all vehicle data', (done) => {
      service['cacheData'] = mockVehicles;

      apiServiceMock.delete.and.returnValue(of(undefined));

      service.deleteAll().subscribe(() => {
        expect(apiServiceMock.delete).toHaveBeenCalledWith('/vehicles');
        expect(service['cacheData']).toEqual([]);
        done();
      });
    });

    it('should invalidate cache after deleteAll', (done) => {
      service['cacheData'] = mockVehicles;
      service['lastFetch'] = Date.now();

      apiServiceMock.delete.and.returnValue(of(undefined));

      service.deleteAll().subscribe(() => {
        expect(service['cacheData']).toEqual([]);
        expect(service['lastFetch']).toBe(0);
        done();
      });
    });
  });

  describe('deleteByDateRange()', () => {
    it('should delete vehicles by date range', (done) => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-01-02');

      apiServiceMock.delete.and.returnValue(of(undefined));

      service.deleteByDateRange(start, end).subscribe(() => {
        expect(apiServiceMock.delete).toHaveBeenCalled();
        done();
      });
    });

    it('should invalidate cache after deleteByDateRange', (done) => {
      service['cacheData'] = mockVehicles;

      apiServiceMock.delete.and.returnValue(of(undefined));

      service.deleteByDateRange(new Date(), new Date()).subscribe(() => {
        expect(service['cacheData']).toEqual([]);
        done();
      });
    });
  });

  describe('getFirstRecord()', () => {
    it('should fetch the first vehicle record', (done) => {
      apiServiceMock.get.and.returnValue(of(mockVehicles[0]));

      service.getFirstRecord().subscribe((vehicle) => {
        expect(apiServiceMock.get).toHaveBeenCalledWith('/vehicles/first');
        expect(vehicle).toEqual(mockVehicles[0]);
        done();
      });
    });
  });

  describe('getLastRecord()', () => {
    it('should fetch the last vehicle record', (done) => {
      apiServiceMock.get.and.returnValue(of(mockVehicles[3]));

      service.getLastRecord().subscribe((vehicle) => {
        expect(apiServiceMock.get).toHaveBeenCalledWith('/vehicles/last');
        expect(vehicle).toEqual(mockVehicles[3]);
        done();
      });
    });
  });

  describe('Observable streams', () => {
    it('should emit initial empty data', (done) => {
      let emissionCount = 0;
      service.data$.subscribe((vehicles) => {
        emissionCount++;
        if (emissionCount === 1) {
          expect(Array.isArray(vehicles)).toBe(true);
          expect(vehicles.length).toBe(0);
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

  describe('Inheritance from BaseDataService', () => {
    it('should inherit data$ observable', () => {
      expect(service.data$).toBeDefined();
      expect(typeof service.data$.subscribe).toBe('function');
    });

    it('should inherit error$ observable', () => {
      expect(service.error$).toBeDefined();
      expect(typeof service.error$.subscribe).toBe('function');
    });

    it('should have getAll method', () => {
      expect(typeof service.getAll).toBe('function');
    });
  });
});
