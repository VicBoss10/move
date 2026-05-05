import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { LabelComponent } from '../../form/label/label.component';
import { InputFieldComponent } from '../../form/input/input-field.component';
import { ButtonComponent } from '../../ui/button/button.component';

/**
 * SigninFormComponent (Presentational Component)
 *
 * User authentication form with email and password inputs.
 * Handles login submission and displays validation errors.
 *
 * Features:
 * - Email and password input fields
 * - Password visibility toggle
 * - Loading state during authentication
 * - Error message display
 * - Navigation to dashboard on successful login
 * - Links to password reset and signup forms
 *
 * @selector app-signin-form
 * @standalone true
 * @imports RouterModule, FormsModule, LabelComponent, InputFieldComponent, ButtonComponent
 *
 * @example
 * <app-signin-form />
 */
@Component({
  selector: 'app-signin-form',
  imports: [RouterModule, FormsModule, LabelComponent, InputFieldComponent, ButtonComponent],
  templateUrl: './signin-form.component.html',
  styles: ``,
})
export class SigninFormComponent {
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
   * Checkbox agreement state (currently unused in template).
   * @type {boolean}
   */
  isChecked = false;

  /**
   * Error message displayed to user on authentication failure.
   * @type {string}
   */
  errorMessage = '';

  /**
   * Loading state during authentication request.
   * @type {boolean}
   */
  loading = false;

  /**
   * Initializes the component with service dependencies.
   * @param {AuthService} auth - Authentication service
   * @param {Router} router - Angular router for navigation
   */
  constructor(
    private auth: AuthService,
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
   * Submits login credentials to authentication service.
   * Sets loading state and displays errors on failure.
   * Navigates to dashboard on successful authentication.
   * @returns {void}
   */
  onSignIn(): void {
    if (!this.email || !this.password) return;

    const validationError = this.validateSignIn();
    if (validationError) {
      this.errorMessage = validationError;
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.auth.login(this.email, this.password).subscribe({
      next: () => this.router.navigate(['/dashboard/dashboard']),
      error: () => {
        this.errorMessage = 'Correo o contraseña incorrectos.';
        this.loading = false;
      },
    });
  }

  private validateSignIn(): string {
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

    return '';
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
