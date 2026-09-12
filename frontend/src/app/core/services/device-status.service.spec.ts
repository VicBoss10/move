/// <reference types="jasmine" />

import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { DeviceStatusService, DeviceStatusInfo } from './device-status.service';
import { DeviceService } from './device.service';
import { Device, DeviceType, DeviceState } from '../models/device.model';

/**
 * Test suite for DeviceStatusService.
 *
 * Covers:
 * - Service instantiation and dependency injection
 * - Mapping devices to status information from the device list alone
 * - Setting device status and online state based on device state
 * - Archived flag propagation
 * - DeviceStatusInfo interface structure and completeness
 * - Observable sharing and replaying via shareReplay
 * - Error handling and recovery from upstream service failures
 */
describe('DeviceStatusService', () => {
  let service: DeviceStatusService;
  let deviceServiceMock: jasmine.SpyObj<DeviceService>;

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

  beforeEach(() => {
    const deviceSpy = jasmine.createSpyObj('DeviceService', ['getAll']);

    TestBed.configureTestingModule({
      providers: [DeviceStatusService, { provide: DeviceService, useValue: deviceSpy }],
    });

    service = TestBed.inject(DeviceStatusService);
    deviceServiceMock = TestBed.inject(DeviceService) as jasmine.SpyObj<DeviceService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getDeviceStatuses()', () => {
    it('should map every device returned by the device service', (done) => {
      deviceServiceMock.getAll.and.returnValue(of(mockDevices));

      service.getDeviceStatuses().subscribe((statuses) => {
        expect(statuses.length).toBe(3);
        expect(statuses[0].id).toBe(1);
        expect(statuses[1].id).toBe(2);
        done();
      });
    });

    it('should map device fields to status information', (done) => {
      deviceServiceMock.getAll.and.returnValue(of([mockDevices[0]]));

      service.getDeviceStatuses().subscribe((statuses) => {
        const status = statuses[0];
        expect(status.name).toBe('Sensor Room A');
        expect(status.type).toBe(DeviceType.SENSOR);
        expect(status.location).toBeDefined();
        done();
      });
    });

    it('should not request sensor or detection history', () => {
      deviceServiceMock.getAll.and.returnValue(of(mockDevices));

      service.getDeviceStatuses().subscribe();

      expect(deviceServiceMock.getAll).toHaveBeenCalledTimes(1);
    });

    it('should return empty array on error', (done) => {
      deviceServiceMock.getAll.and.returnValue(throwError(() => new Error('Error')));

      service.getDeviceStatuses().subscribe((statuses) => {
        expect(Array.isArray(statuses)).toBe(true);
        expect(statuses.length).toBe(0);
        done();
      });
    });

    it('should set isOnline based on device state', (done) => {
      deviceServiceMock.getAll.and.returnValue(of(mockDevices));

      service.getDeviceStatuses().subscribe((statuses) => {
        const activeSensor = statuses.find((s) => s.id === 1);
        const inactiveSensor = statuses.find((s) => s.id === 3);

        expect(activeSensor?.isOnline).toBe(true);
        expect(inactiveSensor?.isOnline).toBe(false);
        done();
      });
    });

    it('should set status to device state', (done) => {
      deviceServiceMock.getAll.and.returnValue(of([mockDevices[0], mockDevices[2]]));

      service.getDeviceStatuses().subscribe((statuses) => {
        const activeStatus = statuses.find((s) => s.id === 1);
        const inactiveStatus = statuses.find((s) => s.id === 3);

        expect(activeStatus?.status).toBe('ACTIVE');
        expect(inactiveStatus?.status).toBe('INACTIVE');
        done();
      });
    });

    it('should default archived to false when absent', (done) => {
      deviceServiceMock.getAll.and.returnValue(
        of([mockDevices[0], { ...mockDevices[1], archived: true }]),
      );

      service.getDeviceStatuses().subscribe((statuses) => {
        expect(statuses[0].archived).toBe(false);
        expect(statuses[1].archived).toBe(true);
        done();
      });
    });
  });

  describe('DeviceStatusInfo interface', () => {
    it('should return complete status information', (done) => {
      deviceServiceMock.getAll.and.returnValue(of([mockDevices[0]]));

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
        expect(status.isOnline).toBeDefined();
        expect(status.archived).toBeDefined();
        done();
      });
    });
  });

  describe('shareReplay()', () => {
    it('should share and replay results', (done) => {
      deviceServiceMock.getAll.and.returnValue(of(mockDevices));

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
});
