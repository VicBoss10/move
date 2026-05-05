/// <reference types="jasmine" />

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { RegisterLocationViewComponent } from './register-location-view.component';
import { LocationService } from '../../../../core/services/location.service';
import { ToastService } from '../../../../core/services/toast.service';
import {
  LocationMapPickerComponent,
  MapCoordinates,
} from '../location-map-picker/location-map-picker.component';

/**
 * Test suite for RegisterLocationViewComponent.
 *
 * Covers:
 * - Component initialization and property defaults
 * - Form validation (description, latitude, longitude)
 * - Map coordinate selection and form population
 * - Location registration submission
 * - API integration with LocationService
 * - Error handling and error message display
 * - Success message and navigation
 * - Loading state management
 * - Form reset functionality
 * - Coordinate formatting (6 decimal places)
 * - Toast notifications
 * - Router navigation on success
 */
describe('RegisterLocationViewComponent', () => {
  let component: RegisterLocationViewComponent;
  let fixture: ComponentFixture<RegisterLocationViewComponent>;
  let locationServiceMock: jasmine.SpyObj<LocationService>;
  let routerMock: jasmine.SpyObj<Router>;
  let toastServiceMock: jasmine.SpyObj<ToastService>;

  beforeEach(async () => {
    locationServiceMock = jasmine.createSpyObj('LocationService', ['create']);
    routerMock = jasmine.createSpyObj('Router', ['navigate']);
    toastServiceMock = jasmine.createSpyObj('ToastService', ['success', 'error']);

    await TestBed.configureTestingModule({
      imports: [RegisterLocationViewComponent, LocationMapPickerComponent],
      providers: [
        provideHttpClient(),
        { provide: LocationService, useValue: locationServiceMock },
        { provide: Router, useValue: routerMock },
        { provide: ToastService, useValue: toastServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterLocationViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Component Initialization', () => {
    it('should initialize with default state values', () => {
      expect(component.locationForm.get('description')?.value).toBe('');
      expect(component.locationForm.get('latitude')?.value).toBe('');
      expect(component.locationForm.get('longitude')?.value).toBe('');
      expect(component.isLoading$.value).toBe(false);
      expect(component.successMessage$.value).toBeNull();
      expect(component.errorMessage$.value).toBeNull();
    });
  });

  describe('Description Validation', () => {
    it('should require description field', () => {
      const descriptionControl = component.locationForm.get('description');
      descriptionControl?.setValue('');

      expect(descriptionControl?.hasError('required')).toBe(true);
    });

    it('should validate minimum description length of 3 characters', () => {
      const descriptionControl = component.locationForm.get('description');
      descriptionControl?.setValue('ab');

      expect(descriptionControl?.hasError('minlength')).toBe(true);
    });

    it('should validate maximum description length of 255 characters', () => {
      const descriptionControl = component.locationForm.get('description');
      descriptionControl?.setValue('a'.repeat(256));

      expect(descriptionControl?.hasError('maxlength')).toBe(true);
    });

    it('should accept valid description', () => {
      const descriptionControl = component.locationForm.get('description');
      descriptionControl?.setValue('Test Location');

      expect(descriptionControl?.valid).toBe(true);
    });
  });

  describe('Latitude Validation', () => {
    it('should validate latitude pattern with valid values', () => {
      const latitudeControl = component.locationForm.get('latitude');

      latitudeControl?.setValue('45.5');
      expect(latitudeControl?.hasError('pattern')).toBe(false);

      latitudeControl?.setValue('90');
      expect(latitudeControl?.hasError('pattern')).toBe(false);

      latitudeControl?.setValue('-90');
      expect(latitudeControl?.hasError('pattern')).toBe(false);
    });

    it('should validate latitude pattern with invalid values', () => {
      const latitudeControl = component.locationForm.get('latitude');

      latitudeControl?.setValue('91');
      expect(latitudeControl?.hasError('pattern')).toBe(true);

      latitudeControl?.setValue('-91');
      expect(latitudeControl?.hasError('pattern')).toBe(true);
    });

    it('should accept latitude with up to 8 decimal places', () => {
      const latitudeControl = component.locationForm.get('latitude');
      latitudeControl?.setValue('45.12345678');

      expect(latitudeControl?.hasError('pattern')).toBe(false);
    });

    it('should handle negative latitude coordinates', () => {
      const latitudeControl = component.locationForm.get('latitude');
      latitudeControl?.setValue('-4.710989');

      expect(latitudeControl?.hasError('pattern')).toBe(false);
    });
  });

  describe('Longitude Validation', () => {
    it('should validate longitude pattern with valid values', () => {
      const longitudeControl = component.locationForm.get('longitude');

      longitudeControl?.setValue('120.5');
      expect(longitudeControl?.hasError('pattern')).toBe(false);

      longitudeControl?.setValue('179.5');
      expect(longitudeControl?.hasError('pattern')).toBe(false);

      longitudeControl?.setValue('-179.5');
      expect(longitudeControl?.hasError('pattern')).toBe(false);
    });

    it('should validate longitude pattern with invalid values', () => {
      const longitudeControl = component.locationForm.get('longitude');

      longitudeControl?.setValue('181');
      expect(longitudeControl?.hasError('pattern')).toBe(true);

      longitudeControl?.setValue('-181');
      expect(longitudeControl?.hasError('pattern')).toBe(true);
    });

    it('should accept longitude with up to 8 decimal places', () => {
      const longitudeControl = component.locationForm.get('longitude');
      longitudeControl?.setValue('120.12345678');

      expect(longitudeControl?.hasError('pattern')).toBe(false);
    });

    it('should handle negative longitude coordinates', () => {
      const longitudeControl = component.locationForm.get('longitude');
      longitudeControl?.setValue('-74.009069');

      expect(longitudeControl?.hasError('pattern')).toBe(false);
    });
  });

  describe('Map Coordinate Selection', () => {
    it('should update form coordinates when map coordinates are selected', () => {
      const coords: MapCoordinates = {
        latitude: 4.710989,
        longitude: -74.009069,
      };

      component.onMapCoordinatesSelected(coords);

      expect(component.locationForm.get('latitude')?.value).toBe('4.710989');
      expect(component.locationForm.get('longitude')?.value).toBe('-74.009069');
    });

    it('should format coordinates to 6 decimal places', () => {
      const coords: MapCoordinates = {
        latitude: 4.7109891234567,
        longitude: -74.0090691234567,
      };

      component.onMapCoordinatesSelected(coords);

      expect(component.locationForm.get('latitude')?.value).toBe('4.710989');
      expect(component.locationForm.get('longitude')?.value).toBe('-74.009069');
    });

    it('should mark latitude as touched when selected from map', () => {
      const coords: MapCoordinates = {
        latitude: 4.710989,
        longitude: -74.009069,
      };

      component.onMapCoordinatesSelected(coords);

      expect(component.locationForm.get('latitude')?.touched).toBe(true);
    });

    it('should mark longitude as touched when selected from map', () => {
      const coords: MapCoordinates = {
        latitude: 4.710989,
        longitude: -74.009069,
      };

      component.onMapCoordinatesSelected(coords);

      expect(component.locationForm.get('longitude')?.touched).toBe(true);
    });

    it('should handle zero latitude coordinate', () => {
      const coords: MapCoordinates = {
        latitude: 0,
        longitude: -74.009069,
      };

      component.onMapCoordinatesSelected(coords);

      expect(component.locationForm.get('latitude')?.value).toBe('0.000000');
    });

    it('should handle zero longitude coordinate', () => {
      const coords: MapCoordinates = {
        latitude: 4.710989,
        longitude: 0,
      };

      component.onMapCoordinatesSelected(coords);

      expect(component.locationForm.get('longitude')?.value).toBe('0.000000');
    });
  });

  describe('Form Submission - Validation', () => {
    it('should not submit if form is invalid', () => {
      component.onSubmit();

      expect(component.errorMessage$.value).toBe('Please fill all fields correctly');
      expect(locationServiceMock.create).not.toHaveBeenCalled();
    });
  });

  describe('Form Submission - Success', () => {
    it('should submit location with valid form', fakeAsync(() => {
      locationServiceMock.create.and.returnValue(of({ id: 1, latitude: 0, longitude: 0 }));

      component.locationForm.patchValue({
        description: 'Test Location',
        latitude: '4.710989',
        longitude: '-74.009069',
      });

      component.onSubmit();
      tick(1300);

      expect(locationServiceMock.create).toHaveBeenCalled();
      expect(toastServiceMock.success).toHaveBeenCalled();
      expect(routerMock.navigate).toHaveBeenCalledWith(['/dashboard/locations/monitoring']);
    }));

    it('should set loading to false after submission completes', fakeAsync(() => {
      locationServiceMock.create.and.returnValue(of({ id: 1, latitude: 0, longitude: 0 }));

      component.locationForm.patchValue({
        description: 'Test Location',
        latitude: '4.710989',
        longitude: '-74.009069',
      });

      component.onSubmit();
      tick(1300);

      expect(component.isLoading$.value).toBe(false);
    }));

    it('should parse coordinates to float before submission', () => {
      locationServiceMock.create.and.returnValue(of({ id: 1, latitude: 0, longitude: 0 }));

      component.locationForm.patchValue({
        description: 'Test Location',
        latitude: '4.710989',
        longitude: '-74.009069',
      });

      component.onSubmit();

      const submittedData = locationServiceMock.create.calls.mostRecent().args[0];
      expect(typeof submittedData.latitude).toBe('number');
      expect(typeof submittedData.longitude).toBe('number');
      expect(submittedData.latitude).toBe(4.710989);
      expect(submittedData.longitude).toBe(-74.009069);
    });

    it('should include description in submitted location object', () => {
      locationServiceMock.create.and.returnValue(of({ id: 1, latitude: 0, longitude: 0 }));

      component.locationForm.patchValue({
        description: 'Test Location',
        latitude: '4.710989',
        longitude: '-74.009069',
      });

      component.onSubmit();

      const submittedData = locationServiceMock.create.calls.mostRecent().args[0];
      expect(submittedData.description).toBe('Test Location');
    });

    it('should clear error and success messages on new submission', () => {
      component.errorMessage$.next('Previous error');
      component.successMessage$.next('Previous success');

      locationServiceMock.create.and.returnValue(of({ id: 1, latitude: 0, longitude: 0 }));

      component.locationForm.patchValue({
        description: 'Test Location',
        latitude: '4.710989',
        longitude: '-74.009069',
      });

      component.onSubmit();

      expect(component.errorMessage$.value).toBeNull();
      expect(component.successMessage$.value).toBeNull();
    });

    it('should display success toast with location name', fakeAsync(() => {
      locationServiceMock.create.and.returnValue(of({ id: 1, latitude: 0, longitude: 0 }));

      component.locationForm.patchValue({
        description: 'My Test Location',
        latitude: '4.710989',
        longitude: '-74.009069',
      });

      component.onSubmit();
      tick(100);

      expect(toastServiceMock.success).toHaveBeenCalledWith(
        'Location "My Test Location" registered successfully',
        'Success',
      );
    }));

    it('should navigate to monitoring page after 1.2 seconds on success', fakeAsync(() => {
      locationServiceMock.create.and.returnValue(of({ id: 1, latitude: 0, longitude: 0 }));

      component.locationForm.patchValue({
        description: 'Test Location',
        latitude: '4.710989',
        longitude: '-74.009069',
      });

      component.onSubmit();
      tick(1200);

      expect(routerMock.navigate).toHaveBeenCalledWith(['/dashboard/locations/monitoring']);
    }));

    it('should handle multiple sequential location submissions', fakeAsync(() => {
      locationServiceMock.create.and.returnValue(of({ id: 1, latitude: 0, longitude: 0 }));

      component.locationForm.patchValue({
        description: 'Location 1',
        latitude: '4.710989',
        longitude: '-74.009069',
      });

      component.onSubmit();
      tick(1300);

      component.locationForm.patchValue({
        description: 'Location 2',
        latitude: '4.711',
        longitude: '-74.010',
      });

      component.onSubmit();
      tick(1300);

      expect(locationServiceMock.create).toHaveBeenCalledTimes(2);
      expect(routerMock.navigate).toHaveBeenCalledTimes(2);
    }));
  });

  describe('Form Submission - Error Handling', () => {
    it('should handle location registration error', fakeAsync(() => {
      const errorResponse = { message: 'Registration failed' };
      locationServiceMock.create.and.returnValue(throwError(() => errorResponse));

      component.locationForm.patchValue({
        description: 'Test Location',
        latitude: '4.710989',
        longitude: '-74.009069',
      });

      component.onSubmit();
      tick(100);

      expect(toastServiceMock.error).toHaveBeenCalledWith(
        'Failed to register location. Please try again.',
        'Error',
      );
      expect(component.isLoading$.value).toBe(false);
    }));

    it('should not navigate on registration error', fakeAsync(() => {
      const errorResponse = { message: 'Registration failed' };
      locationServiceMock.create.and.returnValue(throwError(() => errorResponse));

      component.locationForm.patchValue({
        description: 'Test Location',
        latitude: '4.710989',
        longitude: '-74.009069',
      });

      component.onSubmit();
      tick(100);

      expect(routerMock.navigate).not.toHaveBeenCalled();
    }));
  });

  describe('Form State Management', () => {
    it('should reset form to initial state', () => {
      component.locationForm.patchValue({
        description: 'Test Location',
        latitude: '4.710989',
        longitude: '-74.009069',
      });

      component.errorMessage$.next('Error message');
      component.successMessage$.next('Success message');

      component.onReset();

      expect(component.locationForm.get('description')?.value).toBeNull();
      expect(component.locationForm.get('latitude')?.value).toBeNull();
      expect(component.locationForm.get('longitude')?.value).toBeNull();
      expect(component.errorMessage$.value).toBeNull();
      expect(component.successMessage$.value).toBeNull();
    });

    it('should return true for isFormValid when form is valid', () => {
      component.locationForm.patchValue({
        description: 'Test Location',
        latitude: '4.710989',
        longitude: '-74.009069',
      });

      expect(component.isFormValid()).toBe(true);
    });

    it('should return false for isFormValid when form is invalid', () => {
      component.locationForm.patchValue({
        description: '',
        latitude: '',
        longitude: '',
      });

      expect(component.isFormValid()).toBe(false);
    });

    it('should return false when only description is filled', () => {
      component.locationForm.patchValue({
        description: 'Test Location',
        latitude: '',
        longitude: '',
      });

      expect(component.isFormValid()).toBe(false);
    });

    it('should trim and preserve description spaces', fakeAsync(() => {
      locationServiceMock.create.and.returnValue(of({ id: 1, latitude: 0, longitude: 0 }));

      component.locationForm.patchValue({
        description: 'Test Location Name',
        latitude: '4.710989',
        longitude: '-74.009069',
      });

      component.onSubmit();
      tick(100);

      const submittedData = locationServiceMock.create.calls.mostRecent().args[0];
      expect(submittedData.description).toBe('Test Location Name');
    }));
  });

  describe('Invalid Input Handling', () => {
    it('should display error message for invalid latitude', () => {
      const latitudeControl = component.locationForm.get('latitude');
      latitudeControl?.setValue('invalid');

      expect(latitudeControl?.hasError('pattern')).toBe(true);
    });

    it('should display error message for invalid longitude', () => {
      const longitudeControl = component.locationForm.get('longitude');
      longitudeControl?.setValue('invalid');

      expect(longitudeControl?.hasError('pattern')).toBe(true);
    });
  });
});
