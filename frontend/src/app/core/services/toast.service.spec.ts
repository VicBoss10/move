import { TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { take, skip } from 'rxjs/operators';
import { ToastService, Toast, ToastVariant } from './toast.service';

/**
 * Test suite for ToastService.
 *
 * Covers:
 * - Toast creation with message, title, and variant options
 * - Default and custom timeout configuration
 * - Auto-dismiss functionality with configurable delays
 * - Manual toast dismissal by ID
 * - Bulk clear operations
 * - Toast variant types (success, error, warning, info)
 * - Unique ID generation for toast tracking
 * - Observable toasts$ emissions and state management
 * - Helper methods (success, error) with preset configurations
 * - Edge cases (empty messages, rapid shows, very short timeouts)
 * - Persistence of specific toasts while dismissing others
 */
describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ToastService);
    service.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('show()', () => {
    it('should add a toast with message and default info variant', (done) => {
      const message = 'Test notification';

      service.toasts$.pipe(skip(1), take(1)).subscribe((toasts) => {
        expect(toasts.length).toBe(1);
        expect(toasts[0].message).toBe(message);
        expect(toasts[0].variant).toBe('info');
        done();
      });

      service.show(message);
    });

    it('should generate unique toast IDs', () => {
      const id1 = service.show('Message 1');
      const id2 = service.show('Message 2');

      expect(id1).not.toBe(id2);
      expect(typeof id1).toBe('string');
      expect(typeof id2).toBe('string');
    });

    it('should include title when provided', (done) => {
      service.toasts$.pipe(skip(1), take(1)).subscribe((toasts) => {
        expect(toasts[0].title).toBe('Custom Title');
        done();
      });

      service.show('Message', { title: 'Custom Title' });
    });

    it('should auto-dismiss after specified timeout', fakeAsync(() => {
      const toasts: Toast[][] = [];
      const subscription = service.toasts$.subscribe((t) => toasts.push([...t]));

      service.show('Auto-dismiss', { timeout: 500 });
      expect(toasts[1].length).toBe(1);

      tick(500);
      expect(toasts[2].length).toBe(0);

      subscription.unsubscribe();
    }));

    it('should not auto-dismiss when timeout is 0', fakeAsync(() => {
      const toasts: Toast[][] = [];
      const subscription = service.toasts$.subscribe((t) => toasts.push([...t]));

      service.show('Persistent', { timeout: 0 });
      tick(5000);

      expect(toasts[1].length).toBe(1);
      subscription.unsubscribe();
    }));

    it('should use default timeout of 5000ms', fakeAsync(() => {
      const toasts: Toast[][] = [];
      const subscription = service.toasts$.subscribe((t) => toasts.push([...t]));

      service.show('Default timeout message');
      expect(toasts[1].length).toBe(1);

      flush();

      expect(toasts[2].length).toBe(0);
      subscription.unsubscribe();
    }));
  });

  describe('success()', () => {
    it('should create a success variant toast', (done) => {
      service.toasts$.pipe(skip(1), take(1)).subscribe((toasts) => {
        expect(toasts[0].variant).toBe('success');
        expect(toasts[0].title).toBe('Success');
        expect(toasts[0].message).toBe('Operation completed');
        done();
      });

      service.success('Operation completed', 'Success');
    });

    it('should auto-dismiss success toast after timeout', fakeAsync(() => {
      const toasts: Toast[][] = [];
      const subscription = service.toasts$.subscribe((t) => toasts.push([...t]));

      service.success('Saved', 'Saved', 2000);
      expect(toasts[1].length).toBe(1);

      flush();

      expect(toasts[2].length).toBe(0);
      subscription.unsubscribe();
    }));
  });

  describe('error()', () => {
    it('should create an error variant toast', (done) => {
      service.toasts$.pipe(skip(1), take(1)).subscribe((toasts) => {
        expect(toasts[0].variant).toBe('error');
        expect(toasts[0].title).toBe('Error');
        expect(toasts[0].message).toBe('Operation failed');
        done();
      });

      service.error('Operation failed', 'Error');
    });
  });

  describe('dismiss()', () => {
    it('should remove a toast by its ID', fakeAsync(() => {
      const toasts: Toast[][] = [];
      const subscription = service.toasts$.subscribe((t) => toasts.push([...t]));

      const id = service.show('Dismissible toast');
      expect(toasts[1].length).toBe(1);

      service.dismiss(id);
      tick(50);

      expect(toasts[2].length).toBe(0);
      subscription.unsubscribe();
    }));

    it('should only remove the specified toast, keeping others', fakeAsync(() => {
      const toasts: Toast[][] = [];
      const subscription = service.toasts$.subscribe((t) => toasts.push([...t]));

      const id1 = service.show('Toast 1');
      const id2 = service.show('Toast 2');
      const id3 = service.show('Toast 3');
      expect(toasts[3].length).toBe(3);

      service.dismiss(id2);
      tick(50);

      expect(toasts[4].length).toBe(2);
      expect(toasts[4].map((t) => t.id)).toEqual([id1, id3]);
      subscription.unsubscribe();
    }));
  });

  describe('clear()', () => {
    it('should remove all toasts at once', fakeAsync(() => {
      const toasts: Toast[][] = [];
      const subscription = service.toasts$.subscribe((t) => toasts.push([...t]));

      service.show('Message 1');
      service.show('Message 2');
      service.show('Message 3');
      expect(toasts[3].length).toBe(3);

      service.clear();
      tick(50);

      expect(toasts[4].length).toBe(0);
      subscription.unsubscribe();
    }));
  });

  describe('variants', () => {
    it('should support all variant types', fakeAsync(() => {
      const toasts: Toast[][] = [];
      const subscription = service.toasts$.subscribe((t) => toasts.push([...t]));

      const variants: ToastVariant[] = ['success', 'error', 'warning', 'info'];
      variants.forEach((v) => service.show(`Test ${v}`, { variant: v }));

      tick(50);

      expect(toasts[4].length).toBe(4);
      const receivedVariants = toasts[4].map((t) => t.variant);
      expect(receivedVariants).toEqual(variants);
      subscription.unsubscribe();
    }));
  });

  describe('edge cases', () => {
    it('should handle empty message', (done) => {
      service.toasts$.pipe(skip(1), take(1)).subscribe((toasts) => {
        expect(toasts[0].message).toBe('');
        expect(toasts[0].id).toBeDefined();
        done();
      });

      service.show('');
    });

    it('should handle multiple rapid shows', fakeAsync(() => {
      const toasts: Toast[][] = [];
      const subscription = service.toasts$.subscribe((t) => toasts.push([...t]));

      for (let i = 0; i < 5; i++) {
        service.show(`Toast ${i}`);
      }

      tick(50);

      expect(toasts[5].length).toBe(5);
      subscription.unsubscribe();
    }));

    it('should handle very short timeout', fakeAsync(() => {
      const toasts: Toast[][] = [];
      const subscription = service.toasts$.subscribe((t) => toasts.push([...t]));

      service.show('Quick exit', { timeout: 10 });
      expect(toasts[1].length).toBe(1);

      flush();

      expect(toasts[2].length).toBe(0);
      subscription.unsubscribe();
    }));
  });
});
