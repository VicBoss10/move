/// <reference types="jasmine" />

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router, ActivatedRoute, provideRouter } from '@angular/router';
import { Component, forwardRef, Input, Output, EventEmitter } from '@angular/core';
import { NG_VALUE_ACCESSOR, ControlValueAccessor, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { of, throwError } from 'rxjs';
import { SignupFormComponent } from './signup-form.component';
import { AuthService } from '../../../../core/services/auth.service';
import { ApiService } from '../../../../core/services/api.service';

@Component({
  selector: 'app-input-field',
  template: `<input [type]="type" [value]="value" (input)="onInput($event)" />`,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputFieldStubComponent),
      multi: true,
    },
  ],
})
class InputFieldStubComponent implements ControlValueAccessor {
  @Input() type = 'text';
  @Input() value: string | number = '';
  @Output() valueChange = new EventEmitter<string | number>();

  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.value = input.value;
    this.valueChange.emit(this.value);
    this.onChange(this.value);
  }

  private onChange: (value: unknown) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: unknown): void {
    if (value !== null && value !== undefined) {
      this.value = value as string | number;
    }
  }

  registerOnChange(fn: (value: unknown) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
}

@Component({ selector: 'app-label', template: '<ng-content />' })
class LabelStubComponent {}

@Component({
  selector: 'app-checkbox',
  template: `<input type="checkbox" [checked]="checked" (change)="onChange($event)" />`,
})
class CheckboxStubComponent {
  @Input() className = '';
  @Input() checked = false;
  @Output() checkedChange = new EventEmitter<boolean>();

  onChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.checked = input.checked;
    this.checkedChange.emit(this.checked);
  }
}

