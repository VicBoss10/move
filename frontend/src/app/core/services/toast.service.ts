import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

/**
 * Toast notification variant/severity level.
 * @typedef {'success' | 'error' | 'warning' | 'info'} ToastVariant
 */
export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

/**
 * Toast notification message to be displayed to the user.
 * @interface Toast
 */
export interface Toast {
  /** Unique identifier for the toast instance. */
  id: string;
  /** Optional title for the notification. */
  title?: string;
  /** Main message content of the notification. */
  message: string;
  /** Visual variant indicating severity or type (success, error, warning, info). */
  variant?: ToastVariant;
  /** Auto-dismiss timeout in milliseconds (0 or negative disables auto-dismiss). */
  timeout?: number;
}

/**
 * Toast notification service for displaying transient messages to users.
 * Manages toast lifecycle including creation, display, and dismissal.
 * Supports multiple simultaneous toasts with automatic or manual dismissal.
 *
 * @class ToastService
 * @injectable root
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  /**
   * Subject managing the active toast notifications list.
   * @private
   */
  private toastsSubject = new BehaviorSubject<Toast[]>([]);
  /**
   * Observable stream of active toast notifications.
   * Components subscribe to display and manage toasts in the UI.
   */
  public toasts$ = this.toastsSubject.asObservable();

  /**
   * Generates a unique identifier for each toast instance.
   * Uses timestamp and random component to ensure uniqueness.
   * @private
   * @returns {string} Unique toast identifier.
   */
  private generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  /**
   * Displays a toast notification with optional styling and auto-dismiss.
   *
   * @param {string} message - The main notification message.
   * @param {Object} [opts] - Optional configuration.
   * @param {string} [opts.title] - Optional notification title.
   * @param {ToastVariant} [opts.variant] - Visual variant (success, error, warning, info). Defaults to 'info'.
   * @param {number} [opts.timeout] - Auto-dismiss delay in ms. Defaults to 5000. Use 0 to disable.
   * @returns {string} Unique identifier of the created toast.
   */
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

  /**
   * Displays a success notification with green styling.
   *
   * @param {string} message - Success message content.
   * @param {string} [title] - Optional title for the notification.
   * @param {number} [timeout] - Auto-dismiss delay in ms. Defaults to 5000.
   * @returns {string} Unique identifier of the created toast.
   */
  success(message: string, title?: string, timeout?: number) {
    return this.show(message, { title, variant: 'success', timeout });
  }

  /**
   * Displays an error notification with red styling.
   *
   * @param {string} message - Error message content.
   * @param {string} [title] - Optional title for the notification.
   * @param {number} [timeout] - Auto-dismiss delay in ms. Defaults to 5000.
   * @returns {string} Unique identifier of the created toast.
   */
  error(message: string, title?: string, timeout?: number) {
    return this.show(message, { title, variant: 'error', timeout });
  }

  /**
   * Removes a toast notification from the active list.
   *
   * @param {string} id - Unique identifier of the toast to remove.
   */
  dismiss(id: string) {
    const next = this.toastsSubject.value.filter((t) => t.id !== id);
    this.toastsSubject.next(next);
  }

  /**
   * Dismisses all active toast notifications.
   */
  clear() {
    this.toastsSubject.next([]);
  }
}
