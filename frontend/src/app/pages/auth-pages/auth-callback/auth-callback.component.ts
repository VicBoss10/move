import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

/**
 * AuthCallbackComponent
 *
 * Handles the OAuth 2.0 / PKCE callback from Keycloak after Google login.
 * Reads the authorization code and state from the URL, exchanges the code
 * for tokens via AuthService, then redirects to the dashboard.
 * On failure, redirects back to the sign-in page with an error flag.
 *
 * @selector app-auth-callback
 * @standalone true
 */
@Component({
  selector: 'app-auth-callback',
  imports: [],
  template: ``,
  styles: ``,
})
export class AuthCallbackComponent implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private auth: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const code = this.route.snapshot.queryParamMap.get('code');
    const state = this.route.snapshot.queryParamMap.get('state');
    const error = this.route.snapshot.queryParamMap.get('error');

    if (error || !code || !state) {
      this.router.navigate(['/signin'], { queryParams: { error: 'google_login_failed' } });
      return;
    }

    this.auth.handleOAuthCallback(code, state).subscribe({
      next: () => this.router.navigate(['/dashboard/dashboard']),
      error: () => this.router.navigate(['/signin'], { queryParams: { error: 'google_login_failed' } }),
    });
  }
}
