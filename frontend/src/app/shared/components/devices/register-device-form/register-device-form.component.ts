import { Component, ChangeDetectionStrategy, OnDestroy } from '@angular/core';
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
import { DeviceState, DeviceType, RegisterDeviceRequest } from '../../../../core/models/device.model';

/**
 * RegisterDeviceFormComponent (Shared/Smart Component)
 *
 * Componente para registrar cámaras y sensores en el sistema.
 * Maneja toda la lógica del formulario dinámico.
 *
 * @selector app-register-device-form
 * @standalone true
 */
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

  locations$: Observable<any[]>;

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
    private router: Router
  ) {
    this.deviceForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100), this.trimmedTextValidator()]],
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
        return of([] as any[]);
      }),
      shareReplay(1)
    );

    this.deviceForm.get('type')?.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe((type) => {
      this.selectedType$.next(type);
      this.updateValidators(type);
    });
  }

  ngOnDestroy(): void {
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

    let deviceData: RegisterDeviceRequest;

    if (baseData.type === DeviceType.CAMERA) {
      deviceData = {
        ...baseData,
        type: DeviceType.CAMERA,
        streamType: formValue.streamType,
        source: String(formValue.source).trim(),
      };
    } else {
      deviceData = {
        ...baseData,
        type: baseData.type as Exclude<DeviceType, DeviceType.CAMERA>,
      };
    }

    this.deviceService.register(deviceData).subscribe({
      next: (response: string) => {
        this.isLoading$.next(false);
        const typeName = formValue.type === 'CAMERA' ? 'Cámara' : 'Sensor';
        this.successMessage$.next(`${typeName} registrado(a) exitosamente`);
        
        setTimeout(() => {
          this.router.navigate(['/dashboard/devices/device-status']);
        }, 1500);
      },
      error: (error: any) => {
        this.isLoading$.next(false);
        const errorMsg = error?.message || 'Error al registrar el dispositivo';
        this.errorMessage$.next(errorMsg);
        console.error('Error registering device:', error);
      }
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
