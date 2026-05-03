import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  OnInit,
  OnDestroy,
  Input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Observable, of, Subject, combineLatest } from 'rxjs';
import {
  catchError,
  switchMap,
  map,
  takeUntil,
  share,
  debounceTime,
  distinctUntilChanged,
  startWith,
} from 'rxjs/operators';
import { CameraService } from '../../../../core/services/camera.service';
import { DeviceService } from '../../../../core/services/device.service';
import { ApiService } from '../../../../core/services/api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Camera, StreamResponse } from '../../../../core/models/camera.model';
import { Device, DeviceState } from '../../../../core/models/device.model';

/**
 * CameraFiltersTableComponent (Smart Component)
 *
 * Combines device search and camera detection control table.
 * Manages filtering logic and detection start/stop operations.
 *
 * Features:
 * - Device name search with debouncing
 * - Responsive table with device state indicators
 * - Detection control buttons (Start/Stop) per row
 * - Loading states for async operations
 * - Vehicle Detection Service health monitoring
 * - Automatic data refresh on state changes
 * - Dark mode support
 * - OnPush change detection for performance
 *
 * @selector app-camera-filters-table
 * @standalone true
 * @imports CommonModule, ReactiveFormsModule
 * @example
 * <app-camera-filters-table [isServiceHealthy$]="detectionServiceHealth$" />
 */
