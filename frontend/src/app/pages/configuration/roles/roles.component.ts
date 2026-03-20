import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RolesTableComponent } from '../../../shared/components/configuration/roles-table/roles-table.component';

/**
 * RolesComponent (Page/Container)
 *
 * Componente de página para la gestión de roles y permisos.
 *
 * @selector app-roles
 * @standalone true
 */
@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [CommonModule, RolesTableComponent],
  templateUrl: './roles.component.html',
})
export class RolesComponent {}
