/// <reference types="jasmine" />

import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';
import { ApiThresholdsService } from './api-thresholds.service';
import { ApiService } from './api.service';
import { MetricThresholdConfig, ThresholdLevel } from '../config/environment-thresholds.config';

/**
 * Test suite for ApiThresholdsService.
 *
 * Covers:
 * - CRUD operations (create, read, update, delete thresholds)
 * - Fetching all thresholds and grouped thresholds
 * - Filtering thresholds by metric
 * - Conversion between API DTOs and configuration objects
 * - Helper methods for labels, colors, units, and scales
 * - Error handling and fallback behavior
 */
describe('ApiThresholdsService', () => {
  let service: ApiThresholdsService;
  let apiServiceMock: jasmine.SpyObj<ApiService>;

  interface ApiThresholdDto {
    id?: number;
    metric: string;
    level: 'good' | 'moderate' | 'poor' | 'critical';
    maxValue: number | null;
    createdAt?: string;
    updatedAt?: string;
  }

  const mockCo2Dtos: ApiThresholdDto[] = [
    { id: 1, metric: 'co2', level: 'good', maxValue: 400 },
    { id: 2, metric: 'co2', level: 'moderate', maxValue: 800 },
    { id: 3, metric: 'co2', level: 'poor', maxValue: 1200 },
  ];

  const mockGrouped: Record<string, ApiThresholdDto[]> = {
    co2: mockCo2Dtos,
    temperature: [
      { id: 4, metric: 'temperature', level: 'good', maxValue: 20 },
      { id: 5, metric: 'temperature', level: 'moderate', maxValue: 25 },
    ],
  };

  beforeEach(() => {
    const spy = jasmine.createSpyObj('ApiService', ['get', 'post', 'put', 'delete']);
    TestBed.configureTestingModule({
      providers: [
        ApiThresholdsService,
        { provide: ApiService, useValue: spy },
        provideHttpClient(),
      ],
    });

    service = TestBed.inject(ApiThresholdsService);
    apiServiceMock = TestBed.inject(ApiService) as jasmine.SpyObj<ApiService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getAllThresholds()', () => {
    it('should call GET /thresholds and return DTOs', (done) => {
      apiServiceMock.get.and.returnValue(of(mockCo2Dtos));

      service.getAllThresholds().subscribe((result) => {
        expect(apiServiceMock.get).toHaveBeenCalledWith('/thresholds');
        expect(result).toEqual(mockCo2Dtos);
        done();
      });
    });

    it('should return empty array on error', (done) => {
      apiServiceMock.get.and.returnValue(throwError(() => new Error('Network error')));

      service.getAllThresholds().subscribe((result) => {
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(0);
        done();
      });
    });
  });

  describe('getThresholdsGrouped()', () => {
    it('should call GET /thresholds/grouped and return grouped DTOs', (done) => {
      apiServiceMock.get.and.returnValue(of(mockGrouped));

      service.getThresholdsGrouped().subscribe((result) => {
        expect(apiServiceMock.get).toHaveBeenCalledWith('/thresholds/grouped');
        expect(result).toEqual(mockGrouped);
        expect(Object.keys(result).length).toBe(2);
        done();
      });
    });

    it('should return empty object on error', (done) => {
      apiServiceMock.get.and.returnValue(throwError(() => new Error('API error')));

      service.getThresholdsGrouped().subscribe((result) => {
        expect(Object.keys(result).length).toBe(0);
        done();
      });
    });
  });

  describe('getThresholdsByMetric()', () => {
    it('should call GET /thresholds/metric/{metric} with metric name', (done) => {
      const metric = 'temperature';
      apiServiceMock.get.and.returnValue(of(mockGrouped[metric]));

      service.getThresholdsByMetric(metric).subscribe((result) => {
        expect(apiServiceMock.get).toHaveBeenCalledWith(`/thresholds/metric/${metric}`);
        expect(result.length).toBe(2);
        expect(result[0].metric).toBe('temperature');
        done();
      });
    });

    it('should return empty array on error', (done) => {
      apiServiceMock.get.and.returnValue(throwError(() => new Error('Not found')));

      service.getThresholdsByMetric('unknown').subscribe((result) => {
        expect(result.length).toBe(0);
        done();
      });
    });
  });

  describe('createThreshold()', () => {
    it('should call POST /thresholds with DTO', (done) => {
      const dto: ApiThresholdDto = { metric: 'co2', level: 'good', maxValue: 400 };
      const response: ApiThresholdDto = { id: 100, ...dto };

      apiServiceMock.post.and.returnValue(of(response));

      service.createThreshold(dto).subscribe((result) => {
        expect(apiServiceMock.post).toHaveBeenCalledWith('/thresholds', dto);
        expect(result.id).toBe(100);
        done();
      });
    });

    it('should return input DTO on error', (done) => {
      const dto: ApiThresholdDto = { metric: 'co2', level: 'good', maxValue: 400 };
      apiServiceMock.post.and.returnValue(throwError(() => new Error('Bad request')));

      service.createThreshold(dto).subscribe((result) => {
        expect(result).toEqual(dto);
        done();
      });
    });
  });

  describe('updateThreshold()', () => {
    it('should call PUT /thresholds/{id} with updated DTO', (done) => {
      const id = 1;
      const dto: ApiThresholdDto = { metric: 'co2', level: 'good', maxValue: 450 };

      apiServiceMock.put.and.returnValue(of(dto));

      service.updateThreshold(id, dto).subscribe((result) => {
        expect(apiServiceMock.put).toHaveBeenCalledWith(`/thresholds/${id}`, dto);
        expect(result.maxValue).toBe(450);
        done();
      });
    });

    it('should return input DTO on error', (done) => {
      const id = 999;
      const dto: ApiThresholdDto = { metric: 'co2', level: 'good', maxValue: 450 };
      apiServiceMock.put.and.returnValue(throwError(() => new Error('Not found')));

      service.updateThreshold(id, dto).subscribe((result) => {
        expect(result).toEqual(dto);
        done();
      });
    });
  });

  describe('deleteThreshold()', () => {
    it('should call DELETE /thresholds/{id}', (done) => {
      const id = 1;
      apiServiceMock.delete.and.returnValue(of(null));

      service.deleteThreshold(id).subscribe(() => {
        expect(apiServiceMock.delete).toHaveBeenCalledWith(`/thresholds/${id}`);
        done();
      });
    });

    it('should return null on error', (done) => {
      apiServiceMock.delete.and.returnValue(throwError(() => new Error('Error')));

      service.deleteThreshold(999).subscribe((result) => {
        expect(result).toBeNull();
        done();
      });
    });
  });

  describe('updateMetricThresholds()', () => {
    it('should call PUT /thresholds/metric/{metric} with DTO array', (done) => {
      const metric = 'co2';
      apiServiceMock.put.and.returnValue(of(mockCo2Dtos));

      service.updateMetricThresholds(metric, mockCo2Dtos).subscribe((result) => {
        expect(apiServiceMock.put).toHaveBeenCalledWith(
          `/thresholds/metric/${metric}`,
          mockCo2Dtos,
        );
        expect(result).toEqual(mockCo2Dtos);
        done();
      });
    });

    it('should return input array on error', (done) => {
      const metric = 'co2';
      apiServiceMock.put.and.returnValue(throwError(() => new Error('Error')));

      service.updateMetricThresholds(metric, mockCo2Dtos).subscribe((result) => {
        expect(result).toEqual(mockCo2Dtos);
        done();
      });
    });
  });

  describe('deleteMetricThresholds()', () => {
    it('should call DELETE /thresholds/metric/{metric}', (done) => {
      const metric = 'co2';
      apiServiceMock.delete.and.returnValue(of(null));

      service.deleteMetricThresholds(metric).subscribe(() => {
        expect(apiServiceMock.delete).toHaveBeenCalledWith(`/thresholds/metric/${metric}`);
        done();
      });
    });

    it('should return null on error', (done) => {
      apiServiceMock.delete.and.returnValue(throwError(() => new Error('Error')));

      service.deleteMetricThresholds('unknown').subscribe((result) => {
        expect(result).toBeNull();
        done();
      });
    });
  });

  describe('convertApiToConfig()', () => {
    it('should convert unsorted DTOs to config with sorted levels', () => {
      const unsortedDtos: ApiThresholdDto[] = [
        { metric: 'co2', level: 'poor', maxValue: 1200 },
        { metric: 'co2', level: 'good', maxValue: 400 },
        { metric: 'co2', level: 'moderate', maxValue: 800 },
      ];

      const config = service.convertApiToConfig(unsortedDtos);

      expect(config).toBeDefined();
      expect(config?.label).toBe('co2');
      expect(config?.unit).toBe('ppm');
      expect(config?.levels[0].max).toBe(400);
      expect(config?.levels[1].max).toBe(800);
      expect(config?.levels[2].max).toBe(1200);
    });

    it('should append critical level with Infinity max', () => {
      const dtos: ApiThresholdDto[] = [{ metric: 'co2', level: 'good', maxValue: 400 }];

      const config = service.convertApiToConfig(dtos);

      const criticalLevel = config?.levels.find((l) => l.key === 'critical');
      expect(criticalLevel).toBeDefined();
      expect(criticalLevel?.max).toBe(Infinity);
      expect(criticalLevel?.label).toBe('Crítico');
    });

    it('should set correct label, color, and classes for level', () => {
      const dtos: ApiThresholdDto[] = [{ metric: 'co2', level: 'good', maxValue: 400 }];

      const config = service.convertApiToConfig(dtos);
      const goodLevel = config?.levels[0];

      expect(goodLevel?.label).toBe('Bueno');
      expect(goodLevel?.color).toBe('#10b981');
      expect(goodLevel?.textClass).toContain('green');
      expect(goodLevel?.bgClass).toContain('green');
      expect(goodLevel?.gaugeGradient).toContain('green');
    });

    it('should set correct unit and scale for metric', () => {
      const tempDtos: ApiThresholdDto[] = [{ metric: 'temperature', level: 'good', maxValue: 20 }];

      const config = service.convertApiToConfig(tempDtos);

      expect(config?.unit).toBe('°C');
      expect(config?.scaleMin).toBe(-10);
      expect(config?.scaleMax).toBe(50);
    });

    it('should return null for empty DTO array', () => {
      const config = service.convertApiToConfig([]);

      expect(config).toBeNull();
    });

    it('should handle null maxValue by treating as 0', () => {
      const dtos: ApiThresholdDto[] = [{ metric: 'co2', level: 'good', maxValue: null }];

      const config = service.convertApiToConfig(dtos);

      expect(config?.levels[0].max).toBe(0);
    });

    it('should return config with correct metric label from first DTO', () => {
      const dtos: ApiThresholdDto[] = [{ metric: 'pm25', level: 'good', maxValue: 10 }];

      const config = service.convertApiToConfig(dtos);

      expect(config?.label).toBe('pm25');
      expect(config?.unit).toBe('µg/m³');
    });
  });

  describe('convertConfigToApi()', () => {
    it('should convert config levels to DTOs with metric name', () => {
      const levels: ThresholdLevel[] = [
        {
          max: 400,
          key: 'good',
          label: 'Bueno',
          color: '#10b981',
          textClass: 'text-green-600',
          bgClass: 'bg-green-100',
          gaugeGradient: 'from-green-500/20',
        },
        {
          max: Infinity,
          key: 'critical',
          label: 'Crítico',
          color: '#ef4444',
          textClass: 'text-red-600',
          bgClass: 'bg-red-100',
          gaugeGradient: 'from-red-500/20',
        },
      ];
      const config: MetricThresholdConfig = {
        label: 'co2',
        unit: 'ppm',
        scaleMin: 0,
        scaleMax: 2000,
        levels,
      };

      const dtos = service.convertConfigToApi('co2', config);

      expect(dtos.length).toBe(1);
      expect(dtos[0].metric).toBe('co2');
      expect(dtos[0].level).toBe('good');
      expect(dtos[0].maxValue).toBe(400);
    });

    it('should filter out levels with Infinity max', () => {
      const levels: ThresholdLevel[] = [
        {
          max: 400,
          key: 'good',
          label: 'Bueno',
          color: '#10b981',
          textClass: '',
          bgClass: '',
          gaugeGradient: '',
        },
        {
          max: 800,
          key: 'moderate',
          label: 'Moderado',
          color: '#f59e0b',
          textClass: '',
          bgClass: '',
          gaugeGradient: '',
        },
        {
          max: Infinity,
          key: 'critical',
          label: 'Crítico',
          color: '#ef4444',
          textClass: '',
          bgClass: '',
          gaugeGradient: '',
        },
      ];
      const config: MetricThresholdConfig = {
        label: 'co2',
        unit: 'ppm',
        scaleMin: 0,
        scaleMax: 2000,
        levels,
      };

      const dtos = service.convertConfigToApi('co2', config);

      expect(dtos.length).toBe(2);
      expect(dtos.every((d) => d.maxValue !== Infinity)).toBe(true);
      expect(dtos.map((d) => d.level)).toEqual(['good', 'moderate']);
    });

    it('should preserve level key as string literal type', () => {
      const levels: ThresholdLevel[] = [
        {
          max: 450,
          key: 'poor',
          label: 'Elevado',
          color: '#f97316',
          textClass: '',
          bgClass: '',
          gaugeGradient: '',
        },
      ];
      const config: MetricThresholdConfig = {
        label: 'co2',
        unit: 'ppm',
        scaleMin: 0,
        scaleMax: 2000,
        levels,
      };

      const dtos = service.convertConfigToApi('co2', config);

      expect(dtos[0].level).toBe('poor');
    });

    it('should handle empty config levels', () => {
      const config: MetricThresholdConfig = {
        label: 'co2',
        unit: 'ppm',
        scaleMin: 0,
        scaleMax: 2000,
        levels: [],
      };

      const dtos = service.convertConfigToApi('co2', config);

      expect(dtos.length).toBe(0);
    });
  });

  describe('private helper methods', () => {
    it('should return correct units for metrics', () => {
      expect(service['getUnitForMetric']('co2')).toBe('ppm');
      expect(service['getUnitForMetric']('pm25')).toBe('µg/m³');
      expect(service['getUnitForMetric']('temperature')).toBe('°C');
      expect(service['getUnitForMetric']('humidity')).toBe('%');
      expect(service['getUnitForMetric']('co')).toBe('ppm');
      expect(service['getUnitForMetric']('no2')).toBe('ppb');
      expect(service['getUnitForMetric']('nh3')).toBe('ppb');
      expect(service['getUnitForMetric']('pm10')).toBe('µg/m³');
    });

    it('should return unknown metric unit as empty string', () => {
      expect(service['getUnitForMetric']('unknown')).toBe('');
    });

    it('should return correct scale min for metrics', () => {
      expect(service['getScaleMin']('temperature')).toBe(-10);
      expect(service['getScaleMin']('humidity')).toBe(0);
      expect(service['getScaleMin']('co2')).toBe(0);
      expect(service['getScaleMin']('unknown')).toBe(0);
    });

    it('should return correct scale max for metrics', () => {
      expect(service['getScaleMax']('co2')).toBe(2000);
      expect(service['getScaleMax']('temperature')).toBe(50);
      expect(service['getScaleMax']('humidity')).toBe(100);
      expect(service['getScaleMax']('unknown')).toBe(100);
    });

    it('should return correct Spanish labels for level keys', () => {
      expect(service['getLabelForLevel']('good')).toBe('Bueno');
      expect(service['getLabelForLevel']('moderate')).toBe('Moderado');
      expect(service['getLabelForLevel']('poor')).toBe('Elevado');
      expect(service['getLabelForLevel']('critical')).toBe('Crítico');
    });

    it('should return correct colors for level keys', () => {
      expect(service['getColorForLevel']('good')).toBe('#10b981');
      expect(service['getColorForLevel']('moderate')).toBe('#f59e0b');
      expect(service['getColorForLevel']('poor')).toBe('#f97316');
      expect(service['getColorForLevel']('critical')).toBe('#ef4444');
      expect(service['getColorForLevel']('unknown')).toBe('#9ca3af');
    });

    it('should return correct text classes for level keys', () => {
      const goodClass = service['getTextClassForLevel']('good');
      expect(goodClass).toContain('green');
      expect(goodClass).toContain('dark:');

      const criticalClass = service['getTextClassForLevel']('critical');
      expect(criticalClass).toContain('red');
    });

    it('should return correct bg classes for level keys', () => {
      const goodBg = service['getBgClassForLevel']('good');
      expect(goodBg).toContain('green');
      expect(goodBg).toContain('dark:');

      const poorBg = service['getBgClassForLevel']('poor');
      expect(poorBg).toContain('orange');
    });

    it('should return correct gauge gradients for level keys', () => {
      const goodGradient = service['getGaugeGradientForLevel']('good');
      expect(goodGradient).toContain('green');
      expect(goodGradient).toContain('to-');

      const criticalGradient = service['getGaugeGradientForLevel']('critical');
      expect(criticalGradient).toContain('red');
    });
  });
});
