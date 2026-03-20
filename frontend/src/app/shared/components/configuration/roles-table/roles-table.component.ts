import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * RolesTableComponent (Shared/Smart Component)
 *
 * Muestra y gestiona los roles y permisos del sistema.
 *
 * @selector app-roles-table
 * @standalone true
 */
@Component({
  selector: 'app-roles-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './roles-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RolesTableComponent {}
