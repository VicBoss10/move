import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { ApiService } from '../../../../core/services/api.service';
import { LabelComponent } from '../../form/label/label.component';
import { InputFieldComponent } from '../../form/input/input-field.component';
import { ButtonComponent } from '../../ui/button/button.component';

/**
 * SigninFormComponent (Presentational Component)
 *
 * User authentication form with email and password inputs.
 * Handles login submission and displays validation errors.
 * When Keycloak rejects login with "Account is not fully set up" (temporary
 * password assigned by an admin), shows an inline modal to collect and submit
 * the new password without leaving the page.
 *
 * Features:
 * - Email and password input fields
 * - Password visibility toggle
 * - Loading state during authentication
 * - Error message display
 * - Navigation to dashboard on successful login
 * - Links to password reset and signup forms
 * - Inline modal for updating temporary passwords
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
   * Controls visibility of the forgot-password information modal.
   * @type {boolean}
   */
  showForgotPasswordModal = false;

  /**
   * Controls visibility of the temporary-password update modal.
   * Set to true when Keycloak returns "Account is not fully set up".
   * @type {boolean}
   */
  showPasswordModal = false;

  /**
   * New password input inside the temporary-password modal.
   * @type {string}
   */
  newPassword = '';

  /**
   * Confirm new password input inside the temporary-password modal.
   * @type {string}
   */
  confirmNewPassword = '';

  /**
   * New password visibility toggle state inside the modal.
   * @type {boolean}
   */
  showNewPassword = false;

  /**
   * Error message displayed inside the temporary-password modal.
   * @type {string}
   */
  modalError = '';

  /**
   * Loading state during the password reset request inside the modal.
   * @type {boolean}
   */
  modalLoading = false;

  /**
   * Initializes the component with service dependencies.
   * @param {AuthService} auth - Authentication service
   * @param {ApiService} api - Backend API service for password reset calls
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
   * Submits login credentials to authentication service.
   * Sets loading state and displays errors on failure.
   * If Keycloak responds with "Account is not fully set up", opens the
   * temporary-password modal instead of showing a generic error.
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
      error: (err: { error?: { error_description?: string } }) => {
        if (err?.error?.error_description === 'Account is not fully set up') {
          this.loading = false;
          this.showPasswordModal = true;
          return;
        }
        this.errorMessage = 'Correo o contraseña incorrectos.';
        this.loading = false;
      },
    });
  }

  /**
   * Handles submission of the temporary-password update modal.
   * Validates the new password fields, calls the backend reset endpoint,
   * then automatically logs the user in with the new password.
   * @returns {void}
   */
  onResetPassword(): void {
    if (!this.newPassword || !this.confirmNewPassword) {
      this.modalError = 'Completa todos los campos.';
      return;
    }
    if (this.newPassword.length < 8) {
      this.modalError = 'La contraseña debe tener al menos 8 caracteres.';
      return;
    }
    if (this.newPassword !== this.confirmNewPassword) {
      this.modalError = 'Las contraseñas no coinciden.';
      return;
    }

    this.modalLoading = true;
    this.modalError = '';

    this.api
      .post<{ message: string }>('/users/reset-temporary-password', {
        email: this.email,
        currentPassword: this.password,
        newPassword: this.newPassword,
      })
      .subscribe({
        next: () => {
          this.auth.login(this.email, this.newPassword).subscribe({
            next: () => this.router.navigate(['/dashboard/dashboard']),
            error: () => {
              this.modalLoading = false;
              this.modalError = 'Contraseña actualizada. Por favor inicia sesión nuevamente.';
            },
          });
        },
        error: () => {
          this.modalLoading = false;
          this.modalError =
            'No se pudo actualizar la contraseña. Verifica que tu contraseña actual sea correcta.';
        },
      });
  }

  /**
   * Closes the forgot-password information modal.
   * @returns {void}
   */
  onCloseForgotPasswordModal(): void {
    this.showForgotPasswordModal = false;
  }

  /**
   * Closes the temporary-password update modal and resets all its state.
   * @returns {void}
   */
  onCancelModal(): void {
    this.showPasswordModal = false;
    this.newPassword = '';
    this.confirmNewPassword = '';
    this.showNewPassword = false;
    this.modalError = '';
    this.modalLoading = false;
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

  onGoogleSignIn(): void {
    this.auth.loginWithGoogle();
  }
}
