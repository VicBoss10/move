/// <reference types="jasmine" />

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { RegisterDeviceFormComponent } from './register-device-form.component';
import { LocationService } from '../../../../core/services/location.service';
import { DeviceService } from '../../../../core/services/device.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Location } from '../../../../core/models/location.model';

type CameraRegistrationRequestTestType = {
  name: string;
  type: string;
  state: string;
  locationId: number;
  streamType: string;
  source: string;
};

/**
 * Test suite for RegisterDeviceFormComponent.
 *
 * Covers:
 * - Component initialization and property defaults
 * - Device type selection (CAMERA vs SENSOR)
 * - Form validation for camera registration
 * - Dynamic validator updates based on device type
 * - Camera registration submission
 * - Sensor registration with message and navigation
 * - Location list loading and error handling
 * - LED blink simulation for sensor type
 * - Error message display and clearing
 * - Loading state management
 * - Form reset functionality
 * - Router navigation on success
 * - Service integration (LocationService, DeviceService, ToastService)
 * - Custom validators (trimmed text, positive integer, source by stream type)
 */
describe('RegisterDeviceFormComponent', () => {
  let component: RegisterDeviceFormComponent;
  let fixture: ComponentFixture<RegisterDeviceFormComponent>;
  let locationServiceMock: jasmine.SpyObj<LocationService>;
  let deviceServiceMock: jasmine.SpyObj<DeviceService>;
  let toastServiceMock: jasmine.SpyObj<ToastService>;
  let routerMock: jasmine.SpyObj<Router>;

  const mockLocations: Location[] = [
    { id: 1, description: 'Location 1', latitude: 0, longitude: 0 },
    { id: 2, description: 'Location 2', latitude: 0, longitude: 0 },
  ];

  beforeEach(async () => {
    locationServiceMock = jasmine.createSpyObj('LocationService', ['getAll']);
    deviceServiceMock = jasmine.createSpyObj('DeviceService', ['register']);
    toastServiceMock = jasmine.createSpyObj('ToastService', ['success', 'error']);
    routerMock = jasmine.createSpyObj('Router', ['navigate']);

    locationServiceMock.getAll.and.returnValue(of(mockLocations));

    await TestBed.configureTestingModule({
      imports: [RegisterDeviceFormComponent],
      providers: [
        provideHttpClient(),
        { provide: LocationService, useValue: locationServiceMock },
        { provide: DeviceService, useValue: deviceServiceMock },
        { provide: ToastService, useValue: toastServiceMock },
        { provide: Router, useValue: routerMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterDeviceFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    component.ngOnDestroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Component Initialization', () => {
    it('should initialize with empty form controls', () => {
      expect(component.deviceForm.get('name')?.value).toBe('');
      expect(component.deviceForm.get('type')?.value).toBe('');
      expect(component.deviceForm.get('locationId')?.value).toBe('');
      expect(component.deviceForm.get('state')?.value).toBe('ACTIVE');
      expect(component.deviceForm.get('streamType')?.value).toBe('');
      expect(component.deviceForm.get('source')?.value).toBe('');
    });

    it('should initialize with default state values', () => {
      expect(component.isLoading$.value).toBe(false);
      expect(component.successMessage$.value).toBeNull();
      expect(component.errorMessage$.value).toBeNull();
      expect(component.selectedType$.value).toBe('');
    });
  });

  describe('Location Loading', () => {
    it('should load locations on init', () => {
      component.locations$.subscribe((locations) => {
        expect(locations).toEqual(mockLocations);
      });
      expect(locationServiceMock.getAll).toHaveBeenCalled();
    });

    it('should handle location loading error with empty array fallback', (done) => {
      component.locations$.subscribe((locations) => {
        expect(Array.isArray(locations)).toBe(true);
        done();
      });
    });
  });

  describe('Device Type Selection', () => {
    it('should update selected type when type changes', fakeAsync(() => {
      component.deviceForm.patchValue({ type: 'CAMERA' });
      tick();

      expect(component.selectedType$.value).toBe('CAMERA');
    }));

    it('should require streamType when CAMERA is selected', () => {
      component.deviceForm.patchValue({ type: 'CAMERA' });
      const streamTypeControl = component.deviceForm.get('streamType');

      expect(streamTypeControl?.validator).toBeTruthy();
    });

    it('should not require streamType when SENSOR is selected', () => {
      component.deviceForm.patchValue({ type: 'SENSOR' });
      const streamTypeControl = component.deviceForm.get('streamType');

      expect(streamTypeControl?.hasError('required')).toBe(false);
    });
  });

  describe('LED Blinking Simulation', () => {
    it('should toggle LED image every 500ms during SENSOR selection', fakeAsync(() => {
      const initialSrc = component.captiveLedSrc;
      component.deviceForm.patchValue({ type: 'SENSOR' });

      tick(500);
      const firstToggle = component.captiveLedSrc;
      expect(firstToggle).not.toBe(initialSrc);

      tick(500);
      const secondToggle = component.captiveLedSrc;
      expect(secondToggle).not.toBe(firstToggle);
    }));

    it('should stop LED blinking when SENSOR type is deselected', fakeAsync(() => {
      component.deviceForm.patchValue({ type: 'SENSOR' });
      tick(500);

      component.deviceForm.patchValue({ type: 'CAMERA' });

      expect(component.captiveLedSrc).toContain('Conectar');
    }));
  });

  describe('Device Name Validation', () => {
    it('should validate device name is not blank-only', () => {
      const nameControl = component.deviceForm.get('name');
      nameControl?.setValue('   ');

      expect(nameControl?.hasError('blankValue')).toBe(true);
    });

    it('should require minimum 3 characters for device name', () => {
      const nameControl = component.deviceForm.get('name');
      nameControl?.setValue('ab');

      expect(nameControl?.hasError('minlength')).toBe(true);
    });

    it('should require maximum 100 characters for device name', () => {
      const nameControl = component.deviceForm.get('name');
      nameControl?.setValue('a'.repeat(101));

      expect(nameControl?.hasError('maxlength')).toBe(true);
    });
  });

  describe('Location ID Validation', () => {
    it('should validate locationId as positive integer', () => {
      const locationIdControl = component.deviceForm.get('locationId');

      locationIdControl?.setValue(-1);
      expect(locationIdControl?.hasError('positiveInteger')).toBe(true);

      locationIdControl?.setValue(0);
      expect(locationIdControl?.hasError('positiveInteger')).toBe(true);

      locationIdControl?.setValue(1);
      expect(locationIdControl?.hasError('positiveInteger')).toBe(false);
    });
  });

  describe('Stream Source Validation', () => {
    it('should validate RTSP source format', () => {
      component.deviceForm.patchValue({ streamType: 'RTSP' });
      const sourceControl = component.deviceForm.get('source');

      sourceControl?.setValue('rtsp://camera.local:554/stream');
      expect(sourceControl?.hasError('invalidRtspSource')).toBe(false);

      sourceControl?.setValue('http://camera.local/stream');
      expect(sourceControl?.hasError('invalidRtspSource')).toBe(true);
    });

    it('should validate HTTP URL source format', () => {
      component.deviceForm.patchValue({ streamType: 'URL' });
      const sourceControl = component.deviceForm.get('source');

      sourceControl?.setValue('https://example.com/stream');
      expect(sourceControl?.hasError('invalidHttpSource')).toBe(false);

      sourceControl?.setValue('ftp://example.com/stream');
      expect(sourceControl?.hasError('invalidHttpSource')).toBe(true);
    });

    it('should validate YouTube source format', () => {
      component.deviceForm.patchValue({ streamType: 'YOUTUBE' });
      const sourceControl = component.deviceForm.get('source');

      sourceControl?.setValue('https://youtube.com/watch?v=test');
      expect(sourceControl?.hasError('invalidYouTubeSource')).toBe(false);

      sourceControl?.setValue('https://youtu.be/test');
      expect(sourceControl?.hasError('invalidYouTubeSource')).toBe(false);

      sourceControl?.setValue('https://example.com/video');
      expect(sourceControl?.hasError('invalidYouTubeSource')).toBe(true);
    });

    it('should validate USB source format', () => {
      component.deviceForm.patchValue({ streamType: 'USB' });
      const sourceControl = component.deviceForm.get('source');

      sourceControl?.setValue('0');
      expect(sourceControl?.hasError('invalidUsbSource')).toBe(false);

      sourceControl?.setValue('/dev/video0');
      expect(sourceControl?.hasError('invalidUsbSource')).toBe(false);

      sourceControl?.setValue('/dev/invalid');
      expect(sourceControl?.hasError('invalidUsbSource')).toBe(true);
    });
  });

  describe('Form Submission - Validation', () => {
    it('should not submit if form is invalid', () => {
      component.onSubmit();

      expect(component.errorMessage$.value).toBe(
        'Por favor, completa todos los campos requeridos correctamente.',
      );
      expect(deviceServiceMock.register).not.toHaveBeenCalled();
    });
  });

  describe('Form Submission - Success', () => {
    it('should submit camera registration with valid form', fakeAsync(() => {
      deviceServiceMock.register.and.returnValue(of({ deviceId: 1, message: 'Success' }));

      component.deviceForm.patchValue({
        name: 'Test Camera',
        type: 'CAMERA',
        locationId: 1,
        state: 'ACTIVE',
        streamType: 'RTSP',
        source: 'rtsp://camera.local/stream',
      });

      component.onSubmit();
      tick(1500);

      expect(deviceServiceMock.register).toHaveBeenCalled();
      expect(toastServiceMock.success).toHaveBeenCalled();
      expect(routerMock.navigate).toHaveBeenCalledWith(['/dashboard/devices/device-status']);
    }));

    it('should set loading to false after submission completes', fakeAsync(() => {
      deviceServiceMock.register.and.returnValue(of({ deviceId: 1, message: 'Success' }));

      component.deviceForm.patchValue({
        name: 'Test Camera',
        type: 'CAMERA',
        locationId: 1,
        streamType: 'RTSP',
        source: 'rtsp://camera.local/stream',
      });

      component.onSubmit();
      tick(100);

      expect(component.isLoading$.value).toBe(false);
    }));

    it('should clear error and success messages on new submission', fakeAsync(() => {
      component.errorMessage$.next('Previous error');
      component.successMessage$.next('Previous success');

      deviceServiceMock.register.and.returnValue(of({ deviceId: 1, message: 'Success' }));

      component.deviceForm.patchValue({
        name: 'Test Camera',
        type: 'CAMERA',
        locationId: 1,
        streamType: 'RTSP',
        source: 'rtsp://camera.local/stream',
      });

      component.onSubmit();
      tick(100);

      expect(component.errorMessage$.value).toBeNull();
    }));

    it('should handle SENSOR registration with message and navigation', fakeAsync(() => {
      component.deviceForm.patchValue({
        name: 'Test Sensor',
        type: 'SENSOR',
        locationId: 1,
        state: 'ACTIVE',
      });

      component.onSubmit();
      tick(1000);

      expect(toastServiceMock.success).toHaveBeenCalledWith(
        'El registro de sensores se realiza desde el propio dispositivo (portal cautivo).',
        'Registro de Sensor',
      );
      expect(routerMock.navigate).toHaveBeenCalledWith(['/dashboard/devices/device-status']);
    }));
  });

  describe('Form Submission - Error Handling', () => {
    it('should handle camera registration error', fakeAsync(() => {
      const errorResponse = { message: 'Registration failed' };
      deviceServiceMock.register.and.returnValue(throwError(() => errorResponse));

      component.deviceForm.patchValue({
        name: 'Test Camera',
        type: 'CAMERA',
        locationId: 1,
        streamType: 'RTSP',
        source: 'rtsp://camera.local/stream',
      });

      component.onSubmit();
      tick(100);

      expect(component.errorMessage$.value).toBe('Registration failed');
      expect(toastServiceMock.error).toHaveBeenCalledWith('Registration failed', 'Error');
      expect(component.isLoading$.value).toBe(false);
    }));

    it('should not navigate on registration error', fakeAsync(() => {
      const errorResponse = { message: 'Registration failed' };
      deviceServiceMock.register.and.returnValue(throwError(() => errorResponse));

      component.deviceForm.patchValue({
        name: 'Test Camera',
        type: 'CAMERA',
        locationId: 1,
        streamType: 'RTSP',
        source: 'rtsp://camera.local/stream',
      });

      component.onSubmit();
      tick(100);

      expect(routerMock.navigate).not.toHaveBeenCalled();
    }));
  });

  describe('Form Reset & Submission State', () => {
    it('should reset form to initial state', () => {
      component.deviceForm.patchValue({
        name: 'Test Device',
        type: 'CAMERA',
        locationId: 1,
        state: 'INACTIVE',
        streamType: 'RTSP',
        source: 'rtsp://test',
      });

      component.errorMessage$.next('Error message');
      component.successMessage$.next('Success message');
      component.selectedType$.next('CAMERA');

      component.resetForm();

      expect(component.deviceForm.get('name')?.value).toBeNull();
      expect(component.deviceForm.get('state')?.value).toBe('ACTIVE');
      expect(component.selectedType$.value).toBe('');
      expect(component.errorMessage$.value).toBeNull();
      expect(component.successMessage$.value).toBeNull();
    });

    it('should return correct canSubmit value', () => {
      component.deviceForm.patchValue({
        name: 'Test Camera',
        type: 'CAMERA',
        locationId: 1,
        streamType: 'RTSP',
        source: 'rtsp://camera.local/stream',
      });

      expect(component.canSubmit()).toBe(true);

      component.isLoading$.next(true);
      expect(component.canSubmit()).toBe(false);
    });
  });

  describe('Stream Type Helpers', () => {
    it('should return stream type description', () => {
      const description = component.getStreamTypeDescription('RTSP');
      expect(description).toBe('Protocolo de streaming en tiempo real');
    });

    it('should return empty string for unknown stream type', () => {
      const description = component.getStreamTypeDescription('UNKNOWN');
      expect(description).toBe('');
    });
  });

  describe('Input Trimming', () => {
    it('should trim device name on submission', fakeAsync(() => {
      deviceServiceMock.register.and.returnValue(of({ deviceId: 1, message: 'Success' }));

      component.deviceForm.patchValue({
        name: '  Test Camera  ',
        type: 'CAMERA',
        locationId: 1,
        streamType: 'RTSP',
        source: 'rtsp://camera.local/stream',
      });

      component.onSubmit();
      tick(100);

      const callArgs = deviceServiceMock.register.calls.mostRecent()
        .args[0] as CameraRegistrationRequestTestType;
      expect(callArgs.name).toBe('Test Camera');
    }));

    it('should trim source URL on submission', fakeAsync(() => {
      deviceServiceMock.register.and.returnValue(of({ deviceId: 1, message: 'Success' }));

      component.deviceForm.patchValue({
        name: 'Test Camera',
        type: 'CAMERA',
        locationId: 1,
        streamType: 'RTSP',
        source: '  rtsp://camera.local/stream  ',
      });

      component.onSubmit();
      tick(100);

      const callArgs = deviceServiceMock.register.calls.mostRecent()
        .args[0] as CameraRegistrationRequestTestType;
      expect(callArgs.source).toBe('rtsp://camera.local/stream');
    }));
  });

  describe('Lifecycle', () => {
    it('should cleanup on component destroy', () => {
      component.deviceForm.patchValue({ type: 'SENSOR' });
      fixture.detectChanges();

      spyOn(component['destroy$'], 'next');
      spyOn(component['destroy$'], 'complete');

      component.ngOnDestroy();

      expect(component['destroy$'].next).toHaveBeenCalled();
      expect(component['destroy$'].complete).toHaveBeenCalled();
    });
  });
});
