import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { LocationService } from '../../../../core/services/location.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Location } from '../../../../core/models/location.model';
import {
  LocationMapPickerComponent,
  MapCoordinates,
} from '../location-map-picker/location-map-picker.component';

/**
 * RegisterLocationViewComponent (Presentation Component)
 *
 * Provides a complete location registration form with interactive Google Map picker for GPS coordinates,
 * reactive form validation, and automatic navigation on success. Uses BehaviorSubjects for reactive
 * state management of form loading and feedback messages.
 *
 * Features:
 * - Reactive form with FormBuilder: description, latitude, longitude fields
 * - Description validation: required, minLength 3, maxLength 255
 * - Latitude validation: regex pattern for valid lat values (-90 to 90 with up to 8 decimals)
 * - Longitude validation: regex pattern for valid lng values (-180 to 180 with up to 8 decimals)
 * - LocationMapPickerComponent integration: interactive map picker for coordinate selection
 * - onMapCoordinatesSelected: auto-populates form latitude/longitude, marks fields as touched
 * - Map picker: initialLatitude and initialLongitude bound to form values (updates reactively)
 * - Success message alert: green background with checkmark, dismissed after auto-navigation
 * - Error message alert: red background with X, cleared on form reset
 * - Toast notifications: success toast shows location name, error toast generic message
 * - Form submission: validates form, parses coordinates to float, calls LocationService.create()
 * - Auto-redirect: navigates to /dashboard/locations/monitoring after 1.2s on success
 * - Loading state: isLoading$ BehaviorSubject disables submit button during API call
 * - Form reset: onReset() clears fields and feedback messages
 * - Coordinate formatting: 6 decimals for display and storage
 * - Dark mode support via dark: Tailwind prefix
 * - OnPush change detection strategy
 *
 * @selector app-register-location-view
 * @standalone true
 * @imports CommonModule, FormsModule, ReactiveFormsModule, LocationMapPickerComponent
 * @example
 * <app-register-location-view />
 */
@Component({
  selector: 'app-register-location-view',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, LocationMapPickerComponent],
  templateUrl: './register-location-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterLocationViewComponent {
  locationForm: FormGroup;
  isLoading$ = new BehaviorSubject<boolean>(false);
  successMessage$ = new BehaviorSubject<string | null>(null);
  errorMessage$ = new BehaviorSubject<string | null>(null);

  constructor(
    private fb: FormBuilder,
    private locationService: LocationService,
    private router: Router,
    private toastService: ToastService,
  ) {
    this.locationForm = this.fb.group({
      description: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(255)]],
      latitude: [
        '',
        [Validators.required, Validators.pattern(/^-?([0-8]?[0-9]|90)(\.[0-9]{1,8})?$/)],
      ],
      longitude: [
        '',
        [Validators.required, Validators.pattern(/^-?(1[0-7][0-9]|[1-9]?[0-9])(\.[0-9]{1,8})?$/)],
      ],
    });
  }

  /**
   * Submits location registration form to backend via LocationService.create().
   * Validates form first, parses latitude/longitude to float, constructs Location object,
   * calls API with finalize operator for loading state, and handles success/error responses.
   * On success: shows toast notification and navigates to monitoring view after 1.2s delay.
   * On error: displays error toast with generic message.
   * @returns {void}
   */
  onSubmit(): void {
    if (!this.locationForm.valid) {
      this.errorMessage$.next('Please fill all fields correctly');
      return;
    }

    this.isLoading$.next(true);
    this.successMessage$.next(null);
    this.errorMessage$.next(null);

    const formValue = this.locationForm.value;
    const locationData = {
      latitude: parseFloat(formValue.latitude),
      longitude: parseFloat(formValue.longitude),
      description: formValue.description,
    } as Location;

    this.locationService
      .create(locationData)
      .pipe(finalize(() => this.isLoading$.next(false)))
      .subscribe({
        next: () => {
          this.successMessage$.next(null);
          this.toastService.success(
            `Ubicación "${formValue.description}" registrada exitosamente`,
            'Éxito',
          );
          setTimeout(() => {
            this.router.navigate(['/dashboard/locations/monitoring']);
          }, 1200);
        },
        error: (err) => {
          console.error('Error registering location:', err);
          this.errorMessage$.next(null);
          this.toastService.error(
            'No se pudo registrar la ubicación. Inténtalo de nuevo.',
            'Error',
          );
        },
      });
  }

  /**
   * Resets form to pristine state and clears success/error feedback messages.
   * Called from reset button in template. Clears BehaviorSubject values.
   * @returns {void}
   */
  onReset(): void {
    this.locationForm.reset();
    this.successMessage$.next(null);
    this.errorMessage$.next(null);
  }

  /**
   * Updates form latitude and longitude fields when coordinates are selected from LocationMapPickerComponent.
   * Formats coordinates to 6 decimal places, patches form values,
   * and marks latitude/longitude fields as touched for validation display.
   * Called from LocationMapPickerComponent (coordinatesSelected) output event.
   * @param {MapCoordinates} coords - Coordinate object with latitude and longitude properties
   * @returns {void}
   */
  onMapCoordinatesSelected(coords: MapCoordinates): void {
    this.locationForm.patchValue({
      latitude: coords.latitude.toFixed(6),
      longitude: coords.longitude.toFixed(6),
    });
    this.locationForm.get('latitude')?.markAsTouched();
    this.locationForm.get('longitude')?.markAsTouched();
  }

  /**
   * Checks if location registration form is valid and ready for submission.
   * Returns form.valid property from ReactiveFormsModule FormGroup.
   * Used in template to enable/disable submit button.
   * @returns {boolean} True if form passes all validators, false otherwise
   */
  isFormValid(): boolean {
    return this.locationForm.valid;
  }
}
