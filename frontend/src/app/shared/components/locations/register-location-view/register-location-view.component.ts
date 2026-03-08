import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { LocationService } from '../../../../core/services/location.service';
import { Location } from '../../../../core/models/location.model';
import { LocationMapPickerComponent, MapCoordinates } from '../location-map-picker/location-map-picker.component';

/**
 * RegisterLocationViewComponent
 *
 * Componente de shared que contiene toda la lógica y UI para registrar
 * nuevas ubicaciones de monitoreo en el sistema.
 *
 * Características:
 * - Formulario reactivo con validación
 * - Mapa interactivo para seleccionar coordenadas GPS
 * - Campos manuales de latitud/longitud
 * - Feedback visual de éxito/error
 * - Redirección automática tras registro exitoso
 *
 * @selector app-register-location-view
 * @standalone true
 */
@Component({
  selector: 'app-register-location-view',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, LocationMapPickerComponent],
  templateUrl: './register-location-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterLocationViewComponent {
  /** Formulario reactivo para el registro de ubicación */
  locationForm: FormGroup;

  /** Estado de carga del envío */
  isLoading$ = new BehaviorSubject<boolean>(false);

  /** Mensaje de éxito tras registro */
  successMessage$ = new BehaviorSubject<string | null>(null);

  /** Mensaje de error de validación o envío */
  errorMessage$ = new BehaviorSubject<string | null>(null);

  constructor(
    private fb: FormBuilder,
    private locationService: LocationService,
    private router: Router
  ) {
    this.locationForm = this.fb.group({
      description: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(255)]],
      latitude: ['', [Validators.required, Validators.pattern(/^-?([0-8]?[0-9]|90)(\.[0-9]{1,8})?$/)]],
      longitude: ['', [Validators.required, Validators.pattern(/^-?(1[0-7][0-9]|[1-9]?[0-9])(\.[0-9]{1,8})?$/)]],
    });
  }

  /**
   * Maneja el envío del formulario
   */
  onSubmit(): void {
    if (!this.locationForm.valid) {
      this.errorMessage$.next('Por favor, completa todos los campos correctamente');
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

    this.locationService.create(locationData).pipe(
      finalize(() => this.isLoading$.next(false))
    ).subscribe({
      next: () => {
        this.successMessage$.next(
          `Ubicación "${formValue.description}" registrada correctamente`
        );
        setTimeout(() => {
          this.router.navigate(['/dashboard/locations/monitoring']);
        }, 2000);
      },
      error: (err) => {
        console.error('Error al registrar ubicación:', err);
        this.errorMessage$.next(
          'Error al registrar la ubicación. Por favor, inténtalo de nuevo.'
        );
      },
    });
  }

  /**
   * Maneja el reseteo del formulario
   */
  onReset(): void {
    this.locationForm.reset();
    this.successMessage$.next(null);
    this.errorMessage$.next(null);
  }

  /**
   * Maneja la selección de coordenadas desde el mapa
   * Actualiza los campos del formulario con las coordenadas seleccionadas
   * @param coords - Coordenadas seleccionadas en el mapa
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
   * Obtiene el estado de validez del formulario
   */
  isFormValid(): boolean {
    return this.locationForm.valid;
  }
}
