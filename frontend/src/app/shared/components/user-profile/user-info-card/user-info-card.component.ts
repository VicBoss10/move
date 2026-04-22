import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../../../core/services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-user-info-card',
  imports: [CommonModule],
  templateUrl: './user-info-card.component.html',
  styles: ``,
})
export class UserInfoCardComponent implements OnInit {
  constructor(private auth: AuthService) {}

  user: any = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    bio: '',
    social: {},
  };

  ngOnInit(): void {
    const info = this.auth.getUserInfo();
    this.user.firstName = info.firstName || info.username || '';
    this.user.lastName = info.lastName || '';
    this.user.email = info.email || '';
  }
}
