/// <reference types="jasmine" />

import { TestBed } from '@angular/core/testing';
import { of, throwError, skip, take } from 'rxjs';
import { DeviceService } from './device.service';
import { ApiService } from './api.service';
import { Device, DeviceSearchCriteria, DeviceType, DeviceState } from '../models/device.model';

/**
 * Test suite for DeviceService.
 *
 * Covers:
 * - Service instantiation and endpoint configuration
 * - Cache duration and caching behavior
 * - Searching devices by type, state, and location
 * - Multi-criteria device search with query parameter transformation
 * - Observable data$ emission on successful search
 * - Device registration (register) with cache invalidation
 * - Statistics aggregation (getStats) by device type and state
 * - Error handling and error$ observable propagation
 * - Cache management and validity checks
 * - Inheritance from BaseDataService (data$, error$, getAll, refresh)
 */
describe('DeviceService', () => {
  let service: DeviceService;
  let apiServiceMock: jasmine.SpyObj<ApiService>;

  const mockDevices: Device[] = [
    {
      id: 1,
      name: 'Camera Front Gate',
      type: DeviceType.CAMERA,
      state: DeviceState.ACTIVE,
      location: { id: 1, latitude: 10.5, longitude: -76.3 },
    },
    {
      id: 2,
      name: 'Sensor Room A',
      type: DeviceType.SENSOR,
      state: DeviceState.ACTIVE,
      location: { id: 1, latitude: 10.5, longitude: -76.3 },
    },
    {
      id: 3,
      name: 'Camera Back Gate',
      type: DeviceType.CAMERA,
      state: DeviceState.INACTIVE,
      location: { id: 2, latitude: 10.6, longitude: -76.2 },
    },
    {
      id: 4,
      name: 'Thermal Camera',
      type: DeviceType.THERMAL,
      state: DeviceState.ACTIVE,
      location: { id: 2, latitude: 10.6, longitude: -76.2 },
    },
  ];

  beforeEach(() => {
    const spy = jasmine.createSpyObj('ApiService', ['get', 'post', 'put', 'delete']);

    TestBed.configureTestingModule({
      providers: [DeviceService, { provide: ApiService, useValue: spy }],
    });

    service = TestBed.inject(DeviceService);
    apiServiceMock = TestBed.inject(ApiService) as jasmine.SpyObj<ApiService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have correct endpoint', () => {
    expect(service['endpoint']).toBe('devices');
  });

  it('should have 15-minute cache duration', () => {
    expect(service['cacheDuration']).toBe(15 * 60 * 1000);
  });

  describe('search()', () => {
    it('should search devices by type', (done) => {
      const criteria: DeviceSearchCriteria = { type: DeviceType.CAMERA };
      const cameraDevices = mockDevices.filter((d) => d.type === DeviceType.CAMERA);

      apiServiceMock.get.and.returnValue(of(cameraDevices));

      service.search(criteria).subscribe((devices) => {
        expect(apiServiceMock.get).toHaveBeenCalledWith('/devices/search', jasmine.any(Object));
        expect(devices.length).toBe(2);
        expect(devices.every((d) => d.type === DeviceType.CAMERA)).toBe(true);
        done();
      });
    });

    it('should search devices by state', (done) => {
      const criteria: DeviceSearchCriteria = { state: DeviceState.ACTIVE };
      const activeDevices = mockDevices.filter((d) => d.state === DeviceState.ACTIVE);

      apiServiceMock.get.and.returnValue(of(activeDevices));

      service.search(criteria).subscribe((devices) => {
        expect(devices.length).toBe(3);
        expect(devices.every((d) => d.state === DeviceState.ACTIVE)).toBe(true);
        done();
      });
    });

    it('should search devices by location', (done) => {
      const criteria: DeviceSearchCriteria = { locationId: 1 };
      const devicesAtLocation1 = mockDevices.filter((d) => d.location.id === 1);

      apiServiceMock.get.and.returnValue(of(devicesAtLocation1));

      service.search(criteria).subscribe((devices) => {
        expect(devices.length).toBe(2);
        expect(devices.every((d) => d.location.id === 1)).toBe(true);
        done();
      });
    });

    it('should search with multiple criteria', (done) => {
      const criteria: DeviceSearchCriteria = {
        type: DeviceType.CAMERA,
        state: DeviceState.ACTIVE,
      };

      apiServiceMock.get.and.returnValue(of([mockDevices[0]]));

      service.search(criteria).subscribe(() => {
        expect(apiServiceMock.get).toHaveBeenCalled();
        done();
      });
    });

    it('should update data$ observable on successful search', (done) => {
      const criteria: DeviceSearchCriteria = { type: DeviceType.SENSOR };
      const sensorDevices = mockDevices.filter((d) => d.type === DeviceType.SENSOR);

      apiServiceMock.get.and.returnValue(of(sensorDevices));

      let emissionCount = 0;
      service.data$.subscribe((devices) => {
        emissionCount++;
        if (emissionCount === 2 && devices.length > 0) {
          expect(devices.length).toBe(1);
          expect(devices[0].type).toBe(DeviceType.SENSOR);
          done();
        }
      });

      service.search(criteria).subscribe();
    });

    it('should handle search error', (done) => {
      const criteria: DeviceSearchCriteria = { type: DeviceType.CAMERA };
      const error = new Error('Network error');

      apiServiceMock.get.and.returnValue(throwError(() => error));

      service.search(criteria).subscribe({
        error: (err) => {
          expect(err).toBeDefined();
          done();
        },
      });
    });

    it('should emit error message when search fails', (done) => {
      const criteria: DeviceSearchCriteria = { state: DeviceState.ACTIVE };
      const error = new Error('Backend error');

      apiServiceMock.get.and.returnValue(throwError(() => error));

      service.error$.pipe(skip(1), take(1)).subscribe((err) => {
        expect(err).toBeTruthy();
        done();
      });

      service.search(criteria).subscribe({
        error: () => {},
      });
    });
  });

  describe('getStats()', () => {
    it('should return statistics with all types', () => {
      service['cacheData'] = mockDevices;

      const stats = service.getStats();

      expect(stats.total).toBe(4);
      expect(stats.active).toBe(3);
      expect(stats.inactive).toBe(1);
      expect(stats.byType.camera).toBe(2);
      expect(stats.byType.sensor).toBe(1);
      expect(stats.byType.thermal).toBe(1);
      expect(stats.lastUpdated).toBeDefined();
    });

    it('should return zero stats for empty cache', () => {
      service['cacheData'] = [];

      const stats = service.getStats();

      expect(stats.total).toBe(0);
      expect(stats.active).toBe(0);
      expect(stats.inactive).toBe(0);
      expect(stats.byType.camera).toBe(0);
      expect(stats.byType.sensor).toBe(0);
      expect(stats.byType.thermal).toBe(0);
    });

    it('should count only correct states', () => {
      const mixedDevices: Device[] = [
        {
          id: 1,
          name: 'Device 1',
          type: DeviceType.CAMERA,
          state: DeviceState.ACTIVE,
          location: { id: 1, latitude: 10.5, longitude: -76.3 },
        },
        {
          id: 2,
          name: 'Device 2',
          type: DeviceType.CAMERA,
          state: DeviceState.INACTIVE,
          location: { id: 1, latitude: 10.5, longitude: -76.3 },
        },
        {
          id: 3,
          name: 'Device 3',
          type: DeviceType.SENSOR,
          state: DeviceState.INACTIVE,
          location: { id: 1, latitude: 10.5, longitude: -76.3 },
        },
      ];

      service['cacheData'] = mixedDevices;

      const stats = service.getStats();

      expect(stats.total).toBe(3);
      expect(stats.active).toBe(1);
      expect(stats.inactive).toBe(2);
    });

    it('should have current timestamp in stats', () => {
      service['cacheData'] = mockDevices;
      const now = new Date();

      const stats = service.getStats();

      expect(stats.lastUpdated.getTime()).toBeCloseTo(now.getTime(), -2);
    });
  });

  describe('register()', () => {
    it('should register a device', (done) => {
      const newDevice = {
        name: 'New Device',
        type: DeviceType.CAMERA,
        locationId: 1,
      };
      const response = {
        deviceId: 10,
        message: 'Device registered successfully',
      };

      apiServiceMock.post.and.returnValue(of(response));

      service.register(newDevice).subscribe((result) => {
        expect(apiServiceMock.post).toHaveBeenCalledWith('/devices', jasmine.any(Object));
        expect(result).toEqual(response);
        done();
      });
    });

    it('should invalidate cache on successful register', (done) => {
      service['cacheData'] = mockDevices;
      service['lastFetch'] = Date.now();

      const newDevice = { name: 'New Device', type: DeviceType.SENSOR };
      const response = { id: 10, ...newDevice };

      apiServiceMock.post.and.returnValue(of(response));

      service.register(newDevice).subscribe(() => {
        expect(service['cacheData']).toEqual([]);
        expect(service['lastFetch']).toBe(0);
        done();
      });
    });

    it('should handle register error', (done) => {
      const newDevice = { name: 'New Device', type: DeviceType.CAMERA };
      const error = new Error('Registration failed');

      apiServiceMock.post.and.returnValue(throwError(() => error));

      service.register(newDevice).subscribe({
        error: (err) => {
          expect(err).toBeDefined();
          done();
        },
      });
    });

    it('should emit error message on register failure', (done) => {
      const newDevice = { name: 'New Device', type: DeviceType.CAMERA };
      const error = new Error('Backend error');

      apiServiceMock.post.and.returnValue(throwError(() => error));

      service.error$.pipe(skip(1), take(1)).subscribe((err) => {
        expect(err).toBeTruthy();
        done();
      });

      service.register(newDevice).subscribe({
        error: () => {},
      });
    });
  });

  describe('Observable streams', () => {
    it('should emit initial empty data', (done) => {
      let emissionCount = 0;
      service.data$.subscribe((devices) => {
        emissionCount++;
        if (emissionCount === 1) {
          expect(Array.isArray(devices)).toBe(true);
          expect(devices.length).toBe(0);
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
      expect(typeof service.data$.pipe).toBe('function');
    });

    it('should inherit error$ observable', () => {
      expect(service.error$).toBeDefined();
      expect(typeof service.error$.subscribe).toBe('function');
      expect(typeof service.error$.pipe).toBe('function');
    });

    it('should have refresh$ method', () => {
      expect(typeof service.refresh).toBe('function');
    });

    it('should have getAll method', () => {
      expect(typeof service.getAll).toBe('function');
    });
  });
});
