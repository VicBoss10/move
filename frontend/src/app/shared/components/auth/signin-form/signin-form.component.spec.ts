/// <reference types="jasmine" />

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router, ActivatedRoute, provideRouter } from '@angular/router';
import { Component, forwardRef, Input, Output, EventEmitter } from '@angular/core';
import { NG_VALUE_ACCESSOR, ControlValueAccessor, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { of, throwError } from 'rxjs';
import { SigninFormComponent } from './signin-form.component';
import { AuthService } from '../../../../core/services/auth.service';

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
  selector: 'app-button',
  template: '<button [disabled]="disabled"><ng-content /></button>',
})
class ButtonStubComponent {
  @Input() className = '';
  @Input() size = '';
  @Input() disabled = false;
}

describe('SigninFormComponent', () => {
  let component: SigninFormComponent;
  let fixture: ComponentFixture<SigninFormComponent>;
  let authServiceMock: jasmine.SpyObj<AuthService>;
  let routerMock: Router;

  beforeEach(async () => {
    authServiceMock = jasmine.createSpyObj('AuthService', ['login']);

    await TestBed.configureTestingModule({
      imports: [SigninFormComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
        { provide: ActivatedRoute, useValue: { params: {}, queryParams: {} } },
      ],
    })
      .overrideComponent(SigninFormComponent, {
        set: {
          imports: [
            FormsModule,
            RouterModule,
            InputFieldStubComponent,
            LabelStubComponent,
            ButtonStubComponent,
          ],
        },
      })
      .compileComponents();

    routerMock = TestBed.inject(Router);
    spyOn(routerMock, 'navigate').and.returnValue(Promise.resolve(true));

    fixture = TestBed.createComponent(SigninFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Component Initialization', () => {
    it('should initialize with default property values', () => {
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

  describe('Email Validation', () => {
    it('should reject empty email', () => {
      component.email = '';
      component.password = 'password123';
      component.onSignIn();
      expect(authServiceMock.login).not.toHaveBeenCalled();
    });

    it('should reject invalid email format', () => {
      component.email = 'invalid-email';
      component.password = 'password123';
      component.onSignIn();
      expect(component.errorMessage).toBe('Por favor, ingresa un correo electrónico válido.');
      expect(authServiceMock.login).not.toHaveBeenCalled();
    });

    it('should accept valid email format', () => {
      component.email = 'user@example.com';
      component.password = 'password123';
      authServiceMock.login.and.returnValue(of(void 0));
      component.onSignIn();
      expect(component.errorMessage).toBe('');
      expect(authServiceMock.login).toHaveBeenCalled();
    });

    it('should accept email with special characters', () => {
      component.email = 'user+test@sub.example.com';
      component.password = 'password123';
      authServiceMock.login.and.returnValue(of(void 0));
      component.onSignIn();
      expect(authServiceMock.login).toHaveBeenCalledWith(
        'user+test@sub.example.com',
        'password123',
      );
    });
  });

  describe('Password Validation', () => {
    it('should reject empty password', () => {
      component.email = 'user@example.com';
      component.password = '';
      component.onSignIn();
      expect(authServiceMock.login).not.toHaveBeenCalled();
    });

    it('should reject password shorter than 6 characters', () => {
      component.email = 'user@example.com';
      component.password = '12345';
      component.onSignIn();
      expect(component.errorMessage).toBe('La contraseña debe tener al menos 6 caracteres.');
      expect(authServiceMock.login).not.toHaveBeenCalled();
    });

    it('should accept password with 6 characters', () => {
      component.email = 'user@example.com';
      component.password = '123456';
      authServiceMock.login.and.returnValue(of(void 0));
      component.onSignIn();
      expect(authServiceMock.login).toHaveBeenCalled();
    });

    it('should accept password with special characters', () => {
      component.email = 'user@example.com';
      component.password = 'P@ssw0rd!#&';
      authServiceMock.login.and.returnValue(of(void 0));
      component.onSignIn();
      expect(authServiceMock.login).toHaveBeenCalledWith('user@example.com', 'P@ssw0rd!#&');
    });
  });

  describe('Login Success', () => {
    it('should call AuthService.login with email and password', () => {
      component.email = 'user@example.com';
      component.password = 'password123';
      authServiceMock.login.and.returnValue(of(void 0));

      component.onSignIn();

      expect(authServiceMock.login).toHaveBeenCalledWith('user@example.com', 'password123');
    });

    it('should set loading to true during login', () => {
      component.email = 'user@example.com';
      component.password = 'password123';
      authServiceMock.login.and.returnValue(of(void 0));

      expect(component.loading).toBe(false);
      component.onSignIn();
      expect(component.loading).toBe(true);
    });

    it('should clear error message before login attempt', () => {
      component.errorMessage = 'Previous error';
      component.email = 'user@example.com';
      component.password = 'password123';
      authServiceMock.login.and.returnValue(of(void 0));

      component.onSignIn();

      expect(component.errorMessage).toBe('');
    });

    it('should navigate to dashboard on successful login', fakeAsync(() => {
      component.email = 'user@example.com';
      component.password = 'password123';
      authServiceMock.login.and.returnValue(of(void 0));

      component.onSignIn();
      tick();

      expect(routerMock.navigate).toHaveBeenCalledWith(['/dashboard/dashboard']);
    }));
  });

  describe('Login Failure', () => {
    it('should set error message on login failure', fakeAsync(() => {
      component.email = 'user@example.com';
      component.password = 'wrongpassword';
      authServiceMock.login.and.returnValue(throwError(() => new Error('Authentication failed')));

      component.onSignIn();
      tick();

      expect(component.errorMessage).toBe('Correo o contraseña incorrectos.');
    }));

    it('should set loading to false on login failure', fakeAsync(() => {
      component.email = 'user@example.com';
      component.password = 'wrongpassword';
      authServiceMock.login.and.returnValue(throwError(() => new Error('Authentication failed')));

      component.onSignIn();
      tick();

      expect(component.loading).toBe(false);
    }));

    it('should not navigate to dashboard on login failure', fakeAsync(() => {
      component.email = 'user@example.com';
      component.password = 'wrongpassword';
      authServiceMock.login.and.returnValue(throwError(() => new Error('Authentication failed')));

      component.onSignIn();
      tick();

      expect(routerMock.navigate).not.toHaveBeenCalled();
    }));
  });

  describe('Form State Management', () => {
    it('should maintain email value on error', () => {
      component.email = 'user@example.com';
      component.password = '12345';

      component.onSignIn();

      expect(component.email).toBe('user@example.com');
      expect(component.password).toBe('12345');
    });

    it('should maintain isChecked property state', () => {
      component.isChecked = true;
      expect(component.isChecked).toBe(true);

      component.isChecked = false;
      expect(component.isChecked).toBe(false);
    });
  });

  describe('Consecutive Login Attempts', () => {
    it('should handle consecutive login attempts with recovery', fakeAsync(() => {
      authServiceMock.login.and.returnValue(throwError(() => new Error('Authentication failed')));
      component.email = 'user@example.com';
      component.password = 'wrong1';

      component.onSignIn();
      tick();

      expect(component.loading).toBe(false);
      expect(component.errorMessage).toBe('Correo o contraseña incorrectos.');

      authServiceMock.login.and.returnValue(of(void 0));
      component.password = 'correct';
      component.onSignIn();
      tick();

      expect(routerMock.navigate).toHaveBeenCalledWith(['/dashboard/dashboard']);
    }));

    it('should prevent login when fields are empty', () => {
      component.email = '';
      component.password = '';

      component.onSignIn();

      expect(authServiceMock.login).not.toHaveBeenCalled();
      expect(component.errorMessage).toBe('');
    });
  });

  describe('Validation Priority', () => {
    it('should validate email before password', () => {
      component.email = 'invalid';
      component.password = '12345';

      component.onSignIn();

      expect(component.errorMessage).toBe('Por favor, ingresa un correo electrónico válido.');
    });

    it('should validate password after email', () => {
      component.email = 'user@example.com';
      component.password = '12345';

      component.onSignIn();

      expect(component.errorMessage).toBe('La contraseña debe tener al menos 6 caracteres.');
    });
  });
});
