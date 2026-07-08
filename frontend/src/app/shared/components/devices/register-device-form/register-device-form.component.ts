import { Component, ChangeDetectionStrategy, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
  ValidatorFn,
  AsyncValidatorFn,
} from '@angular/forms';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of, Subject } from 'rxjs';
import { map, catchError, shareReplay, takeUntil, first } from 'rxjs/operators';
import { LocationService } from '../../../../core/services/location.service';
import { DeviceService } from '../../../../core/services/device.service';
import { CameraService } from '../../../../core/services/camera.service';
import { ApiService } from '../../../../core/services/api.service';
import { DeviceState, DeviceType } from '../../../../core/models/device.model';
import { Location as AppLocation } from '../../../../core/models/location.model';
import { ToastService } from '../../../../core/services/toast.service';

/**
 * RegisterDeviceFormComponent (Smart Component)
 *
 * Handles registration of cameras and provides instructional guidance for sensor provisioning.
 * Cameras are registered via this form; sensors are self-registered through the captive portal on the device itself.
 *
 * Features:
 * - Device type selector (CAMERA vs SENSOR) with conditional form sections
 * - Camera registration: name, location, stream type, and source URL configuration
 * - Initial state always set to INACTIVE (activated in device management workflow)
 * - Sensor registration: displays multi-step instructional guides with LED indicator images and troubleshooting
 * - Dynamic validator updates based on selected device type (camera requires stream config, sensor does not)
 * - Custom validators: trimmedTextValidator (no blank-only values), positiveIntegerValidator, sourceByStreamTypeValidator
 * - Async validators: sourceNotDuplicatedValidator (prevents duplicate camera streams in the system)
 * - Stream type validation: RTSP (rtsp:// prefix), URL (http/https), YouTube (www.youtube.com or https://, auto-prefixed)
 * - Duplicate stream detection: queries CameraService to verify source URL isn't already registered
 * - Captive portal LED simulation: blinking LED image toggle when SENSOR type is selected
 * - Reactive form with BehaviorSubject for isLoading, successMessage, errorMessage, selectedType
 * - Location list loading with error fallback to empty array
 * - Router navigation to device-status page on successful registration or when sensor info is shown
 * - Toast notifications for success and error feedback (including validation errors)
 * - Dark mode support via Tailwind CSS dark: prefix
 * - OnPush change detection with manual ChangeDetectorRef triggers
 * - OnDestroy cleanup: stops LED blinking interval and completes destroy Subject
 *
 * @selector app-register-device-form
 * @standalone true
 * @imports CommonModule, FormsModule, ReactiveFormsModule
 * @example
 * <app-register-device-form />
 */