describe('SignupFormComponent', () => {
  let component: SignupFormComponent;
  let fixture: ComponentFixture<SignupFormComponent>;
  let authServiceMock: jasmine.SpyObj<AuthService>;
  let apiServiceMock: jasmine.SpyObj<ApiService>;
  let routerMock: Router;

  beforeEach(async () => {
    authServiceMock = jasmine.createSpyObj('AuthService', ['login']);
    apiServiceMock = jasmine.createSpyObj('ApiService', ['post']);

    await TestBed.configureTestingModule({
      imports: [SignupFormComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
        { provide: ApiService, useValue: apiServiceMock },
        { provide: ActivatedRoute, useValue: { params: {}, queryParams: {} } },
      ],
    })
      .overrideComponent(SignupFormComponent, {
        set: {
          imports: [
            FormsModule,
            RouterModule,
            InputFieldStubComponent,
            LabelStubComponent,
            CheckboxStubComponent,
          ],
        },
      })
      .compileComponents();

    routerMock = TestBed.inject(Router);
    spyOn(routerMock, 'navigate').and.returnValue(Promise.resolve(true));

    fixture = TestBed.createComponent(SignupFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Component Initialization', () => {
    it('should initialize with default property values', () => {
      expect(component.fname).toBe('');
      expect(component.lname).toBe('');
      expect(component.email).toBe('');
      expect(component.password).toBe('');
      expect(component.showPassword).toBe(false);
      expect(component.isChecked).toBe(false);
      expect(component.errorMessage).toBe('');
      expect(component.loading).toBe(false);
    });
  });

  describe('Password Visibility Toggle', () => {
    it('should toggle password visibility', () => {
      expect(component.showPassword).toBe(false);
      component.togglePasswordVisibility();
      expect(component.showPassword).toBe(true);
      component.togglePasswordVisibility();
      expect(component.showPassword).toBe(false);
    });

    it('should handle rapid visibility toggles', () => {
      const toggleCount = 10;
      for (let i = 0; i < toggleCount; i++) {
        component.togglePasswordVisibility();
      }
      expect(component.showPassword).toBe(toggleCount % 2 === 1);
    });
  });

  describe('Form Validation - First Name', () => {
    it('should reject empty first name', () => {
      component.fname = '';
      component.lname = 'Doe';
      component.email = 'john@example.com';
      component.password = 'password123';
      component.isChecked = true;

      component.onSignUp();

      expect(component.errorMessage).toBe('El nombre es requerido.');
      expect(apiServiceMock.post).not.toHaveBeenCalled();
    });

    it('should reject first name with only spaces', () => {
      component.fname = '   ';
      component.lname = 'Doe';
      component.email = 'john@example.com';
      component.password = 'password123';
      component.isChecked = true;

      component.onSignUp();

      expect(component.errorMessage).toBe('El nombre es requerido.');
    });

    it('should reject first name exceeding 50 characters', () => {
      component.fname = 'a'.repeat(51);
      component.lname = 'Doe';
      component.email = 'john@example.com';
      component.password = 'password123';
      component.isChecked = true;

      component.onSignUp();

      expect(component.errorMessage).toBe('El nombre no debe exceder 50 caracteres.');
    });

    it('should accept first name with exactly 50 characters', () => {
      component.fname = 'a'.repeat(50);
      component.lname = 'Doe';
      component.email = 'john@example.com';
      component.password = 'password123';
      component.isChecked = true;

      apiServiceMock.post.and.returnValue(of({}));
      authServiceMock.login.and.returnValue(of(void 0));

      component.onSignUp();

      expect(component.errorMessage).toBe('');
      expect(apiServiceMock.post).toHaveBeenCalled();
    });
  });

  describe('Form Validation - Last Name', () => {
    it('should reject empty last name', () => {
      component.fname = 'John';
      component.lname = '';
      component.email = 'john@example.com';
      component.password = 'password123';
      component.isChecked = true;

      component.onSignUp();

      expect(component.errorMessage).toBe('El apellido es requerido.');
    });

    it('should reject last name exceeding 50 characters', () => {
      component.fname = 'John';
      component.lname = 'a'.repeat(51);
      component.email = 'john@example.com';
      component.password = 'password123';
      component.isChecked = true;

      component.onSignUp();

      expect(component.errorMessage).toBe('El apellido no debe exceder 50 caracteres.');
    });
  });

  describe('Form Validation - Email', () => {
    it('should reject empty email', () => {
      component.fname = 'John';
      component.lname = 'Doe';
      component.email = '';
      component.password = 'password123';
      component.isChecked = true;

      component.onSignUp();

      expect(component.errorMessage).toBe('El correo electrónico es requerido.');
    });

    it('should reject invalid email format', () => {
      component.fname = 'John';
      component.lname = 'Doe';
      component.email = 'invalid-email';
      component.password = 'password123';
      component.isChecked = true;

      component.onSignUp();

      expect(component.errorMessage).toBe('Por favor, ingresa un correo electrónico válido.');
    });

    it('should accept valid email format', () => {
      component.fname = 'John';
      component.lname = 'Doe';
      component.email = 'john@example.com';
      component.password = 'password123';
      component.isChecked = true;

      apiServiceMock.post.and.returnValue(of({}));
      authServiceMock.login.and.returnValue(of(void 0));

      component.onSignUp();

      expect(component.errorMessage).toBe('');
      expect(apiServiceMock.post).toHaveBeenCalled();
    });

    it('should accept email with special characters', () => {
      component.fname = 'John';
      component.lname = 'Doe';
      component.email = 'user+test@sub.example.com';
      component.password = 'password123';
      component.isChecked = true;

      apiServiceMock.post.and.returnValue(of({}));
      authServiceMock.login.and.returnValue(of(void 0));

      component.onSignUp();

      expect(component.errorMessage).toBe('');
      expect(apiServiceMock.post).toHaveBeenCalled();
    });
  });

  describe('Form Validation - Password', () => {
    it('should reject empty password', () => {
      component.fname = 'John';
      component.lname = 'Doe';
      component.email = 'john@example.com';
      component.password = '';
      component.isChecked = true;

      component.onSignUp();

      expect(component.errorMessage).toBe('La contraseña es requerida.');
    });

    it('should reject password shorter than 6 characters', () => {
      component.fname = 'John';
      component.lname = 'Doe';
      component.email = 'john@example.com';
      component.password = '12345';
      component.isChecked = true;

      component.onSignUp();

      expect(component.errorMessage).toBe('La contraseña debe tener al menos 6 caracteres.');
    });

    it('should reject password exceeding 100 characters', () => {
      component.fname = 'John';
      component.lname = 'Doe';
      component.email = 'john@example.com';
      component.password = 'a'.repeat(101);
      component.isChecked = true;

      component.onSignUp();

      expect(component.errorMessage).toBe('La contraseña no debe exceder 100 caracteres.');
    });

    it('should accept password with 6 characters', () => {
      component.fname = 'John';
      component.lname = 'Doe';
      component.email = 'john@example.com';
      component.password = '123456';
      component.isChecked = true;

      apiServiceMock.post.and.returnValue(of({}));
      authServiceMock.login.and.returnValue(of(void 0));

      component.onSignUp();

      expect(component.errorMessage).toBe('');
      expect(apiServiceMock.post).toHaveBeenCalled();
    });

    it('should accept password with special characters', () => {
      component.fname = 'John';
      component.lname = 'Doe';
      component.email = 'john@example.com';
      component.password = 'P@ssw0rd!#&';
      component.isChecked = true;

      apiServiceMock.post.and.returnValue(of({}));
      authServiceMock.login.and.returnValue(of(void 0));

      component.onSignUp();

      expect(component.errorMessage).toBe('');
      expect(apiServiceMock.post).toHaveBeenCalled();
    });
  });

  describe('Form Validation - Terms and Conditions', () => {
    it('should reject when terms not accepted', () => {
      component.fname = 'John';
      component.lname = 'Doe';
      component.email = 'john@example.com';
      component.password = 'password123';
      component.isChecked = false;

      component.onSignUp();

      expect(component.errorMessage).toBe('Debes aceptar los Términos y Condiciones.');
      expect(apiServiceMock.post).not.toHaveBeenCalled();
    });

    it('should accept when terms are checked', () => {
      component.fname = 'John';
      component.lname = 'Doe';
      component.email = 'john@example.com';
      component.password = 'password123';
      component.isChecked = true;

      apiServiceMock.post.and.returnValue(of({}));
      authServiceMock.login.and.returnValue(of(void 0));

      component.onSignUp();

      expect(component.errorMessage).toBe('');
      expect(apiServiceMock.post).toHaveBeenCalled();
    });
  });

  describe('Registration Flow - Success', () => {
    it('should call API with correct registration data', () => {
      component.fname = 'John';
      component.lname = 'Doe';
      component.email = 'john@example.com';
      component.password = 'password123';
      component.isChecked = true;

      apiServiceMock.post.and.returnValue(of({}));
      authServiceMock.login.and.returnValue(of(void 0));

      component.onSignUp();

      expect(apiServiceMock.post).toHaveBeenCalledWith('/users', {
        username: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'password123',
      });
    });

    it('should call login with correct credentials after registration', fakeAsync(() => {
      component.fname = 'John';
      component.lname = 'Doe';
      component.email = 'john@example.com';
      component.password = 'password123';
      component.isChecked = true;

      apiServiceMock.post.and.returnValue(of({}));
      authServiceMock.login.and.returnValue(of(void 0));

      component.onSignUp();
      tick();

      expect(authServiceMock.login).toHaveBeenCalledWith('john@example.com', 'password123');
    }));

    it('should navigate to dashboard on successful registration and login', fakeAsync(() => {
      component.fname = 'John';
      component.lname = 'Doe';
      component.email = 'john@example.com';
      component.password = 'password123';
      component.isChecked = true;

      apiServiceMock.post.and.returnValue(of({}));
      authServiceMock.login.and.returnValue(of(void 0));

      component.onSignUp();
      tick();

      expect(routerMock.navigate).toHaveBeenCalledWith(['/dashboard/dashboard']);
    }));

    it('should set loading state during registration', () => {
      component.fname = 'John';
      component.lname = 'Doe';
      component.email = 'john@example.com';
      component.password = 'password123';
      component.isChecked = true;

      apiServiceMock.post.and.returnValue(of({}));
      authServiceMock.login.and.returnValue(of(void 0));

      expect(component.loading).toBe(false);
      component.onSignUp();
      expect(component.loading).toBe(true);
    });

    it('should clear error message before submission', () => {
      component.errorMessage = 'Previous error';
      component.fname = 'John';
      component.lname = 'Doe';
      component.email = 'john@example.com';
      component.password = 'password123';
      component.isChecked = true;

      apiServiceMock.post.and.returnValue(of({}));
      authServiceMock.login.and.returnValue(of(void 0));

      component.onSignUp();

      expect(component.errorMessage).toBe('');
    });
  });

  describe('Registration Flow - Error Handling', () => {
    it('should handle API error with message property', fakeAsync(() => {
      component.fname = 'John';
      component.lname = 'Doe';
      component.email = 'john@example.com';
      component.password = 'password123';
      component.isChecked = true;

      apiServiceMock.post.and.returnValue(
        throwError(() => ({ error: { message: 'Email already exists' } })),
      );

      component.onSignUp();
      tick();

      expect(component.errorMessage).toBe('Email already exists');
      expect(component.loading).toBe(false);
    }));

    it('should handle API error with error_description property', fakeAsync(() => {
      component.fname = 'John';
      component.lname = 'Doe';
      component.email = 'john@example.com';
      component.password = 'password123';
      component.isChecked = true;

      apiServiceMock.post.and.returnValue(
        throwError(() => ({ error: { error_description: 'Invalid user data' } })),
      );

      component.onSignUp();
      tick();

      expect(component.errorMessage).toBe('Invalid user data');
      expect(component.loading).toBe(false);
    }));

    it('should handle API error with generic message property', fakeAsync(() => {
      component.fname = 'John';
      component.lname = 'Doe';
      component.email = 'john@example.com';
      component.password = 'password123';
      component.isChecked = true;

      apiServiceMock.post.and.returnValue(throwError(() => ({ message: 'Network error' })));

      component.onSignUp();
      tick();

      expect(component.errorMessage).toBe('Network error');
      expect(component.loading).toBe(false);
    }));

    it('should show default error message for unknown errors', fakeAsync(() => {
      component.fname = 'John';
      component.lname = 'Doe';
      component.email = 'john@example.com';
      component.password = 'password123';
      component.isChecked = true;

      apiServiceMock.post.and.returnValue(throwError(() => ({})));

      component.onSignUp();
      tick();

      expect(component.errorMessage).toBe(
        'Error al registrarse. Verifica los datos e inténtalo de nuevo.',
      );
      expect(component.loading).toBe(false);
    }));

    it('should not navigate to dashboard on API error', fakeAsync(() => {
      component.fname = 'John';
      component.lname = 'Doe';
      component.email = 'john@example.com';
      component.password = 'password123';
      component.isChecked = true;

      apiServiceMock.post.and.returnValue(throwError(() => new Error('API Error')));

      component.onSignUp();
      tick();

      expect(routerMock.navigate).not.toHaveBeenCalled();
    }));

    it('should not call login if registration fails', fakeAsync(() => {
      component.fname = 'John';
      component.lname = 'Doe';
      component.email = 'john@example.com';
      component.password = 'password123';
      component.isChecked = true;

      apiServiceMock.post.and.returnValue(throwError(() => new Error('Registration failed')));

      component.onSignUp();
      tick();

      expect(authServiceMock.login).not.toHaveBeenCalled();
    }));
  });

  describe('Form State Management', () => {
    it('should maintain form values on validation error', () => {
      component.fname = 'John';
      component.lname = 'Doe';
      component.email = 'john@example.com';
      component.password = 'password123';
      component.isChecked = false;

      component.onSignUp();

      expect(component.fname).toBe('John');
      expect(component.lname).toBe('Doe');
      expect(component.email).toBe('john@example.com');
      expect(component.password).toBe('password123');
    });

    it('should maintain isChecked state', () => {
      component.isChecked = true;
      expect(component.isChecked).toBe(true);

      component.isChecked = false;
      expect(component.isChecked).toBe(false);
    });
  });

  describe('Complete Registration Scenarios', () => {
    it('should complete full registration flow with all valid data', fakeAsync(() => {
      component.fname = 'John';
      component.lname = 'Doe';
      component.email = 'john.doe@example.com';
      component.password = 'SecurePass123!';
      component.isChecked = true;

      apiServiceMock.post.and.returnValue(of({ id: 1 }));
      authServiceMock.login.and.returnValue(of(void 0));

      component.onSignUp();
      tick();

      expect(apiServiceMock.post).toHaveBeenCalledTimes(1);
      expect(authServiceMock.login).toHaveBeenCalledTimes(1);
      expect(routerMock.navigate).toHaveBeenCalledWith(['/dashboard/dashboard']);
      expect(component.loading).toBe(true);
      expect(component.errorMessage).toBe('');
    }));

    it('should validate all fields in priority order', () => {
      component.fname = '';
      component.lname = 'Doe';
      component.email = 'john@example.com';
      component.password = 'password123';
      component.isChecked = true;

      component.onSignUp();
      expect(component.errorMessage).toBe('El nombre es requerido.');

      component.fname = 'John';
      component.lname = '';
      component.onSignUp();
      expect(component.errorMessage).toBe('El apellido es requerido.');

      component.lname = 'Doe';
      component.email = '';
      component.onSignUp();
      expect(component.errorMessage).toBe('El correo electrónico es requerido.');

      component.email = 'invalid';
      component.onSignUp();
      expect(component.errorMessage).toBe('Por favor, ingresa un correo electrónico válido.');

      component.email = 'john@example.com';
      component.password = '';
      component.onSignUp();
      expect(component.errorMessage).toBe('La contraseña es requerida.');

      component.password = 'short';
      component.onSignUp();
      expect(component.errorMessage).toBe('La contraseña debe tener al menos 6 caracteres.');

      component.password = 'password123';
      component.isChecked = false;
      component.onSignUp();
      expect(component.errorMessage).toBe('Debes aceptar los Términos y Condiciones.');
    });
  });
});
