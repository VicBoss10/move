import { CommonModule } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { ToastService, Toast } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast-container.component.html',
})
export class ToastContainerComponent implements OnDestroy {
  toasts: Toast[] = [];
  sub: Subscription;

  constructor(private toastService: ToastService) {
    this.sub = this.toastService.toasts$.subscribe((v) => (this.toasts = v));
  }

  getContainerClass(variant?: string) {
    switch (variant) {
      case 'success':
        return 'border-success-500';
      case 'error':
        return 'border-error-500';
      case 'warning':
        return 'border-warning-500';
      default:
        return 'border-gray-200';
    }
  }

  dismiss(id: string) {
    this.toastService.dismiss(id);
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }
}
