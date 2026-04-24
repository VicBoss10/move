import { Component } from '@angular/core';

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
  imports: [UsersTableComponent],
  templateUrl: './users.component.html',
})
export class UsersComponent {}
