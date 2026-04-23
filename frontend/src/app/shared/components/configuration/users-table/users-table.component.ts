import { Component, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserService } from '../../../../core/services/user.service';
import { ApiService } from '../../../../core/services/api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ModalComponent } from '../../ui/modal/modal.component';

interface KeycloakUser {
  id: number | string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  realmRoles?: string[];
}

/**
 * UsersTableComponent
 *
 * Componente de administración de usuarios usado en la sección
 * de configuración. Muestra una tabla con usuarios, permite
 * editar email/nombre/apellido y cambiar rol (user/admin),
 * y eliminar usuarios. Se apoya en `UserService` y `ApiService`.
 *
 * @selector app-users-table
 * @standalone true
 */
@Component({
  selector: 'app-users-table',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ModalComponent],
  templateUrl: './users-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersTableComponent {
  users: KeycloakUser[] = [];

  // Edit state
  editingUser: KeycloakUser | null = null;
  editForm: FormGroup;
  editSaving = false;

  // Delete state
  deleteTarget: KeycloakUser | null = null;
  deleteSaving = false;

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private apiService: ApiService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef,
  ) {
    this.editForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      firstName: ['', Validators.minLength(1)],
      lastName: ['', Validators.minLength(1)],
      role: ['user', Validators.required],
    });

    this.loadUsers();
  }

  /**
   * Carga la lista de usuarios desde `UserService` y actualiza la vista.
   * Realiza un subscribe simple y marca para check cuando llegan los datos.
   */
  loadUsers(): void {
    this.userService.getAll().subscribe((list: KeycloakUser[]) => {
      this.users = list || [];
      this.cdr.markForCheck();
    });
  }

  openEdit(user: KeycloakUser): void {
    this.editingUser = user;
    const currentRole = (user.realmRoles || []).includes('admin') ? 'admin' : 'user';
    this.editForm.patchValue({
      email: user.email || '',
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      role: currentRole,
    });
    this.editSaving = false;
  }

  closeEdit(): void {
    this.editingUser = null;
    this.editForm.reset();
  }

  saveEdit(): void {
    if (!this.editingUser || this.editForm.invalid) return;
    this.editSaving = true;
    const body = {
      email: this.editForm.value.email,
      firstName: this.editForm.value.firstName,
      lastName: this.editForm.value.lastName,
      role: this.editForm.value.role,
    };

    const id = this.editingUser.id || this.editingUser.id;
    this.apiService.put(`/users/${id}`, body).subscribe({
      next: () => {
        this.editSaving = false;
        this.closeEdit();
        this.toastService.success('Usuario actualizado', 'Éxito');
        this.userService.refresh().subscribe(() => this.loadUsers());
        this.cdr.markForCheck();
      },
      error: () => {
        this.editSaving = false;
        this.toastService.error('Error al actualizar usuario', 'Error');
        this.cdr.markForCheck();
      },
    });
  }

  openDelete(user: KeycloakUser): void {
    this.deleteTarget = user;
    this.deleteSaving = false;
  }

  closeDelete(): void {
    this.deleteTarget = null;
    this.deleteSaving = false;
  }

  confirmDelete(): void {
    if (!this.deleteTarget) return;
    this.deleteSaving = true;
    const id = this.deleteTarget.id;
    this.apiService.delete(`/users/${id}`).subscribe({
      next: () => {
        this.deleteSaving = false;
        this.closeDelete();
        this.toastService.success(`Usuario eliminado`, 'Éxito');
        this.userService.refresh().subscribe(() => this.loadUsers());
        this.cdr.markForCheck();
      },
      error: () => {
        this.deleteSaving = false;
        this.toastService.error('No se pudo eliminar el usuario', 'Error');
        this.cdr.markForCheck();
      },
    });
  }
}
