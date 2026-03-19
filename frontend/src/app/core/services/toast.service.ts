import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  title?: string;
  message: string;
  variant?: ToastVariant;
  timeout?: number; // ms
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private toastsSubject = new BehaviorSubject<Toast[]>([]);
  public toasts$ = this.toastsSubject.asObservable();

  private generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  show(message: string, opts: { title?: string; variant?: ToastVariant; timeout?: number } = {}) {
    const toast: Toast = {
      id: this.generateId(),
      message,
      title: opts.title,
      variant: opts.variant || 'info',
      timeout: opts.timeout ?? 5000,
    };
    const current = this.toastsSubject.value.slice();
    current.push(toast);
    this.toastsSubject.next(current);

    if (toast.timeout && toast.timeout > 0) {
      setTimeout(() => this.dismiss(toast.id), toast.timeout);
    }
    return toast.id;
  }

  success(message: string, title?: string, timeout?: number) {
    return this.show(message, { title, variant: 'success', timeout });
  }

  error(message: string, title?: string, timeout?: number) {
    return this.show(message, { title, variant: 'error', timeout });
  }

  dismiss(id: string) {
    const next = this.toastsSubject.value.filter((t) => t.id !== id);
    this.toastsSubject.next(next);
  }

  clear() {
    this.toastsSubject.next([]);
  }
}
