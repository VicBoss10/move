/// <reference types="jasmine" />

import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';
import { SensorDataService } from './sensor-data.service';
import { ApiService } from './api.service';
import { SensorData, SensorDataSearchCriteria } from '../models/sensor-data.model';

/**
 * Test suite for SensorDataService.
 *
 * Covers:
 * - Service instantiation and endpoint configuration
 * - Cache duration and caching behavior
 * - Searching sensor data by device ID and metric ranges (temperature, CO2, etc.)
 * - Timestamp normalization from string to Date objects
 * - Statistics calculation (getStats) with min/max/avg for all metrics
 * - Period-based statistics (getStatsForPeriod) with configurable limits
 * - Latest data retrieval (getLast, getLatest, getLatestSync)
 * - Bulk deletion operations (deleteAll, deleteByDateRange)
 * - Cache invalidation after mutations
 * - Error handling and fallback behavior for parse errors
 * - Observable data$ and error$ emission
 * - Inheritance from BaseDataService
 */
describe('SensorDataService', () => {
  let service: SensorDataService;
  let apiServiceMock: jasmine.SpyObj<ApiService>;

  const mockSensorData: SensorData[] = [
    {
      id: 1,
      deviceId: 1,
      timestamp: new Date('2024-01-01T10:00:00Z'),
      temperature: 22.5,
      humidity: 45,
      co2: 410,
      pm25: 12,
      pm10: 25,
      co: 0.8,
      no2: 35,
      nh3: 5,
    },
    {
      id: 2,
      deviceId: 1,
      timestamp: new Date('2024-01-01T10:15:00Z'),
      temperature: 23.0,
      humidity: 46,
      co2: 420,
      pm25: 13,
      pm10: 26,
      co: 0.9,
      no2: 36,
      nh3: 6,
    },
    {
      id: 3,
      deviceId: 2,
      timestamp: new Date('2024-01-01T10:30:00Z'),
      temperature: 24.0,
      humidity: 50,
      co2: 430,
      pm25: 15,
      pm10: 28,
      co: 1.0,
      no2: 38,
      nh3: 7,
    },
  ];

  beforeEach(() => {
    const spy = jasmine.createSpyObj('ApiService', ['get', 'post', 'put', 'delete']);

    TestBed.configureTestingModule({
      providers: [SensorDataService, { provide: ApiService, useValue: spy }, provideHttpClient()],
    });

    service = TestBed.inject(SensorDataService);
    apiServiceMock = TestBed.inject(ApiService) as jasmine.SpyObj<ApiService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have correct endpoint', () => {
    expect(service['endpoint']).toBe('sensordata');
  });

  it('should have 1-minute cache duration', () => {
    expect(service['cacheDuration']).toBe(1 * 60 * 1000);
  });

  describe('search()', () => {
    it('should search sensor data with temperature range', (done) => {
      const criteria: SensorDataSearchCriteria = {
        minTemperature: 20,
        maxTemperature: 25,
      };
      const filtered = mockSensorData.filter((d) => d.temperature >= 20 && d.temperature <= 25);

      apiServiceMock.get.and.returnValue(of(filtered));

      service.search(criteria).subscribe((data) => {
        expect(apiServiceMock.get).toHaveBeenCalledWith('/sensordata/search', jasmine.any(Object));
        expect(data.length).toBe(3);
        done();
      });
    });

    it('should search with CO2 range criteria', (done) => {
      const criteria: SensorDataSearchCriteria = {
        minCo2: 400,
        maxCo2: 425,
      };

      apiServiceMock.get.and.returnValue(of(mockSensorData.slice(0, 2)));

      service.search(criteria).subscribe((data) => {
        expect(data.length).toBe(2);
        done();
      });
    });

    it('should search by deviceId', (done) => {
      const criteria: SensorDataSearchCriteria = {
        deviceId: 1,
      };
      const device1Data = mockSensorData.filter((d) => d.deviceId === 1);

      apiServiceMock.get.and.returnValue(of(device1Data));

      service.search(criteria).subscribe((data) => {
        expect(data.length).toBe(2);
        expect(data.every((d) => d.deviceId === 1)).toBe(true);
        done();
      });
    });

    it('should handle parse error and return empty array', (done) => {
      const criteria: SensorDataSearchCriteria = {};
      const error = new Error('Http failure during parsing');

      apiServiceMock.get.and.returnValue(throwError(() => error));

      service.search(criteria).subscribe((data) => {
        expect(Array.isArray(data)).toBe(true);
        expect(data.length).toBe(0);
        done();
      });
    });

    it('should normalize timestamps from string to Date', (done) => {
      const criteria: SensorDataSearchCriteria = {};
      const dataWithStringTimestamps = [
        {
          ...mockSensorData[0],
          timestamp: '2024-01-01T10:00:00Z' as unknown as Date,
        },
      ];

      apiServiceMock.get.and.returnValue(of(dataWithStringTimestamps));

      service.search(criteria).subscribe((data) => {
        expect(data[0].timestamp instanceof Date).toBe(true);
        done();
      });
    });

    it('should update data$ on successful search', (done) => {
      const criteria: SensorDataSearchCriteria = { deviceId: 1 };

      apiServiceMock.get.and.returnValue(of(mockSensorData.slice(0, 2)));

      let emissionCount = 0;
      service.data$.subscribe((data) => {
        emissionCount++;
        if (emissionCount === 2 && data.length > 0) {
          expect(data.length).toBe(2);
          done();
        }
      });

      service.search(criteria).subscribe();
    });
  });

  describe('getLast()', () => {
    it('should fetch the most recent sensor record', (done) => {
      apiServiceMock.get.and.returnValue(of(mockSensorData[2]));

      service.getLast().subscribe((data) => {
        expect(apiServiceMock.get).toHaveBeenCalledWith('/sensordata/last');
        expect(data.timestamp instanceof Date).toBe(true);
        done();
      });
    });

    it('should normalize timestamp in getLast response', (done) => {
      const dataWithString = {
        ...mockSensorData[2],
        timestamp: '2024-01-01T10:30:00Z' as unknown as Date,
      };

      apiServiceMock.get.and.returnValue(of(dataWithString));

      service.getLast().subscribe((data) => {
        expect(data.timestamp instanceof Date).toBe(true);
        done();
      });
    });
  });

  describe('getLatest()', () => {
    it('should delegate to getLast()', (done) => {
      apiServiceMock.get.and.returnValue(of(mockSensorData[2]));

      service.getLatest().subscribe((_data) => {
        expect(apiServiceMock.get).toHaveBeenCalledWith('/sensordata/last');
        done();
      });
    });
  });

  describe('getLatestSync()', () => {
    it('should return latest from cache synchronously', () => {
      service['cacheData'] = mockSensorData;

      const latest = service.getLatestSync();

      expect(latest).toEqual(mockSensorData[2]);
    });

    it('should return null if cache is empty', () => {
      service['cacheData'] = [];

      const latest = service.getLatestSync();

      expect(latest).toBeNull();
    });
  });

  describe('getStats()', () => {
    it('should calculate statistics from cached data', () => {
      service['cacheData'] = mockSensorData;

      const stats = service.getStats();

      expect(stats.dataPoints).toBe(3);
      expect(stats.temperature.current).toBe(24.0);
      expect(stats.temperature.min).toBe(22.5);
      expect(stats.temperature.max).toBe(24.0);
      expect(typeof stats.temperature.avg).toBe('number');
    });

    it('should return empty stats for empty cache', () => {
      service['cacheData'] = [];

      const stats = service.getStats();

      expect(stats.dataPoints).toBe(0);
      expect(stats.temperature.current).toBe(0);
      expect(stats.co2.current).toBe(0);
    });

    it('should calculate averages correctly', () => {
      service['cacheData'] = mockSensorData;

      const stats = service.getStats();

      const expectedTempAvg =
        (mockSensorData[0].temperature +
          mockSensorData[1].temperature +
          mockSensorData[2].temperature) /
        3;

      expect(stats.temperature.avg).toBeCloseTo(expectedTempAvg, 1);
    });

    it('should include all metric types in stats', () => {
      service['cacheData'] = mockSensorData;

      const stats = service.getStats();

      expect(stats.temperature).toBeDefined();
      expect(stats.humidity).toBeDefined();
      expect(stats.co2).toBeDefined();
      expect(stats.pm25).toBeDefined();
      expect(stats.pm10).toBeDefined();
      expect(stats.co).toBeDefined();
      expect(stats.no2).toBeDefined();
      expect(stats.nh3).toBeDefined();
    });

    it('should have current timestamp in stats', () => {
      service['cacheData'] = mockSensorData;
      const now = new Date();

      const stats = service.getStats();

      expect(stats.lastUpdated.getTime()).toBeCloseTo(now.getTime(), -2);
    });
  });

  describe('getStatsForPeriod()', () => {
    it('should calculate stats for last N records by default', (done) => {
      apiServiceMock.get.and.returnValue(of(mockSensorData));
      service['cacheData'] = mockSensorData;

      service.getStatsForPeriod().subscribe((stats) => {
        expect(stats.dataPoints).toBe(3);
        done();
      });
    });

    it('should calculate stats for custom period limit', (done) => {
      apiServiceMock.get.and.returnValue(of(mockSensorData));
      service['cacheData'] = mockSensorData;

      service.getStatsForPeriod(1).subscribe((stats) => {
        expect(stats.dataPoints).toBe(1);
        done();
      });
    });

    it('should handle empty data in getStatsForPeriod', (done) => {
      apiServiceMock.get.and.returnValue(of([]));
      service['cacheData'] = [];

      service.getStatsForPeriod().subscribe((stats) => {
        expect(stats.dataPoints).toBe(0);
        done();
      });
    });
  });

  describe('deleteAll()', () => {
    it('should delete all sensor data and invalidate cache', (done) => {
      service['cacheData'] = mockSensorData;
      service['lastFetch'] = Date.now();

      apiServiceMock.delete.and.returnValue(of(undefined));

      service.deleteAll().subscribe(() => {
        expect(service['cacheData']).toEqual([]);
        expect(service['lastFetch']).toBe(0);
        done();
      });
    });

    it('should handle delete error', (done) => {
      const error = new Error('Delete failed');

      apiServiceMock.delete.and.returnValue(throwError(() => error));

      service.deleteAll().subscribe({
        error: (err) => {
          expect(err).toBeDefined();
          done();
        },
      });
    });
  });

  describe('deleteByDateRange()', () => {
    it('should delete data by date range', (done) => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-01-02');

      apiServiceMock.delete.and.returnValue(of(undefined));

      service.deleteByDateRange(start, end).subscribe(() => {
        expect(apiServiceMock.delete).toHaveBeenCalled();
        done();
      });
    });

    it('should invalidate cache after delete by date range', (done) => {
      service['cacheData'] = mockSensorData;
      const start = new Date('2024-01-01');
      const end = new Date('2024-01-02');

      apiServiceMock.delete.and.returnValue(of(undefined));

      service.deleteByDateRange(start, end).subscribe(() => {
        expect(service['cacheData']).toEqual([]);
        done();
      });
    });
  });

  describe('Observable streams', () => {
    it('should emit initial empty data', (done) => {
      let emissionCount = 0;
      service.data$.subscribe((data) => {
        emissionCount++;
        if (emissionCount === 1) {
          expect(Array.isArray(data)).toBe(true);
          expect(data.length).toBe(0);
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
  });
});
