import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { LocationService } from '../../../core/services/location.service';

/**
 * RegisterLocationComponent
 *
 * Componente para registrar nuevas ubicaciones de monitoreo en el sistema.
 * Permite crear puntos de monitoreo con información geográfica.
 *
 * Características:
 * - Registro de ubicaciones con coordenadas GPS
 * - Validación de entrada
 * - Descripción de cada ubicación
 * - Feedback visual de éxito/error
 *
 * @selector app-register-location
 * @standalone true
 */
@Component({
  selector: 'app-register-location',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './register-location.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterLocationComponent {
  locationForm: FormGroup;
  isLoading$ = new BehaviorSubject<boolean>(false);
  successMessage$ = new BehaviorSubject<string | null>(null);
  errorMessage$ = new BehaviorSubject<string | null>(null);

  constructor(
    private fb: FormBuilder,
    private locationService: LocationService,
    private router: Router
  ) {
    // Crear formulario reactivo
    this.locationForm = this.fb.group({
      description: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(255)]],
      latitude: ['', [Validators.required, Validators.pattern(/^-?([0-8]?[0-9]|90)(\.[0-9]{1,8})?$/)]],
      length: ['', [Validators.required, Validators.pattern(/^-?(1[0-7][0-9]|[1-9]?[0-9])(\.[0-9]{1,8})?$/)]], // length = longitude
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

    // La ubicación se crearía a través del servicio
    // Por ahora solo simulamos la creación
    setTimeout(() => {
      // En producción, esto sería:
      // this.locationService.create(this.locationForm.value).subscribe(...)

      this.isLoading$.next(false);
      this.successMessage$.next(
        `Ubicación "${this.locationForm.get('description')?.value}" registrada correctamente`
      );

      // Redirigir después de 2 segundos
      setTimeout(() => {
        this.router.navigate(['/dashboard/locations/monitoring']);
      }, 2000);
    }, 1500);
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
   * Obtiene el estado de validez del formulario
   */
  isFormValid(): boolean {
    return this.locationForm.valid;
  }
}