@Component({
  selector: 'app-camera-filters-table',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './camera-filters-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CameraFiltersTableComponent implements OnInit, OnDestroy {
  /**
   * Observable emitting Vehicle Detection Service health status.
   * Used to enable/disable detection control buttons.
   * @type {Observable<boolean>}
   */
  @Input() isServiceHealthy$: Observable<boolean> = of(false);

  /**
   * FormControl for reactive device name search.
   * Triggers camera list filtering on value changes.
   * @type {FormControl<string | null>}
   */
  searchControl = new FormControl('');

  /**
   * Observable emitting filtered camera list based on search term.
   * Recalculates when search input changes or camera list refreshes.
   * @type {Observable<Camera[]>}
   */
  cameras$: Observable<Camera[]>;

  /**
   * Subject for managing subscriptions and cleanup.
   * @type {Subject<void>}
   * @private
   */
  private destroy$ = new Subject<void>();

  /**
   * Map tracking loading state per camera ID during async operations.
   * Key: cameraId, Value: isLoading boolean
   * @type {Map<number, boolean>}
   */
  loadingStates: Map<number, boolean> = new Map();

  /**
   * Latest known value of Vehicle Detection Service health status.
   * Used in button enable/disable logic and error handling.
   * @type {boolean}
   */
  isServiceHealthyLatest = false;

  /**
   * Initializes the component with service dependencies and sets up reactive camera list.
   * Combines search term changes and refresh signals to filter camera data.
   * @param {CameraService} cameraService - Camera data and refresh management
   * @param {DeviceService} deviceService - Device state updates
   * @param {ApiService} apiService - Raw API calls for non-cached camera list
   * @param {ToastService} toastService - User notifications
   * @param {ChangeDetectorRef} changeDetectorRef - Manual change detection triggering
   */
  constructor(
    private cameraService: CameraService,
    private deviceService: DeviceService,
    private apiService: ApiService,
    private toastService: ToastService,
    private changeDetectorRef: ChangeDetectorRef,
  ) {
    this.cameras$ = combineLatest([
      this.searchControl.valueChanges.pipe(
        debounceTime(300),
        distinctUntilChanged(),
        startWith(''),
      ),
      this.cameraService.refresh$,
    ]).pipe(
      switchMap(([searchTerm]) =>
        this.apiService.get<Camera[]>('/cameras').pipe(
          map((cameras: Camera[]) => this.filterCameras(cameras, searchTerm || '')),
          catchError(() => {
            this.changeDetectorRef.markForCheck();
            return of([] as Camera[]);
          }),
        ),
      ),
      share(),
    );
  }

  /**
   * Initialization lifecycle hook.
   * Subscribes to Vehicle Detection Service health status for button state management.
   * @returns {void}
   */
  ngOnInit(): void {
    this.isServiceHealthy$.pipe(takeUntil(this.destroy$)).subscribe((v) => {
      this.isServiceHealthyLatest = !!v;
      this.changeDetectorRef.markForCheck();
    });
  }

  /**
   * Cleanup lifecycle hook.
   * Unsubscribes from all observables via destroy$ subject.
   * @returns {void}
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Clears all filters to default values.
   * Resets search input and triggers table refresh.
   * @returns {void}
   */
  clearFilters(): void {
    this.searchControl.setValue('');
    this.changeDetectorRef.markForCheck();
  }

  /**
   * Filters camera list by device name search term.
   * Performs case-insensitive substring matching on device.name.
   * @param {Camera[]} cameras - List of cameras to filter
   * @param {string} searchTerm - Search term to match against device names
   * @returns {Camera[]} Filtered camera list matching search criteria
   * @private
   */
  private filterCameras(cameras: Camera[], searchTerm: string): Camera[] {
    return cameras.filter((camera) => {
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        if (!camera.device.name.toLowerCase().includes(term)) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * Returns Tailwind CSS classes for device state badge styling.
   * Color codes: ACTIVE=green, INACTIVE=yellow, FAILING=red.
   * @param {string} state - Device state (ACTIVE, INACTIVE, FAILING)
   * @returns {string} Tailwind CSS class string for badge appearance
   */
  getStateColor(state: string): string {
    const stateColors: Record<string, string> = {
      ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      INACTIVE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      FAILING: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    };
    return stateColors[state] || stateColors['INACTIVE'];
  }

  /**
   * Returns human-readable Spanish label for device state.
   * @param {string} state - Device state code
   * @returns {string} Translated state label (Activa, Inactiva, Fallando)
   */
  getStateLabel(state: string): string {
    const stateLabels: Record<string, string> = {
      ACTIVE: 'Activa',
      INACTIVE: 'Inactiva',
      FAILING: 'Fallando',
    };
    return stateLabels[state] || state;
  }

  /**
   * Returns emoji indicator for device state.
   * @param {string} state - Device state code
   * @returns {string} Emoji icon (🟢 for ACTIVE, 🟡 for INACTIVE, 🔴 for FAILING)
   */
  getStateIcon(state: string): string {
    const stateIcons: Record<string, string> = {
      ACTIVE: '🟢',
      INACTIVE: '🟡',
      FAILING: '🔴',
    };
    return stateIcons[state] || '⚪';
  }

  /**
   * Checks if detection is currently active for a camera.
   * Uses device.state as source of truth (persisted in database).
   * @param {string} deviceState - Device state value
   * @returns {boolean} True if device state is ACTIVE
   */
  isDetectionActive(deviceState: string): boolean {
    return deviceState === DeviceState.ACTIVE;
  }

  /**
   * Checks if an async operation is in progress for a camera.
   * @param {number} cameraId - Camera ID to check
   * @returns {boolean} True if operation is loading
   */
  isLoading(cameraId: number): boolean {
    return this.loadingStates.get(cameraId) || false;
  }

  /**
   * Starts vehicle detection for a camera.
   * Updates device state to ACTIVE, then initiates video stream on VDS.
   * Validates service health and camera readiness before proceeding.
   * On error, reverts device state to INACTIVE and displays toast notification.
   * @param {Camera} camera - Camera to start detection for
   * @returns {void}
   */
  startDetectionForCamera(camera: Camera): void {
    console.log('startDetectionForCamera called with camera:', camera);

    // Validar que el servicio esté healthy
    if (!this.isServiceHealthyLatest) {
      console.warn('Cannot start detection: Vehicle Detection Service is not running');
      this.changeDetectorRef.markForCheck();
      return;
    }

    // Validar que la cámara no esté ya activa
    if (camera.device.state === DeviceState.ACTIVE || this.isLoading(camera.id)) {
      console.warn('Camera already active or loading:', {
        cameraId: camera.id,
        deviceState: camera.device.state,
      });
      return;
    }

    this.loadingStates.set(camera.id, true);
    this.changeDetectorRef.markForCheck();

    const deviceUpdate: Partial<Device> = {
      id: camera.device.id,
      state: DeviceState.ACTIVE,
    };

    this.deviceService
      .update(deviceUpdate as Device)
      .pipe(
        switchMap(() => {
          console.log('Device updated, calling startStream with cameraId:', camera.id);
          return this.cameraService.startStream(camera.id);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: () => {
          this.loadingStates.set(camera.id, false);
          console.log(`Device ${camera.id} activated and stream started`);
          this.cameraService.triggerRefresh();
          this.changeDetectorRef.markForCheck();
        },
        error: (_error) => {
          console.error('Error starting detection for camera', camera.id, _error);
          this.loadingStates.set(camera.id, false);
          if (_error?.status === 409) {
            this.toastService.error(
              'Sesión ya activa para la cámara, reinicie la página',
              'Conflicto',
            );
          } else {
            this.toastService.error(
              'Error al iniciar la detección. Por favor, inténtalo de nuevo.',
              'Error',
            );
          }
          const revertUpdate: Partial<Device> = {
            id: camera.device.id,
            state: DeviceState.INACTIVE,
          };
          this.deviceService
            .update(revertUpdate as Device)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              error: (revertError) => console.error('Error reverting device state:', revertError),
            });
          this.changeDetectorRef.markForCheck();
        },
      });
  }

  /**
   * Stops vehicle detection for a camera.
   * Queries VDS for active session, stops the stream, then updates device state to INACTIVE.
   * Gracefully handles missing sessions and VDS errors by updating device state only.
   * Ensures database consistency even if VDS is unreachable.
   * @param {Camera} camera - Camera to stop detection for
   * @returns {void}
   */
  stopDetectionForCamera(camera: Camera): void {
    // Validar que la cámara esté activa
    if (camera.device.state !== DeviceState.ACTIVE || this.isLoading(camera.id)) {
      return;
    }

    this.loadingStates.set(camera.id, true);
    this.changeDetectorRef.markForCheck();
    // 1) Intentar obtener la sesión activa en el VDS y detenerla
    this.cameraService
      .getActiveStreamByDevice(camera.device.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: StreamResponse) => {
          const sessionId = res.sessionId;
          if (sessionId) {
            this.cameraService
              .stopStream(sessionId)
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: () => {
                  console.log(`Stopped session ${sessionId} for device ${camera.id}`);
                  // Luego actualizar el estado en la BD
                  const deviceUpdate: Partial<Device> = {
                    id: camera.device.id,
                    state: DeviceState.INACTIVE,
                  };
                  this.deviceService
                    .update(deviceUpdate as Device)
                    .pipe(takeUntil(this.destroy$))
                    .subscribe({
                      next: () => {
                        this.loadingStates.set(camera.id, false);
                        this.cameraService.triggerRefresh();
                        this.changeDetectorRef.markForCheck();
                      },
                      error: (err) => {
                        console.error(
                          'Error updating device state after stopping VDS session',
                          err,
                        );
                        this.loadingStates.set(camera.id, false);
                        this.changeDetectorRef.markForCheck();
                      },
                    });
                },
                error: (err) => {
                  console.error('Error stopping VDS session', err);
                  // Even if stop fails, update device state to INACTIVE to keep DB consistent
                  const deviceUpdate: Partial<Device> = {
                    id: camera.device.id,
                    state: DeviceState.INACTIVE,
                  };
                  this.deviceService
                    .update(deviceUpdate as Device)
                    .pipe(takeUntil(this.destroy$))
                    .subscribe({
                      next: () => {
                        this.loadingStates.set(camera.id, false);
                        this.cameraService.triggerRefresh();
                        this.changeDetectorRef.markForCheck();
                      },
                      error: (err2) => {
                        console.error('Error updating device state after failed stop', err2);
                        this.loadingStates.set(camera.id, false);
                        this.changeDetectorRef.markForCheck();
                      },
                    });
                },
              });
          } else {
            // No hay sesión activa: solo actualizar estado
            const deviceUpdate: Partial<Device> = {
              id: camera.device.id,
              state: DeviceState.INACTIVE,
            };
            this.deviceService
              .update(deviceUpdate as Device)
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: () => {
                  this.loadingStates.set(camera.id, false);
                  this.cameraService.triggerRefresh();
                  this.changeDetectorRef.markForCheck();
                },
                error: (err) => {
                  console.error('Error updating device state when no active session found', err);
                  this.loadingStates.set(camera.id, false);
                  this.changeDetectorRef.markForCheck();
                },
              });
          }
        },
        error: (err) => {
          // Error consultando VDS: intentar solo actualizar DB para evitar bloqueo del usuario
          console.warn('Error querying VDS for active session, updating device state anyway', err);
          const deviceUpdate: Partial<Device> = {
            id: camera.device.id,
            state: DeviceState.INACTIVE,
          };
          this.deviceService
            .update(deviceUpdate as Device)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: () => {
                this.loadingStates.set(camera.id, false);
                this.cameraService.triggerRefresh();
                this.changeDetectorRef.markForCheck();
              },
              error: (err2) => {
                console.error('Error updating device state after VDS query failure', err2);
                this.loadingStates.set(camera.id, false);
                this.changeDetectorRef.markForCheck();
              },
            });
        },
      });
  }
}
