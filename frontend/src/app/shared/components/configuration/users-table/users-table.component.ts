import { Component, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';

import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserService } from '../../../../core/services/user.service';
import { ApiService } from '../../../../core/services/api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ModalComponent } from '../../ui/modal/modal.component';

/**
 * Keycloak user data model.
 * @interface KeycloakUser
 * @property {number | string} id - User ID from Keycloak
 * @property {string} username - Login username
 * @property {string} email - User email address
 * @property {string} [firstName] - First name (optional)
 * @property {string} [lastName] - Last name (optional)
 * @property {string[]} [realmRoles] - Array of realm role names (optional)
 */
interface KeycloakUser {
  id: number | string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  realmRoles?: string[];
}

/**
 * UsersTableComponent (Smart Component)
 *
 * Manages user administration with list display, inline editing, and deletion workflows.
 * Displays Keycloak user data in a table with email/name/role editing and delete confirmation.
 *
 * Features:
 * - Paginated user list from UserService with refresh capability
 * - Inline edit modal for user email, first name, last name, and role assignment
 * - Delete confirmation modal before user removal
 * - Reactive form validation (email format, min length)
 * - Role dropdown for user/admin selection
 * - Loading state indicators on buttons and modals
 * - Dark mode support
 * - OnPush change detection with manual ChangeDetectorRef triggers
 *
 * @selector app-users-table
 * @standalone true
 * @imports ReactiveFormsModule, ModalComponent
 * @example
 * <app-users-table />
 */
@Component({
  selector: 'app-users-table',
  standalone: true,
  imports: [ReactiveFormsModule, ModalComponent],
  templateUrl: './users-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersTableComponent {
  /**
   * List of Keycloak users loaded from backend.
   * @type {KeycloakUser[]}
   */
  users: KeycloakUser[] = [];

  /**
   * Currently editing user or null if modal is closed.
   * @type {KeycloakUser | null}
   */
  editingUser: KeycloakUser | null = null;

  /**
   * Reactive form for user edit modal (email, firstName, lastName, role).
   * @type {FormGroup}
   */
  editForm: FormGroup;

  /**
   * Loading state indicator for edit save operation.
   * @type {boolean}
   */
  editSaving = false;

  /**
   * User targeted for deletion or null if modal is closed.
   * @type {KeycloakUser | null}
   */
  deleteTarget: KeycloakUser | null = null;

  /**
   * Loading state indicator for delete operation.
   * @type {boolean}
   */
  deleteSaving = false;

  /**
   * Initializes component with form builder and service dependencies.
   * Creates edit form with validators and loads initial user list.
   * @param {FormBuilder} fb - Angular FormBuilder for reactive form creation
   * @param {UserService} userService - Service managing user list and refresh operations
   * @param {ApiService} apiService - Service for backend HTTP operations (PUT/DELETE users)
   * @param {ToastService} toastService - Service for displaying user notifications
   * @param {ChangeDetectorRef} cdr - Change detection reference for manual triggering in OnPush mode
   */
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
   * Loads user list from UserService and updates view.
   * Subscribes to user list and triggers change detection on completion.
   */
  loadUsers(): void {
    this.userService.getAll().subscribe((list: KeycloakUser[]) => {
      this.users = list || [];
      this.cdr.markForCheck();
    });
  }

  /**
   * Opens edit modal and populates form with selected user data.
   * Detects current role from realmRoles array (admin vs user).
   * @param {KeycloakUser} user - User to edit
   */
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

  /**
   * Closes edit modal and resets form.
   */
  closeEdit(): void {
    this.editingUser = null;
    this.editForm.reset();
  }

  /**
   * Saves edited user data via API call.
   * Updates email, firstName, lastName, and role on backend.
   * Refreshes user list and displays toast notification on success.
   */
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

  /**
   * Opens delete confirmation modal for selected user.
   * @param {KeycloakUser} user - User to delete
   */
  openDelete(user: KeycloakUser): void {
    this.deleteTarget = user;
    this.deleteSaving = false;
  }

  /**
   * Closes delete confirmation modal.
   */
  closeDelete(): void {
    this.deleteTarget = null;
    this.deleteSaving = false;
  }

  /**
   * Confirms and executes user deletion via API call.
   * Refreshes user list and displays toast notification on success.
   */
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
