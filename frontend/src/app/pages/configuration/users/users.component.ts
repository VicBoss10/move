import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UsersTableComponent } from '../../../shared/components/configuration/users-table/users-table.component';

/**
 * UsersComponent (Page/Container)
 *
 * Componente de página para la gestión de usuarios.
 *
 * @selector app-users
 * @standalone true
 */
@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, UsersTableComponent],
  templateUrl: './users.component.html',
})
export class UsersComponent {}
