import { Component, OnInit } from '@angular/core';
import { ModalService } from '../../../services/modal.service';
import { AuthService } from '../../../../core/services/auth.service';

interface UserMetaInfo {
  firstName: string;
  lastName: string;
  role: string;
  location: string;
  avatar: string;
  social: Record<string, unknown>;
  email: string;
  phone: string;
  bio: string;
}

@Component({
  selector: 'app-user-meta-card',
  imports: [],
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

  user: UserMetaInfo = {
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
