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
} from '@angular/forms';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of, Subject } from 'rxjs';
import { map, catchError, shareReplay, takeUntil } from 'rxjs/operators';
import { LocationService } from '../../../../core/services/location.service';
import { DeviceService } from '../../../../core/services/device.service';
import { ApiService } from '../../../../core/services/api.service';
import {
  DeviceState,
  DeviceType,
} from '../../../../core/models/device.model';
import { Location as AppLocation } from '../../../../core/models/location.model';
import { ToastService } from '../../../../core/services/toast.service';

/**
 * RegisterDeviceFormComponent (Shared/Smart Component)
 *
 * Componente para registrar cámaras en el sistema.
 * Los sensores se registran directamente desde el dispositivo vía portal cautivo.
 * Este componente proporciona información instructiva sobre cómo conectar/provisionar sensores.
 *
 * @selector app-register-device-form
 * @standalone true\n */
@Component({
  selector: 'app-register-device-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './register-device-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterDeviceFormComponent implements OnDestroy {
  private destroy$ = new Subject<void>();

  deviceForm: FormGroup;
  isLoading$ = new BehaviorSubject<boolean>(false);
  successMessage$ = new BehaviorSubject<string | null>(null);
  errorMessage$ = new BehaviorSubject<string | null>(null);
  selectedType$ = new BehaviorSubject<string>('');
  // Captive portal LED simulation
  captiveLedSrc = '/images/device-conection/LEDR.png';
  private _captiveLedToggle = false;
  private captiveLedInterval: ReturnType<typeof setInterval> | null = null;

  locations$: Observable<AppLocation[]>;

  deviceTypes = [
    { id: 'CAMERA', label: 'Cámara/Video' },
    { id: 'SENSOR', label: 'Sensor Ambiental' },
  ];

  streamTypes = [
    { id: 'RTSP', label: 'RTSP Stream', description: 'Protocolo de streaming en tiempo real' },
    { id: 'URL', label: 'HTTP/HTTPS URL', description: 'Imagen o video vía HTTP' },
    { id: 'USB', label: 'Dispositivo USB', description: 'Cámara USB conectada' },
    { id: 'YOUTUBE', label: 'YouTube', description: 'Stream de YouTube' },
  ];

  states = [
    { id: 'ACTIVE', label: 'Activo', color: 'green' },
    { id: 'INACTIVE', label: 'Inactivo', color: 'gray' },
    { id: 'FAILING', label: 'Fallando', color: 'red' },
  ];

  constructor(
    private fb: FormBuilder,
    private locationService: LocationService,
    private deviceService: DeviceService,
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
      state: ['ACTIVE', Validators.required],
      streamType: [''],
      source: ['', [this.sourceByStreamTypeValidator()]],
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

  private startCaptiveLedBlink(): void {
    // Use two images to simulate blinking: LEDR.png and LEDRA2.png
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

  private stopCaptiveLedBlink(): void {
    if (this.captiveLedInterval) {
      clearInterval(this.captiveLedInterval);
      this.captiveLedInterval = null;
    }
    // ensure default image
    this.captiveLedSrc = '/images/device-conection/Conectar.png';
    this.cdr.markForCheck();
  }

  ngOnDestroy(): void {
    this.stopCaptiveLedBlink();
    this.destroy$.next();
    this.destroy$.complete();
  }

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

  onSubmit(): void {
    if (!this.deviceForm.valid) {
      this.errorMessage$.next('Por favor, completa todos los campos requeridos correctamente.');
      return;
    }

    this.isLoading$.next(true);
    this.errorMessage$.next(null);
    this.successMessage$.next(null);

    const formValue = this.deviceForm.value;
    const baseData = {
      name: String(formValue.name).trim(),
      type: formValue.type as DeviceType,
      state: (formValue.state as DeviceState) || DeviceState.ACTIVE,
      locationId: Number(formValue.locationId),
    };

    // If device is a SENSOR, registration is performed by the device itself
    // (portal cautivo / provisioning). Do not call the backend register API
    // from the UI for sensors — show an informational toast and navigate back.
    if (baseData.type === DeviceType.SENSOR) {
      this.isLoading$.next(false);
      this.toastService.success(
        'El registro de sensores se realiza desde el propio dispositivo (portal cautivo).',
        'Registro de Sensor',
      );
      setTimeout(() => {
        this.router.navigate(['/dashboard/devices/device-status']);
      }, 900);
      return;
    }

    // Otherwise (CAMERA), proceed with registration as before
    const payload = {
      ...baseData,
      type: DeviceType.CAMERA,
      streamType: formValue.streamType,
      source: String(formValue.source).trim(),
    };

    this.deviceService
      .register(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (_response) => {
          this.isLoading$.next(false);
          const typeName = 'Cámara';
          const guidance = 'Para iniciar la detección dirígete a Cámara → Streaming.';
          this.successMessage$.next(`${typeName} registrado(a) exitosamente. ${guidance}`);
          this.toastService.success(`${typeName} registrado(a) exitosamente. ${guidance}`, 'Éxito');

          setTimeout(() => {
            this.router.navigate(['/dashboard/devices/device-status']);
          }, 1400);
        },
        error: (error: unknown) => {
          this.isLoading$.next(false);
          const errorMsg = (error as { message?: string })?.message || 'Error al registrar el dispositivo';
          this.errorMessage$.next(errorMsg);
          this.toastService.error(errorMsg, 'Error');
          console.error('Error registering device:', error);
        },
      });
  }

  resetForm(): void {
    this.deviceForm.reset({ state: 'ACTIVE' });
    this.selectedType$.next('');
    this.errorMessage$.next(null);
    this.successMessage$.next(null);
  }

  canSubmit(): boolean {
    return this.deviceForm.valid && !this.isLoading$.value;
  }

  getStreamTypeDescription(streamTypeId: string): string {
    return this.streamTypes.find((st) => st.id === streamTypeId)?.description || '';
  }

  /**
   * Evita valores vacíos con espacios y normaliza campos de texto.
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
   * Valida que locationId sea un entero positivo.
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
   * Valida el campo source según el streamType elegido.
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
        const isYouTube = this.isValidHttpUrl(source) && /(youtube\.com|youtu\.be)/i.test(source);
        return isYouTube ? null : { invalidYouTubeSource: true };
      }

      if (streamType === 'USB') {
        const isUsbIndex = /^\d+$/.test(source);
        const isLinuxDevice = /^\/dev\/video\d+$/i.test(source);
        return isUsbIndex || isLinuxDevice ? null : { invalidUsbSource: true };
      }

      return null;
    };
  }

  private isValidHttpUrl(value: string): boolean {
    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }
}
