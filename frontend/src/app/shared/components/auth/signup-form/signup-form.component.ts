import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

import { FormsModule } from '@angular/forms';
import { switchMap } from 'rxjs/operators';
import { AuthService } from '../../../../core/services/auth.service';
import { ApiService } from '../../../../core/services/api.service';
import { LabelComponent } from '../../form/label/label.component';
import { InputFieldComponent } from '../../form/input/input-field.component';
import { CheckboxComponent } from '../../form/input/checkbox.component';

/**
 * SignupFormComponent (Presentational Component)
 *
 * User registration form with email, password, and name inputs.
 * Handles account creation and automatic login on successful registration.
 *
 * Features:
 * - First and last name input fields
 * - Email and password inputs
 * - Password visibility toggle
 * - Terms and conditions checkbox
 * - Loading state during registration
 * - Backend error message display
 * - Automatic login after successful registration
 * - Navigation to dashboard on success
 * - Links to signin form
 *
 * @selector app-signup-form
 * @standalone true
 * @imports RouterModule, FormsModule, LabelComponent, InputFieldComponent, CheckboxComponent
 *
 * @example
 * <app-signup-form />
 */
@Component({
  selector: 'app-signup-form',
  imports: [RouterModule, FormsModule, LabelComponent, InputFieldComponent, CheckboxComponent],
  templateUrl: './signup-form.component.html',
  styles: ``,
})
export class SignupFormComponent {
  /**
   * User's first name input.
   * @type {string}
   */
  fname = '';

  /**
   * User's last name input.
   * @type {string}
   */
  lname = '';

  /**
   * User's email address input.
   * @type {string}
   */
  email = '';

  /**
   * User's password input.
   * @type {string}
   */
  password = '';

  /**
   * Password visibility toggle state.
   * @type {boolean}
   */
  showPassword = false;

  /**
   * Terms and conditions checkbox agreement state.
   * @type {boolean}
   */
  isChecked = false;

  /**
   * Error message displayed to user on registration failure.
   * @type {string}
   */
  errorMessage = '';

  /**
   * Loading state during registration request.
   * @type {boolean}
   */
  loading = false;

  /**
   * Initializes the component with service dependencies.
   * @param {AuthService} auth - Authentication service for login
   * @param {ApiService} api - API service for user registration
   * @param {Router} router - Angular router for navigation
   */
  constructor(
    private auth: AuthService,
    private api: ApiService,
    private router: Router,
  ) {}

  /**
   * Toggles password input visibility between text and password type.
   * @returns {void}
   */
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  /**
   * Submits registration data to API, then automatically logs in the new user.
   * Displays backend validation errors if registration fails.
   * Navigates to dashboard on successful registration and login.
   * @returns {void}
   */
  onSignUp(): void {
    const validationError = this.validateSignUp();
    if (validationError) {
      this.errorMessage = validationError;
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    const registerData = {
      username: this.email,
      firstName: this.fname,
      lastName: this.lname,
      email: this.email,
      password: this.password,
    };
    this.api
      .post('/users', registerData)
      .pipe(switchMap(() => this.auth.login(this.email, this.password)))
      .subscribe({
        next: () => this.router.navigate(['/dashboard/dashboard']),
        error: (err) => {
          try {
            const msg = err?.error?.message || err?.error?.error_description || err?.message;
            this.errorMessage =
              msg || 'Error al registrarse. Verifica los datos e inténtalo de nuevo.';
          } catch {
            this.errorMessage = 'Error al registrarse. Verifica los datos e inténtalo de nuevo.';
          }
          this.loading = false;
        },
      });
  }

  private validateSignUp(): string {
    if (!this.fname.trim()) {
      return 'El nombre es requerido.';
    }

    if (this.fname.length > 50) {
      return 'El nombre no debe exceder 50 caracteres.';
    }

    if (!this.lname.trim()) {
      return 'El apellido es requerido.';
    }

    if (this.lname.length > 50) {
      return 'El apellido no debe exceder 50 caracteres.';
    }

    if (!this.email.trim()) {
      return 'El correo electrónico es requerido.';
    }

    if (!this.isValidEmail(this.email)) {
      return 'Por favor, ingresa un correo electrónico válido.';
    }

    if (!this.password.trim()) {
      return 'La contraseña es requerida.';
    }

    if (this.password.length < 6) {
      return 'La contraseña debe tener al menos 6 caracteres.';
    }

    if (this.password.length > 100) {
      return 'La contraseña no debe exceder 100 caracteres.';
    }

    if (!this.isChecked) {
      return 'Debes aceptar los Términos y Condiciones.';
    }

    return '';
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
