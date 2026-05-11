import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterModule, NavigationError } from '@angular/router';
import { ToastContainerComponent } from './shared/components/ui/toast-container/toast-container.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule, ToastContainerComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  title = 'MOVE - Dashboard de Calidad del Aire';
  private router = inject(Router);

  ngOnInit(): void {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationError && this.isChunkLoadError(event.error)) {
        window.location.assign(event.url);
      }
    });
  }

  private isChunkLoadError(error: unknown): boolean {
    return (
      error instanceof TypeError &&
      (error.message.includes('dynamically imported module') ||
        error.message.includes('Failed to fetch') ||
        error.message.includes('Loading chunk'))
    );
  }
}
