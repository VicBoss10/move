import { Component, OnInit } from '@angular/core';
import { InputFieldComponent } from '../../form/input/input-field.component';
import { ModalService } from '../../../services/modal.service';
import { AuthService } from '../../../../core/services/auth.service';
import { CommonModule } from '@angular/common';
import { ModalComponent } from '../../ui/modal/modal.component';
import { ButtonComponent } from '../../ui/button/button.component';

@Component({
  selector: 'app-user-meta-card',
  imports: [CommonModule],
  templateUrl: './user-meta-card.component.html',
  styles: ``,
})
export class UserMetaCardComponent implements OnInit {
  constructor(
    public modal: ModalService,
    private auth: AuthService,
  ) {}

  isOpen = false;
  openModal() {
    this.isOpen = true;
  }
  closeModal() {
    this.isOpen = false;
  }

  // User data sourced from token / AuthService
  user: any = {
    firstName: '',
    lastName: '',
    role: 'User',
    location: '',
    avatar: '/images/user/user.png',
    social: {},
    email: '',
    phone: '',
    bio: '',
  };

  ngOnInit(): void {
    const info = this.auth.getUserInfo();
    this.user.firstName = info.firstName || info.username || '';
    this.user.lastName = info.lastName || '';
    this.user.email = info.email || '';
    this.user.role = this.getDisplayRole(info.roles);
  }

  private getDisplayRole(roles?: string[]): string {
    if (!roles || roles.length === 0) return 'Usuario';
    const lower = roles.map((r) => r.toLowerCase());
    // Prefer explicit admin
    if (
      lower.includes('admin') ||
      lower.includes('administrator') ||
      lower.some((r) => r.includes('admin'))
    ) {
      return 'Administrador';
    }
    // Prefer explicit user
    if (lower.includes('user')) return 'Usuario';
    // Fallback: skip default-roles entries if possible
    const nonDefault = roles.find((r) => !r.toLowerCase().startsWith('default-roles'));
    if (nonDefault) return nonDefault;
    return 'Usuario';
  }

  handleSave() {
    // Handle save logic here
    console.log('Saving changes...');
    this.modal.closeModal();
  }
}
