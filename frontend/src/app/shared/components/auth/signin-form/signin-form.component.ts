import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { LabelComponent } from '../../form/label/label.component';
import { InputFieldComponent } from '../../form/input/input-field.component';
import { CheckboxComponent } from '../../form/input/checkbox.component';
import { ButtonComponent } from '../../ui/button/button.component';

@Component({
  selector: 'app-signin-form',
  imports: [
    RouterModule,
    CommonModule,
    FormsModule,
    LabelComponent,
    InputFieldComponent,
    ButtonComponent,
  ],
  templateUrl: './signin-form.component.html',
  styles: ``,
})
export class SigninFormComponent {
  email = '';
  password = '';
  showPassword = false;
  isChecked = false;
  errorMessage = '';
  loading = false;

  constructor(
    private auth: AuthService,
    private router: Router,
  ) {}

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onSignIn(): void {
    if (!this.email || !this.password) return;
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
}
