import { Component } from '@angular/core';
import { DropdownComponent } from '../../ui/dropdown/dropdown.component';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DropdownItemTwoComponent } from '../../ui/dropdown/dropdown-item/dropdown-item.component-two';
import { UserService } from '../../../../core/services/user.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Observable, of } from 'rxjs';
import { map, catchError, shareReplay } from 'rxjs/operators';

@Component({
  selector: 'app-user-dropdown',
  templateUrl: './user-dropdown.component.html',
  imports:[CommonModule,RouterModule,DropdownComponent,DropdownItemTwoComponent]
})
export class UserDropdownComponent {
  isOpen = false;

  /** Observable con el usuario actual (si se encuentra). */
  user$: Observable<{ firstName?: string; lastName?: string; email?: string; username?: string } | null>;

  constructor(private userService: UserService, private auth: AuthService) {
    // Cargar lista de usuarios y emparejar con el usuario logueado por email.
    const currentEmail = this.auth.getUserInfo().email;

    this.user$ = this.userService.getAll().pipe(
      map(users => {
        if (!users || users.length === 0) return null;
        if (currentEmail) {
          const found = (users as any[]).find(u => u.email === currentEmail);
          if (found) return found;
        }
        // fallback: devolver el primer usuario
        return users[0] as any;
      }),
      catchError(() => of(null)),
      shareReplay(1)
    );
  }

  toggleDropdown() {
    this.isOpen = !this.isOpen;
  }

  closeDropdown() {
    this.isOpen = false;
  }

  logout(): void {
    this.closeDropdown();
    this.auth.logout();
  }
}