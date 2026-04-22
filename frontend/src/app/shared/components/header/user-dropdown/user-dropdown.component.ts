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
  imports: [CommonModule, RouterModule, DropdownComponent, DropdownItemTwoComponent],
})
export class UserDropdownComponent {
  isOpen = false;

  /** Observable con el usuario actual (si se encuentra). */
  user$: Observable<{
    firstName?: string;
    lastName?: string;
    email?: string;
    username?: string;
  } | null>;

  constructor(
    private userService: UserService,
    private auth: AuthService,
  ) {
    // When login status changes, refresh users so newly created users appear immediately.
    // Use token claims only — avoid calling backend (403/roles issues). Show null if no token claims.
    this.user$ = this.auth.isLoggedIn$.pipe(
      map(() => {
        const info = this.auth.getUserInfo();
        if (!info) return null;
        // Only return object if it contains displayable info
        if (info.firstName || info.lastName || info.username || info.email) return info;
        return null;
      }),
      catchError(() => of(null)),
      shareReplay(1),
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
