/// <reference types="jasmine" />

import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { DeviceStatusService, DeviceStatusInfo } from './device-status.service';
import { DeviceService } from './device.service';
import { SensorDataService } from './sensor-data.service';
import { VehicleDetectedService } from './vehicle-detected.service';
import { Device, DeviceType, DeviceState } from '../models/device.model';
import { SensorData } from '../models/sensor-data.model';
import { VehicleDetected, VehicleType } from '../models/vehicle.model';

/**
 * Test suite for DeviceStatusService.
 *
 * Covers:
 * - Service instantiation and dependency injection
 * - Combining device, sensor, and vehicle detection data via combineLatest
 * - Enriching devices with metrics (dataPoints, lastActivity, isOnline status)
 * - Filtering sensor data by deviceId and vehicle data by device.id
 * - Setting device status and online state based on device state
 * - Calculating last activity timestamps for sensors and cameras
 * - DeviceStatusInfo interface structure and completeness
 * - Observable sharing and replaying via shareReplay
 * - Error handling and recovery from upstream service failures
 */
describe('DeviceStatusService', () => {
  let service: DeviceStatusService;
  let deviceServiceMock: jasmine.SpyObj<DeviceService>;
  let sensorDataServiceMock: jasmine.SpyObj<SensorDataService>;
  let vehicleDetectedServiceMock: jasmine.SpyObj<VehicleDetectedService>;

  const mockDevices: Device[] = [
    {
      id: 1,
      name: 'Sensor Room A',
      type: DeviceType.SENSOR,
      state: DeviceState.ACTIVE,
      location: { id: 1, latitude: 10.5, longitude: -76.3, description: 'Room A' },
    },
    {
      id: 2,
      name: 'Camera Front',
      type: DeviceType.CAMERA,
      state: DeviceState.ACTIVE,
      location: { id: 1, latitude: 10.5, longitude: -76.3, description: 'Front Gate' },
    },
    {
      id: 3,
      name: 'Sensor Room B',
      type: DeviceType.SENSOR,
      state: DeviceState.INACTIVE,
      location: { id: 2, latitude: 10.6, longitude: -76.2, description: 'Room B' },
    },
  ];

  const mockSensorData: SensorData[] = [
    {
      id: 1,
      deviceId: 1,
      timestamp: new Date(Date.now() - 10 * 60 * 1000),
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
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
      temperature: 23.0,
      humidity: 46,
      co2: 420,
      pm25: 13,
      pm10: 26,
      co: 0.9,
      no2: 36,
      nh3: 6,
    },
  ];

  const mockVehiclesDetected: VehicleDetected[] = [
    {
      id: 1,
      device: { id: 2 },
      vehicleType: VehicleType.CAR,
      timestamp: new Date(Date.now() - 15 * 60 * 1000),
    },
    {
      id: 2,
      device: { id: 2 },
      vehicleType: VehicleType.TRUCK,
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
    },
  ];

  beforeEach(() => {
    const deviceSpy = jasmine.createSpyObj('DeviceService', ['getAll']);
    const sensorSpy = jasmine.createSpyObj('SensorDataService', ['getAll']);
    const vehicleSpy = jasmine.createSpyObj('VehicleDetectedService', ['getAll']);

    TestBed.configureTestingModule({
      providers: [
        DeviceStatusService,
        { provide: DeviceService, useValue: deviceSpy },
        { provide: SensorDataService, useValue: sensorSpy },
        { provide: VehicleDetectedService, useValue: vehicleSpy },
      ],
    });

    service = TestBed.inject(DeviceStatusService);
    deviceServiceMock = TestBed.inject(DeviceService) as jasmine.SpyObj<DeviceService>;
    sensorDataServiceMock = TestBed.inject(SensorDataService) as jasmine.SpyObj<SensorDataService>;
    vehicleDetectedServiceMock = TestBed.inject(
      VehicleDetectedService,
    ) as jasmine.SpyObj<VehicleDetectedService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getDeviceStatuses()', () => {
    it('should combine device, sensor, and vehicle data', (done) => {
      deviceServiceMock.getAll.and.returnValue(of(mockDevices));
      sensorDataServiceMock.getAll.and.returnValue(of(mockSensorData));
      vehicleDetectedServiceMock.getAll.and.returnValue(of(mockVehiclesDetected));

      service.getDeviceStatuses().subscribe((statuses) => {
        expect(statuses.length).toBe(3);
        expect(statuses[0].id).toBe(1);
        expect(statuses[1].id).toBe(2);
        done();
      });
    });

    it('should enrich each device with metrics', (done) => {
      deviceServiceMock.getAll.and.returnValue(of([mockDevices[0]]));
      sensorDataServiceMock.getAll.and.returnValue(of(mockSensorData));
      vehicleDetectedServiceMock.getAll.and.returnValue(of([]));

      service.getDeviceStatuses().subscribe((statuses) => {
        const status = statuses[0];
        expect(status.name).toBe('Sensor Room A');
        expect(status.type).toBe(DeviceType.SENSOR);
        expect(status.location).toBeDefined();
        done();
      });
    });

    it('should return empty array on error', (done) => {
      deviceServiceMock.getAll.and.returnValue(throwError(() => new Error('Error')));
      sensorDataServiceMock.getAll.and.returnValue(of([]));
      vehicleDetectedServiceMock.getAll.and.returnValue(of([]));

      service.getDeviceStatuses().subscribe((statuses) => {
        expect(Array.isArray(statuses)).toBe(true);
        expect(statuses.length).toBe(0);
        done();
      });
    });

    it('should set isOnline based on device state', (done) => {
      deviceServiceMock.getAll.and.returnValue(of(mockDevices));
      sensorDataServiceMock.getAll.and.returnValue(of(mockSensorData));
      vehicleDetectedServiceMock.getAll.and.returnValue(of(mockVehiclesDetected));

      service.getDeviceStatuses().subscribe((statuses) => {
        const activeSensor = statuses.find((s) => s.id === 1);
        const inactiveSensor = statuses.find((s) => s.id === 3);

        expect(activeSensor?.isOnline).toBe(true);
        expect(inactiveSensor?.isOnline).toBe(false);
        done();
      });
    });
  });

  describe('enrichDeviceWithMetrics()', () => {
    it('should enrich sensor device with sensor data', (done) => {
      const sensorDevice = mockDevices[0];

      deviceServiceMock.getAll.and.returnValue(of([sensorDevice]));
      sensorDataServiceMock.getAll.and.returnValue(of(mockSensorData));
      vehicleDetectedServiceMock.getAll.and.returnValue(of([]));

      service.getDeviceStatuses().subscribe((statuses) => {
        const status = statuses[0];
        expect(status.dataPoints).toBe(2);
        expect(status.lastActivity).toBeDefined();
        done();
      });
    });

    it('should enrich camera device with vehicle detections', (done) => {
      const cameraDevice = mockDevices[1];

      deviceServiceMock.getAll.and.returnValue(of([cameraDevice]));
      sensorDataServiceMock.getAll.and.returnValue(of([]));
      vehicleDetectedServiceMock.getAll.and.returnValue(of(mockVehiclesDetected));

      service.getDeviceStatuses().subscribe((statuses) => {
        const status = statuses[0];
        expect(status.dataPoints).toBe(2);
        expect(status.lastActivity).toBeDefined();
        done();
      });
    });

    it('should set lastActivity to most recent timestamp for sensor', (done) => {
      const sensorDevice = mockDevices[0];

      deviceServiceMock.getAll.and.returnValue(of([sensorDevice]));
      sensorDataServiceMock.getAll.and.returnValue(of(mockSensorData));
      vehicleDetectedServiceMock.getAll.and.returnValue(of([]));

      service.getDeviceStatuses().subscribe((statuses) => {
        const status = statuses[0];
        expect(status.lastActivity?.getTime()).toBe(mockSensorData[1].timestamp.getTime());
        done();
      });
    });

    it('should set lastActivity to most recent timestamp for camera', (done) => {
      const cameraDevice = mockDevices[1];

      deviceServiceMock.getAll.and.returnValue(of([cameraDevice]));
      sensorDataServiceMock.getAll.and.returnValue(of([]));
      vehicleDetectedServiceMock.getAll.and.returnValue(of(mockVehiclesDetected));

      service.getDeviceStatuses().subscribe((statuses) => {
        const status = statuses[0];
        expect(status.lastActivity?.getTime()).toBe(mockVehiclesDetected[1].timestamp.getTime());
        done();
      });
    });

    it('should set lastActivity to null if no data available', (done) => {
      const sensorDevice = mockDevices[0];

      deviceServiceMock.getAll.and.returnValue(of([sensorDevice]));
      sensorDataServiceMock.getAll.and.returnValue(of([]));
      vehicleDetectedServiceMock.getAll.and.returnValue(of([]));

      service.getDeviceStatuses().subscribe((statuses) => {
        const status = statuses[0];
        expect(status.lastActivity).toBeNull();
        done();
      });
    });

    it('should calculate dataPoints as sum of sensor and vehicle data', (done) => {
      const cameraDevice = mockDevices[1];

      deviceServiceMock.getAll.and.returnValue(of([cameraDevice]));
      sensorDataServiceMock.getAll.and.returnValue(of(mockSensorData));
      vehicleDetectedServiceMock.getAll.and.returnValue(of(mockVehiclesDetected));

      service.getDeviceStatuses().subscribe((statuses) => {
        const status = statuses[0];
        expect(status.dataPoints).toBe(2);
        done();
      });
    });

    it('should set status to device state', (done) => {
      deviceServiceMock.getAll.and.returnValue(of([mockDevices[0], mockDevices[2]]));
      sensorDataServiceMock.getAll.and.returnValue(of(mockSensorData));
      vehicleDetectedServiceMock.getAll.and.returnValue(of([]));

      service.getDeviceStatuses().subscribe((statuses) => {
        const activeStatus = statuses.find((s) => s.id === 1);
        const inactiveStatus = statuses.find((s) => s.id === 3);

        expect(activeStatus?.status).toBe('ACTIVE');
        expect(inactiveStatus?.status).toBe('INACTIVE');
        done();
      });
    });

    it('should filter sensor data by deviceId', (done) => {
      const sensorDevice = mockDevices[0];

      deviceServiceMock.getAll.and.returnValue(of([sensorDevice]));
      sensorDataServiceMock.getAll.and.returnValue(of(mockSensorData));
      vehicleDetectedServiceMock.getAll.and.returnValue(of([]));

      service.getDeviceStatuses().subscribe((statuses) => {
        const status = statuses[0];
        expect(status.dataPoints).toBe(2);
        done();
      });
    });

    it('should filter vehicle data by device.id', (done) => {
      const cameraDevice = mockDevices[1];

      deviceServiceMock.getAll.and.returnValue(of([cameraDevice]));
      sensorDataServiceMock.getAll.and.returnValue(of([]));
      vehicleDetectedServiceMock.getAll.and.returnValue(of(mockVehiclesDetected));

      service.getDeviceStatuses().subscribe((statuses) => {
        const status = statuses[0];
        expect(status.dataPoints).toBe(2);
        done();
      });
    });
  });

  describe('DeviceStatusInfo interface', () => {
    it('should return complete status information', (done) => {
      deviceServiceMock.getAll.and.returnValue(of([mockDevices[0]]));
      sensorDataServiceMock.getAll.and.returnValue(of(mockSensorData));
      vehicleDetectedServiceMock.getAll.and.returnValue(of([]));

      service.getDeviceStatuses().subscribe((statuses) => {
        const status = statuses[0] as DeviceStatusInfo;

        expect(status.id).toBeDefined();
        expect(status.name).toBeDefined();
        expect(status.type).toBeDefined();
        expect(status.status).toBeDefined();
        expect(status.location).toBeDefined();
        expect(status.location.id).toBeDefined();
        expect(status.location.latitude).toBeDefined();
        expect(status.location.longitude).toBeDefined();
        expect(status.lastActivity).toBeDefined();
        expect(status.isOnline).toBeDefined();
        expect(status.dataPoints).toBeDefined();
        done();
      });
    });
  });

  describe('shareReplay()', () => {
    it('should share and replay results', (done) => {
      deviceServiceMock.getAll.and.returnValue(of(mockDevices));
      sensorDataServiceMock.getAll.and.returnValue(of(mockSensorData));
      vehicleDetectedServiceMock.getAll.and.returnValue(of(mockVehiclesDetected));

      const statuses$ = service.getDeviceStatuses();

      let firstSubscriberCount = 0;
      let secondSubscriberCount = 0;

      statuses$.subscribe(() => {
        firstSubscriberCount++;
      });

      statuses$.subscribe(() => {
        secondSubscriberCount++;
        if (secondSubscriberCount === 1) {
          expect(firstSubscriberCount).toBe(1);
          expect(secondSubscriberCount).toBe(1);
          done();
        }
      });
    });
  });

  describe('combineLatest behavior', () => {
    it('should emit when all sources emit', (done) => {
      deviceServiceMock.getAll.and.returnValue(of(mockDevices));
      sensorDataServiceMock.getAll.and.returnValue(of(mockSensorData));
      vehicleDetectedServiceMock.getAll.and.returnValue(of(mockVehiclesDetected));

      let emissionCount = 0;
      service.getDeviceStatuses().subscribe(() => {
        emissionCount++;
        if (emissionCount === 1) {
          done();
        }
      });
    });

    it('should handle one source error', (done) => {
      deviceServiceMock.getAll.and.returnValue(of(mockDevices));
      sensorDataServiceMock.getAll.and.returnValue(throwError(() => new Error('Sensor error')));
      vehicleDetectedServiceMock.getAll.and.returnValue(of(mockVehiclesDetected));

      service.getDeviceStatuses().subscribe((statuses) => {
        expect(Array.isArray(statuses)).toBe(true);
        done();
      });
    });
  });
});
