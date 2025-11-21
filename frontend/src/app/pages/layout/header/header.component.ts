import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {

  constructor() { }

  /**
   * Alterna la clase 'mobile-nav-active' en el body para mostrar/ocultar el menú móvil.
   */
  toggleMobileNav(): void {
    document.body.classList.toggle('mobile-nav-active');
  }

}
