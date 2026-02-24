import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, catchError, shareReplay } from 'rxjs/operators';
import { LocationService } from '../../../core/services/location.service';

/**
 * RegisterDeviceComponent
 *
 * Componente para registrar cámaras y sensores en el sistema.
 * Formulario dinámico que se adapta según el tipo de dispositivo seleccionado.
 *
 * Características:
 * - Registro de Cámaras (RTSP, URL, USB, YouTube)
 * - Registro de Sensores
 * - Selección dinámica de ubicación
 * - Validación según tipo de dispositivo
 * - Estados predefinidos: ACTIVE, INACTIVE, FAILING
 *
 * @selector app-register-device
 * @standalone true
 */
@Component({
  selector: 'app-register-device',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './register-device.component.html',
  styleUrl: './register-device.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterDeviceComponent {
  deviceForm: FormGroup;
  isLoading$ = new BehaviorSubject<boolean>(false);
  successMessage$ = new BehaviorSubject<string | null>(null);
  errorMessage$ = new BehaviorSubject<string | null>(null);
  selectedType$ = new BehaviorSubject<string>('');

  locations$: Observable<any[]>;

  deviceTypes = [
    { id: 'CAMERA', label: 'Cámara/Video', icon: '📹' },
    { id: 'SENSOR', label: 'Sensor Ambiental', icon: '📊' },
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
    private router: Router
  ) {
    // Formulario base que se adapta dinámicamente
    this.deviceForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      type: ['', Validators.required],
      locationId: ['', Validators.required],
      state: ['ACTIVE', Validators.required],
      // Campos específicos para cámaras
      streamType: [''],
      source: [''],
    });

    // Cargar ubicaciones dinámicamente
    this.locations$ = this.locationService.getAll().pipe(
      map((locations) => locations),
      catchError((error) => {
        console.error('Error loading locations:', error);
        return of([] as any[]);
      }),
      shareReplay(1)
    );

    // Suscribirse a cambios en el tipo de dispositivo
    this.deviceForm.get('type')?.valueChanges.subscribe((type) => {
      this.selectedType$.next(type);
      this.updateValidators(type);
    });
  }

  private updateValidators(type: string): void {
    const streamTypeControl = this.deviceForm.get('streamType');
    const sourceControl = this.deviceForm.get('source');

    if (type === 'CAMERA') {
      streamTypeControl?.setValidators([Validators.required]);
      sourceControl?.setValidators([Validators.required, Validators.minLength(5), Validators.maxLength(500)]);
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

    // Simulamos registro exitoso
    setTimeout(() => {
      this.isLoading$.next(false);
      const type = this.deviceForm.get('type')?.value;
      const typeName = type === 'CAMERA' ? 'Cámara' : 'Sensor';
      this.successMessage$.next(`${typeName} registrado(a) exitosamente`);
      
      setTimeout(() => {
        this.router.navigate(['/dashboard/devices/device-status']);
      }, 1500);
    }, 1000);
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
}
