import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * UsersTableComponent (Shared/Smart Component)
 *
 * Muestra y gestiona los usuarios del sistema.
 *
 * @selector app-users-table
 * @standalone true
 */
@Component({
  selector: 'app-users-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './users-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersTableComponent {}