@Component({
  selector: 'app-register-device-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './register-device-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterDeviceFormComponent implements OnDestroy {
  /**
   * Subject for component destruction cleanup (unsubscribes from observables).
   * @type {Subject<void>}
   * @private
   */
  private destroy$ = new Subject<void>();

  /**
   * Reactive form for device registration (name, type, locationId, state, streamType, source).
   * @type {FormGroup}
   */
  deviceForm: FormGroup;

  /**
   * Loading state indicator for form submission.
   * @type {BehaviorSubject<boolean>}
   */
  isLoading$ = new BehaviorSubject<boolean>(false);

  /**
   * Success message from registration operation or null.
   * @type {BehaviorSubject<string | null>}
   */
  successMessage$ = new BehaviorSubject<string | null>(null);

  /**
   * Error message from registration operation or null.
   * @type {BehaviorSubject<string | null>}
   */
  errorMessage$ = new BehaviorSubject<string | null>(null);

  /**
   * Currently selected device type (CAMERA or SENSOR) for conditional template rendering.
   * @type {BehaviorSubject<string>}
   */
  selectedType$ = new BehaviorSubject<string>('');

  /**
   * Current LED indicator image source path (simulates blinking during sensor provisioning).
   * @type {string}
   */
  captiveLedSrc = '/images/device-conection/LEDR.png';

  /**
   * Internal toggle flag for LED blink simulation (alternates between images).
   * @type {boolean}
   * @private
   */
  private _captiveLedToggle = false;

  /**
   * Interval ID for LED blink animation (cleared on destroy).
   * @type {ReturnType<typeof setInterval> | null}
   * @private
   */
  private captiveLedInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * Stream of all available locations for device assignment.
   * @type {Observable<AppLocation[]>}
   */
  locations$: Observable<AppLocation[]>;

  /**
   * Available device type options for selection.
   * @type {Array<{id: string, label: string}>}
   */
  deviceTypes = [
    { id: 'CAMERA', label: 'Cámara/Video' },
    { id: 'SENSOR', label: 'Sensor Ambiental' },
  ];

  /**
   * Available stream type options for camera configuration with descriptions.
   * @type {Array<{id: string, label: string, description: string}>}
   */
  streamTypes = [
    { id: 'RTSP', label: 'RTSP Stream', description: 'Protocolo de streaming en tiempo real' },
    { id: 'URL', label: 'HTTP/HTTPS URL', description: 'Imagen o video vía HTTP' },
    { id: 'YOUTUBE', label: 'YouTube', description: 'Stream de YouTube' },
  ];

  /**
   * Available device state options with color indicators.
   * @type {Array<{id: string, label: string, color: string}>}
   */
  states = [
    { id: 'ACTIVE', label: 'Activo', color: 'green' },
    { id: 'INACTIVE', label: 'Inactivo', color: 'gray' },
    { id: 'FAILING', label: 'Fallando', color: 'red' },
  ];

  /**
   * Initializes component with service dependencies and sets up form structure.
   * Configures location list stream and subscribes to device type changes for dynamic validation updates.
   * @param {FormBuilder} fb - Angular FormBuilder for reactive form creation
   * @param {LocationService} locationService - Service for location list retrieval
   * @param {DeviceService} deviceService - Service for camera registration operations
   * @param {ApiService} apiService - Service for backend HTTP operations
   * @param {Router} router - Angular Router for navigation after registration
   * @param {ToastService} toastService - Service for displaying user notifications
   * @param {ChangeDetectorRef} cdr - Change detection reference for manual triggering in OnPush mode
   */
  constructor(
    private fb: FormBuilder,
    private locationService: LocationService,
    private deviceService: DeviceService,
    private cameraService: CameraService,
    private apiService: ApiService,
    private router: Router,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef,
  ) {
    this.deviceForm = this.fb.group({
      name: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(100),
          this.trimmedTextValidator(),
        ],
      ],
      type: ['', Validators.required],
      locationId: ['', [Validators.required, this.positiveIntegerValidator()]],
      state: ['INACTIVE', Validators.required],
      streamType: [''],
      source: ['', [this.sourceByStreamTypeValidator()], [this.sourceNotDuplicatedValidator()]],
    });

    this.locations$ = this.locationService.getAll().pipe(
      map((locations) => locations),
      catchError((error) => {
        console.error('Error loading locations:', error);
        return of([] as AppLocation[]);
      }),
      shareReplay(1),
    );

    this.deviceForm
      .get('type')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((type) => {
        this.selectedType$.next(type);
        this.updateValidators(type);
        // start/stop captive LED blinking when entering/exiting SENSOR type
        if (type === 'SENSOR') {
          this.startCaptiveLedBlink();
        } else {
          this.stopCaptiveLedBlink();
        }
      });
  }

  /**
   * Starts LED blink animation by toggling between LED indicator images every 500ms.
   * Used to simulate captive portal activity during sensor provisioning guidance.
   * @private
   */
  private startCaptiveLedBlink(): void {
    this.stopCaptiveLedBlink();
    this._captiveLedToggle = false;
    this.captiveLedSrc = '/images/device-conection/LEDR.png';
    this.captiveLedInterval = setInterval(() => {
      this._captiveLedToggle = !this._captiveLedToggle;
      this.captiveLedSrc = this._captiveLedToggle
        ? '/images/device-conection/LEDRA2.png'
        : '/images/device-conection/LEDRA.png';
      this.cdr.markForCheck();
    }, 500);
  }

  /**
   * Stops LED blink animation and resets to default image.
   * Called when exiting SENSOR type selection or on component destruction.
   * @private
   */
  private stopCaptiveLedBlink(): void {
    if (this.captiveLedInterval) {
      clearInterval(this.captiveLedInterval);
      this.captiveLedInterval = null;
    }
    this.captiveLedSrc = '/images/device-conection/Conectar.png';
    this.cdr.markForCheck();
  }

  /**
   * Component destruction lifecycle hook.
   * Cleans up LED blinking interval and completes destroy Subject for unsubscription.
   */
  ngOnDestroy(): void {
    this.stopCaptiveLedBlink();
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Updates form validators based on selected device type.
   * CAMERA: requires streamType and source with format validation.
   * SENSOR: clears stream-related validators.
   * @param {string} type - Device type value (CAMERA or SENSOR)
   * @private
   */
  private updateValidators(type: string): void {
    const streamTypeControl = this.deviceForm.get('streamType');
    const sourceControl = this.deviceForm.get('source');

    if (type === 'CAMERA') {
      streamTypeControl?.setValidators([Validators.required]);
      sourceControl?.setValidators([
        Validators.required,
        Validators.minLength(5),
        Validators.maxLength(500),
        this.sourceByStreamTypeValidator(),
      ]);
    } else {
      streamTypeControl?.clearValidators();
      sourceControl?.clearValidators();
    }

    streamTypeControl?.updateValueAndValidity();
    sourceControl?.updateValueAndValidity();
  }

  /**
   * Submits device registration form.
   * For CAMERA: sends registration API call and navigates to device-status page.
   * For SENSOR: shows informational message (sensors self-register via captive portal).
   * Sets loading, success, and error states via BehaviorSubject streams.
   */
  onSubmit(): void {
    if (!this.deviceForm.valid) {
      return;
    }

    this.isLoading$.next(true);
    this.errorMessage$.next(null);
    this.successMessage$.next(null);

    const formValue = this.deviceForm.value;
    const baseData = {
      name: String(formValue.name).trim(),
      type: formValue.type as DeviceType,
      state: DeviceState.INACTIVE,
      locationId: Number(formValue.locationId),
    };

    if (baseData.type === DeviceType.SENSOR) {
      this.isLoading$.next(false);
      setTimeout(() => {
        this.router.navigate(['/dashboard/devices/device-status']);
      }, 500);
      return;
    }

    let source = String(formValue.source).trim();
    if (formValue.streamType === 'YOUTUBE' && !source.toLowerCase().startsWith('http')) {
      source = 'https://' + source;
    }

    const payload = {
      ...baseData,
      type: DeviceType.CAMERA,
      streamType: formValue.streamType,
      source,
    };

    this.deviceService
      .register(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (_response) => {
          this.isLoading$.next(false);
          const typeName = 'Cámara';
          const guidance = 'Para iniciar la detección dirígete a Cámara → Estado del modelo y activa la cámara.';
          this.successMessage$.next(`${typeName} registrado(a) exitosamente. ${guidance}`);
          this.toastService.success(`${typeName} registrado(a) exitosamente. ${guidance}`, 'Éxito');

          setTimeout(() => {
            this.router.navigate(['/dashboard/devices/device-status']);
          }, 1400);
        },
        error: (error: unknown) => {
          this.isLoading$.next(false);
          const errorMsg =
            (error as { message?: string })?.message || 'Error al registrar el dispositivo';
          this.errorMessage$.next(errorMsg);
          this.toastService.error(errorMsg, 'Error');
          console.error('Error registering device:', error);
        },
      });
  }

  /**
   * Resets form to initial state and clears success/error messages.
   */
  resetForm(): void {
    this.deviceForm.reset({ state: 'INACTIVE' });
    this.selectedType$.next('');
    this.errorMessage$.next(null);
    this.successMessage$.next(null);
  }

  /**
   * Returns whether form submission is currently allowed.
   * @returns {boolean} True if form is valid and not loading
   */
  canSubmit(): boolean {
    return this.deviceForm.valid && !this.isLoading$.value;
  }

  /**
   * Retrieves description text for specified stream type.
   * @param {string} streamTypeId - Stream type identifier
   * @returns {string} Description of the stream type or empty string if not found
   */
  getStreamTypeDescription(streamTypeId: string): string {
    return this.streamTypes.find((st) => st.id === streamTypeId)?.description || '';
  }

  /**
   * Validates that text fields are not blank (space-only values).
   * Returns blankValue error if input is whitespace only.
   * @returns {ValidatorFn} Validation function
   * @private
   */
  private trimmedTextValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (typeof value !== 'string') {
        return null;
      }

      if (value.length > 0 && value.trim().length === 0) {
        return { blankValue: true };
      }

      return null;
    };
  }

  /**
   * Validates that location ID is a positive integer.
   * Returns positiveInteger error if value is not a positive integer.
   * @returns {ValidatorFn} Validation function
   * @private
   */
  private positiveIntegerValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (control.value === null || control.value === undefined || control.value === '') {
        return null;
      }

      const parsed = Number(control.value);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        return { positiveInteger: true };
      }

      return null;
    };
  }

  /**
   * Validates source URL/path format based on selected stream type.
   * RTSP: must start with rtsp://
   * URL: must be valid http/https URL
   * YOUTUBE: accepts both complete https:// URLs and www.youtube.com/ URLs (adds https:// automatically on submit)
   * @returns {ValidatorFn} Validation function
   * @private
   */
  private sourceByStreamTypeValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const sourceValue = control.value;
      if (!sourceValue || typeof sourceValue !== 'string') {
        return null;
      }

      const streamType = control.parent?.get('streamType')?.value;
      const source = sourceValue.trim();

      if (!streamType) {
        return null;
      }

      if (streamType === 'RTSP') {
        return source.toLowerCase().startsWith('rtsp://') ? null : { invalidRtspSource: true };
      }

      if (streamType === 'URL') {
        return this.isValidHttpUrl(source) ? null : { invalidHttpSource: true };
      }

      if (streamType === 'YOUTUBE') {
        let urlToValidate = source;
        if (!source.toLowerCase().startsWith('http://') && !source.toLowerCase().startsWith('https://')) {
          urlToValidate = 'https://' + source;
        }
        const isYouTube = this.isValidHttpUrl(urlToValidate) && /(youtube\.com|youtu\.be)/i.test(urlToValidate);
        return isYouTube ? null : { invalidYouTubeSource: true };
      }

      return null;
    };
  }

  /**
   * Checks if a string is a valid HTTP or HTTPS URL.
   * @param {string} value - URL string to validate
   * @returns {boolean} True if valid http/https URL
   * @private
   */
  private isValidHttpUrl(value: string): boolean {
    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Asynchronous validator to check if a camera stream source (URL) is already registered.
   * Queries the backend to verify that no camera with the same source URL exists.
   * Returns sourceAlreadyExists error if a duplicate is found.
   * Only validates if streamType is CAMERA and source has a value.
   * @returns {AsyncValidatorFn} Async validation function
   * @private
   */
  private sourceNotDuplicatedValidator(): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      const sourceValue = control.value;
      const streamType = control.parent?.get('streamType')?.value;

      if (!sourceValue || !streamType) {
        return of(null);
      }

      return this.cameraService.getAll().pipe(
        first(),
        map((cameras) => {
          const sourceExists = cameras.some(
            (camera) => camera.source?.toLowerCase() === sourceValue.trim().toLowerCase(),
          );
          return sourceExists ? { sourceAlreadyExists: true } : null;
        }),
        catchError(() => of(null)),
      );
    };
  }
}
