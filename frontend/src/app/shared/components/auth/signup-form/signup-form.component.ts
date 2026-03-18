import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { switchMap } from 'rxjs/operators';
import { AuthService } from '../../../../core/services/auth.service';
import { ApiService } from '../../../../core/services/api.service';
import { LabelComponent } from '../../form/label/label.component';
import { InputFieldComponent } from '../../form/input/input-field.component';
import { CheckboxComponent } from '../../form/input/checkbox.component';

@Component({
  selector: 'app-signup-form',
  imports: [RouterModule, CommonModule, FormsModule, LabelComponent, InputFieldComponent, CheckboxComponent],
  templateUrl: './signup-form.component.html',
  styles: ``
})
export class SignupFormComponent {

  fname = '';
  lname = '';
  email = '';
  password = '';
  showPassword = false;
  isChecked = false;
  errorMessage = '';
  loading = false;

  constructor(private auth: AuthService, private api: ApiService, private router: Router) {}

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onSignUp(): void {
    // Client-side validation
    // Submit to backend and show backend errors if any. Keep client-side checks minimal.
    this.loading = true;
    this.errorMessage = '';
    const registerData = {
      username: this.email,
      firstName: this.fname,
      lastName: this.lname,
      email: this.email,
      password: this.password
    };
    this.api.post('/users', registerData).pipe(
      switchMap(() => this.auth.login(this.email, this.password))
    ).subscribe({
      next: () => this.router.navigate(['/dashboard/dashboard']),
      error: (err) => {
        // Try to show backend validation message if present
        try {
          const msg = err?.error?.message || err?.error?.error_description || err?.message;
          this.errorMessage = msg || 'Error al registrarse. Verifica los datos e inténtalo de nuevo.';
        } catch {
          this.errorMessage = 'Error al registrarse. Verifica los datos e inténtalo de nuevo.';
        }
        this.loading = false;
      }
    });
  }
}
