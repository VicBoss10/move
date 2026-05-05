/// <reference types="jasmine" />

import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';
import { ThresholdsService } from './thresholds.service';
import { ApiThresholdsService } from './api-thresholds.service';
import { ENV_THRESHOLDS, EnvironmentMetricKey } from '../config/environment-thresholds.config';

/**
 * Test suite for ThresholdsService.
 *
 * Covers:
 * - Service instantiation and API initialization
 * - Loading default thresholds from configuration
 * - Merging localStorage overrides with default values
 * - Handling corrupted localStorage data gracefully
 * - Synchronous metric retrieval with deep cloning (getMetric)
 * - Metric updates with API persistence and localStorage caching
 * - Cache invalidation and storage of overrides
 * - Prevention of storing default values as overrides
 * - Reset functionality for restoring defaults
 * - API error handling during initialization, updates, and reset
 * - Observable data$ emissions on configuration changes
 * - Observable behavior with combineLatest and BehaviorSubject
 */
describe('ThresholdsService', () => {
  let service: ThresholdsService;
  let apiThresholdsMock: jasmine.SpyObj<ApiThresholdsService>;

  const STORAGE_KEY = 'env_thresholds_overrides_v1';

  beforeEach(() => {
    const spy = jasmine.createSpyObj('ApiThresholdsService', [
      'getThresholdsGrouped',
      'convertApiToConfig',
      'convertConfigToApi',
      'updateMetricThresholds',
    ]);

    spy.getThresholdsGrouped.and.returnValue(of({}));
    spy.updateMetricThresholds.and.returnValue(of([]));

    TestBed.configureTestingModule({
      providers: [
        ThresholdsService,
        { provide: ApiThresholdsService, useValue: spy },
        provideHttpClient(),
      ],
    });

    localStorage.clear();

    service = TestBed.inject(ThresholdsService);
    apiThresholdsMock = TestBed.inject(
      ApiThresholdsService,
    ) as jasmine.SpyObj<ApiThresholdsService>;
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('constructor and initialization', () => {
    it('should initialize with default thresholds', (done) => {
      apiThresholdsMock.getThresholdsGrouped.and.returnValue(of({}));

      service.getAll().subscribe((config) => {
        expect(config).toBeDefined();
        expect(Object.keys(config).length).toBeGreaterThan(0);
        done();
      });
    });

    it('should call initializeFromApi on construction', () => {
      expect(apiThresholdsMock.getThresholdsGrouped).toHaveBeenCalled();
    });
  });

  describe('loadSync()', () => {
    it('should load defaults if no overrides in localStorage', (done) => {
      localStorage.removeItem(STORAGE_KEY);

      service.getAll().subscribe((config) => {
        expect(config).toEqual(ENV_THRESHOLDS);
        done();
      });
    });

    it('should merge localStorage overrides with defaults', (done) => {
      const overrides = {
        co2: {
          label: 'CO2 Custom',
          unit: 'ppm',
          levels: [],
        },
      };

      localStorage.clear();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          ThresholdsService,
          { provide: ApiThresholdsService, useValue: apiThresholdsMock },
          provideHttpClient(),
        ],
      });

      const newService = TestBed.inject(ThresholdsService);

      newService.getAll().subscribe((config) => {
        expect(config.co2.label).toBe('CO2 Custom');
        done();
      });
    });

    it('should handle corrupted localStorage gracefully', (done) => {
      localStorage.clear();
      localStorage.setItem(STORAGE_KEY, 'invalid-json{');

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          ThresholdsService,
          { provide: ApiThresholdsService, useValue: apiThresholdsMock },
          provideHttpClient(),
        ],
      });

      const newService = TestBed.inject(ThresholdsService);

      newService.getAll().subscribe((config) => {
        expect(config).toEqual(ENV_THRESHOLDS);
        done();
      });
    });
  });

  describe('getAll()', () => {
    it('should return observable of all thresholds', (done) => {
      service.getAll().subscribe((config) => {
        expect(config).toBeDefined();
        expect(typeof config).toBe('object');
        done();
      });
    });

    it('should emit updates when configuration changes', (done) => {
      let emissionCount = 0;
      const metric = Object.keys(ENV_THRESHOLDS)[0] as EnvironmentMetricKey;
      const newConfig = { ...ENV_THRESHOLDS[metric], label: 'Updated Label' };

      apiThresholdsMock.convertConfigToApi.and.returnValue([]);
      apiThresholdsMock.updateMetricThresholds.and.returnValue(of([]));

      service.getAll().subscribe((config) => {
        emissionCount++;
        if (emissionCount === 2) {
          expect(config[metric].label).toBe('Updated Label');
          done();
        }
      });

      service.updateMetric(metric, newConfig);
    });
  });

  describe('getMetric()', () => {
    it('should return deep clone of metric config', (done) => {
      const metric = Object.keys(ENV_THRESHOLDS)[0] as EnvironmentMetricKey;

      service.getAll().subscribe(() => {
        const cloned = service.getMetric(metric);
        const original = ENV_THRESHOLDS[metric];

        expect(cloned).toEqual(original);
        expect(cloned).not.toBe(original);
        done();
      });
    });

    it('should not allow mutation of original via returned clone', (done) => {
      const metric = Object.keys(ENV_THRESHOLDS)[0] as EnvironmentMetricKey;

      service.getAll().subscribe(() => {
        const cloned = service.getMetric(metric);
        cloned.label = 'Modified Label';

        const original = service.getMetric(metric);
        expect(original.label).not.toBe('Modified Label');
        done();
      });
    });
  });

  describe('updateMetric()', () => {
    it('should update metric configuration in store', (done) => {
      const metric = Object.keys(ENV_THRESHOLDS)[0] as EnvironmentMetricKey;
      const newConfig = { ...ENV_THRESHOLDS[metric], label: 'Updated Label' };

      apiThresholdsMock.convertConfigToApi.and.returnValue([
        { metric, level: 'good' as const, maxValue: 100 },
      ]);
      apiThresholdsMock.updateMetricThresholds.and.returnValue(of([]));

      let emissionCount = 0;
      service.getAll().subscribe((config) => {
        emissionCount++;
        if (emissionCount === 2) {
          expect(config[metric].label).toBe('Updated Label');
          done();
        }
      });

      service.updateMetric(metric, newConfig);
    });

    it('should persist overrides to localStorage', (done) => {
      const metric = Object.keys(ENV_THRESHOLDS)[0] as EnvironmentMetricKey;
      const newConfig = { ...ENV_THRESHOLDS[metric], label: 'Custom Label' };

      apiThresholdsMock.convertConfigToApi.and.returnValue([]);
      apiThresholdsMock.updateMetricThresholds.and.returnValue(of([]));

      service.updateMetric(metric, newConfig);

      setTimeout(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        expect(stored).toBeTruthy();
        const overrides = JSON.parse(stored!);
        expect(overrides[metric]).toBeDefined();
        done();
      }, 100);
    });

    it('should call API to persist changes', (done) => {
      const metric = Object.keys(ENV_THRESHOLDS)[0] as EnvironmentMetricKey;
      const newConfig = ENV_THRESHOLDS[metric];
      const mockDtos = [{ metric, level: 'good' as const, maxValue: 100 }];

      apiThresholdsMock.convertConfigToApi.and.returnValue(mockDtos);
      apiThresholdsMock.updateMetricThresholds.and.returnValue(of([]));

      service.updateMetric(metric, newConfig);

      setTimeout(() => {
        expect(apiThresholdsMock.updateMetricThresholds).toHaveBeenCalledWith(metric, mockDtos);
        done();
      }, 100);
    });

    it('should handle API errors gracefully', (done) => {
      const metric = Object.keys(ENV_THRESHOLDS)[0] as EnvironmentMetricKey;
      const newConfig = ENV_THRESHOLDS[metric];

      apiThresholdsMock.convertConfigToApi.and.returnValue([]);
      apiThresholdsMock.updateMetricThresholds.and.returnValue(
        throwError(() => new Error('API error')),
      );

      let emissionCount = 0;
      service.getAll().subscribe((config) => {
        emissionCount++;
        if (emissionCount === 2) {
          expect(config[metric]).toBeDefined();
          done();
        }
      });

      service.updateMetric(metric, newConfig);
    });

    it('should not store default values in localStorage overrides', (done) => {
      const metric = Object.keys(ENV_THRESHOLDS)[0] as EnvironmentMetricKey;
      const defaultConfig = ENV_THRESHOLDS[metric];

      apiThresholdsMock.convertConfigToApi.and.returnValue([]);
      apiThresholdsMock.updateMetricThresholds.and.returnValue(of([]));

      service.updateMetric(metric, defaultConfig);

      setTimeout(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        const overrides = stored ? JSON.parse(stored) : {};
        expect(overrides[metric]).toBeUndefined();
        done();
      }, 100);
    });
  });

  describe('reset()', () => {
    it('should clear localStorage overrides', (done) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ co2: {} }));

      service.reset();

      setTimeout(() => {
        expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
        done();
      }, 100);
    });

    it('should restore default thresholds to store', (done) => {
      const metric = Object.keys(ENV_THRESHOLDS)[0] as EnvironmentMetricKey;
      const newConfig = { ...ENV_THRESHOLDS[metric], label: 'Custom' };

      apiThresholdsMock.convertConfigToApi.and.returnValue([]);
      apiThresholdsMock.updateMetricThresholds.and.returnValue(of([]));

      service.updateMetric(metric, newConfig);

      setTimeout(() => {
        apiThresholdsMock.updateMetricThresholds.calls.reset();

        let emissionCount = 0;
        service.getAll().subscribe((config) => {
          emissionCount++;
          if (emissionCount === 2) {
            expect(config[metric]).toEqual(ENV_THRESHOLDS[metric]);
            done();
          }
        });

        service.reset();
      }, 100);
    });

    it('should attempt to restore all metrics in backend', (done) => {
      apiThresholdsMock.convertConfigToApi.and.returnValue([]);
      apiThresholdsMock.updateMetricThresholds.and.returnValue(of([]));

      service.reset();

      setTimeout(() => {
        const metrics = Object.keys(ENV_THRESHOLDS).length;
        expect(apiThresholdsMock.updateMetricThresholds).toHaveBeenCalledTimes(metrics);
        done();
      }, 100);
    });

    it('should handle API errors during reset gracefully', (done) => {
      apiThresholdsMock.convertConfigToApi.and.returnValue([]);
      apiThresholdsMock.updateMetricThresholds.and.returnValue(
        throwError(() => new Error('API error')),
      );

      service.reset();

      setTimeout(() => {
        expect(service).toBeTruthy();
        done();
      }, 100);
    });
  });

  describe('initializeFromApi()', () => {
    it('should fetch thresholds from API on construction', () => {
      expect(apiThresholdsMock.getThresholdsGrouped).toHaveBeenCalled();
    });

    it('should fall back to defaults if API fails', (done) => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          ThresholdsService,
          { provide: ApiThresholdsService, useValue: apiThresholdsMock },
          provideHttpClient(),
        ],
      });

      apiThresholdsMock.getThresholdsGrouped.and.returnValue(
        throwError(() => new Error('API error')),
      );

      const newService = TestBed.inject(ThresholdsService);

      newService.getAll().subscribe((config) => {
        expect(config).toEqual(ENV_THRESHOLDS);
        done();
      });
    });
  });
});
