import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule],
  // No necesita template, la redirección es instantánea
  template: '',
})
export class LandingComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
    // Esta es la clave:
    // Le decimos al navegador que vaya a esta URL.
    // Es una navegación real, no una del router de Angular.
    window.location.href = '/assets/landing/index.html';
  }
}
