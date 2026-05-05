import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { CameraService } from '../../../../core/services/camera.service';
import { Camera, StreamResponse } from '../../../../core/models/camera.model';
import { DeviceState } from '../../../../core/models/device.model';

/**
 * Camera filter options for list filtering.
 * @interface CameraFilters
 * @property {string} state - Device state filter
 * @property {number} location - Location ID filter
 */
export interface CameraFilters {
  state: string;
  location: number;
}

/**
 * CameraStreamingComponent (Smart Component)
 *
 * Enables real-time video streaming and live monitoring of camera devices.
 * Manages camera selection, stream playback, MJPEG/snapshot fallback for Safari/iOS.
 *
 * Features:
 * - Real-time MJPEG video streaming
 * - Automatic snapshot polling fallback for MJPEG-unsupported browsers
 * - Camera selection with active detection check
 * - YouTube-style control overlay with auto-hide on mobile
 * - Fullscreen streaming view
 * - Session management for active streams
 * - Dynamic camera list with live refresh
 * - Error handling and loading states
 * - Dark mode support
 * - OnPush change detection
 *
 * @selector app-camera-streaming-content
 * @standalone true
 * @imports CommonModule, RouterModule
 * @example
 * <app-camera-streaming-content />
 */
@Component({
  selector: 'app-camera-streaming-content',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './camera-streaming.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CameraStreamingComponent implements OnInit, OnDestroy {
  /**
   * Subject for managing subscriptions and cleanup.
   * @type {Subject<void>}
   * @private
   */
  private destroy$ = new Subject<void>();

  /**
   * List of active camera devices available for streaming.
   * @type {Camera[]}
   */
  cameras: Camera[] = [];

  /**
   * Currently selected camera for streaming.
   * @type {Camera | null}
   */
  selectedCamera: Camera | null = null;

  /**
   * Stream URL (MJPEG) for img src binding.
   * @type {string | null}
   */
  streamUrl: string | null = null;

  /**
   * Active stream session ID from VDS.
   * @type {string | null}
   */
  sessionId: string | null = null;

  /**
   * Loading state during camera fetch or stream setup.
   * @type {boolean}
   */
  isLoading: boolean = false;

  /**
   * Detection active flag (device.state === ACTIVE in database).
   * @type {boolean}
   */
  detectionActive: boolean = false;

  /**
   * User is currently viewing the video feed.
   * @type {boolean}
   */
  isViewing: boolean = false;

  /**
   * Error message to display to user.
   * @type {string | null}
   */
  errorMessage: string | null = null;

  /**
   * MJPEG feed URL from stream response.
   * Used as fallback base for snapshot polling.
   * @type {string | null}
   * @private
   */
  private feedUrl: string | null = null;

  /**
   * Snapshot polling mode enabled (MJPEG unsupported).
   * @type {boolean}
   */
  isSnapshotMode: boolean = false;

  /**
   * Current snapshot URL with cache-busting timestamp.
   * @type {string | null}
   */
  snapshotUrl: string | null = null;

  /**
   * Timeout/interval reference for snapshot polling.
   * @type {ReturnType<typeof setInterval> | null}
   * @private
   */
  private snapshotIntervalRef: ReturnType<typeof setInterval> | null = null;

  /**
   * Preloading image for next snapshot frame.
   * @type {HTMLImageElement | null}
   * @private
   */
  private pendingPreloadImg: HTMLImageElement | null = null;

  /**
   * Current filter state for camera list.
   * @type {CameraFilters}
   */
  appliedFilters: CameraFilters = {
    state: '',
    location: 0,
  };

  /**
   * Mobile touch control visibility toggle.
   * Controls overlay fade in/out on touch.
   * @type {boolean}
   */
  showControlsOnTouch: boolean = false;

  /**
   * Timeout reference for hiding mobile touch controls.
   * @type {ReturnType<typeof setTimeout> | null}
   * @private
   */
  private touchControlsTimeoutRef: ReturnType<typeof setTimeout> | null = null;

  /**
   * Initializes the component with service dependencies.
   * @param {CameraService} cameraService - Camera data and stream management
   * @param {ChangeDetectorRef} changeDetectorRef - Manual change detection trigger
   */
  constructor(
    private cameraService: CameraService,
    private changeDetectorRef: ChangeDetectorRef,
  ) {}

  /**
   * Initialization lifecycle hook.
   * Loads initial camera list and subscribes to refresh signals.
   * @returns {void}
   */
  ngOnInit(): void {
    this.loadCameras();
    this.cameraService.refresh$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.loadCameras();
    });
  }

  /**
   * Cleanup lifecycle hook.
   * Stops video viewing and clears timeouts before destruction.
   * Detection continues running on backend until explicitly stopped.
   * @returns {void}
   */
  ngOnDestroy(): void {
    if (this.isViewing) {
      this.stopViewing();
    }
    if (this.touchControlsTimeoutRef !== null) {
      clearTimeout(this.touchControlsTimeoutRef);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Loads camera list filtered to show only ACTIVE cameras.
   * Deselects camera if it becomes inactive between refreshes.
   * @returns {void}
   */
  loadCameras(): void {
    this.isLoading = true;
    this.cameraService
      .getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (cameras) => {
          const all = Array.isArray(cameras) ? cameras : [];
          // Mostrar por defecto solo cámaras con estado ACTIVE
          this.cameras = all.filter(
            (c) => (c.device?.state || '').toString().toUpperCase() === DeviceState.ACTIVE,
          );
          // Si la cámara seleccionada ya no está en la lista (por estar inactiva), deseleccionarla
          if (
            this.selectedCamera &&
            !this.cameras.find((cc) => cc.id === this.selectedCamera?.id)
          ) {
            this.selectedCamera = null;
            this.streamUrl = null;
            this.sessionId = null;
            this.detectionActive = false;
            this.isViewing = false;
          }
          this.isLoading = false;
          this.changeDetectorRef.markForCheck();
        },
        error: (error) => {
          console.error('Error loading cameras:', error);
          this.errorMessage = 'Error al cargar las cámaras';
          this.isLoading = false;
          this.changeDetectorRef.markForCheck();
        },
      });
  }

  /**
   * Selects a camera and fetches its active stream session.
   * Stops current viewing if switching cameras.
   * Queries backend for active stream if detection is enabled.
   * @param {Camera} camera - Camera to select
   * @returns {void}
   */
  selectCamera(camera: Camera): void {
    if (this.selectedCamera?.id === camera.id) {
      return;
    }

    if (this.isViewing) {
      this.stopViewing();
    }

    this.selectedCamera = camera;
    this.sessionId = null;
    this.feedUrl = null;
    this.detectionActive = false;
    this.errorMessage = null;

    if (camera.device.state === DeviceState.ACTIVE) {
      this.detectionActive = true;
      this.isLoading = true;
      this.cameraService
        .getActiveStreamByDevice(camera.device.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (res: StreamResponse) => {
            this.sessionId = res?.sessionId || null;
            this.feedUrl = this.toAbsoluteApiUrl(res?.streamUrl || null);
            this.isLoading = false;
            this.changeDetectorRef.markForCheck();
          },
          error: (err) => {
            console.warn('No active stream for device or error:', err);
            this.sessionId = null;
            this.feedUrl = null;
            this.isLoading = false;
            this.changeDetectorRef.markForCheck();
          },
        });
    }

    this.changeDetectorRef.markForCheck();
  }

  /**
   * Starts video stream viewing.
   * Detects Safari/iOS and uses snapshot polling fallback if needed.
   * Constructs feed URL from session ID if needed (race condition safety).
   * @returns {void}
   */
  startViewing(): void {
    if (!this.feedUrl && this.sessionId && this.detectionActive) {
      this.feedUrl = this.toAbsoluteApiUrl(`/streams/feed/${this.sessionId}`);
    }

    if (!this.detectionActive || !this.feedUrl || this.isViewing) {
      return;
    }

    this.isViewing = true;

    if (this.isSafariOrIos()) {
      this.isSnapshotMode = true;
      this.streamUrl = null;
      this.startSnapshotPolling(this.feedUrl);
    } else {
      this.isSnapshotMode = false;
      this.streamUrl = this.feedUrl;
    }

    this.changeDetectorRef.markForCheck();
  }

  /**
   * Stops video stream viewing and clears polling/timeouts.
   * @returns {void}
   */
  stopViewing(): void {
    this.isViewing = false;
    this.streamUrl = null;
    this.showControlsOnTouch = false;
    if (this.touchControlsTimeoutRef !== null) {
      clearTimeout(this.touchControlsTimeoutRef);
      this.touchControlsTimeoutRef = null;
    }
    this.stopSnapshotPolling();
    this.changeDetectorRef.markForCheck();
  }

  /**
   * Toggles fullscreen mode for stream container.
   * @param {HTMLElement} element - Stream container DOM element
   * @returns {void}
   */
  toggleFullScreen(element: HTMLElement): void {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      element.requestFullscreen();
    }
  }

  /**
   * Handles stream touch event on mobile.
   * Shows control overlay for 4 seconds (YouTube-style auto-hide).
   * @returns {void}
   */
  onStreamTouched(): void {
    if (!this.isViewing) {
      return;
    }

    this.showControlsOnTouch = true;
    this.changeDetectorRef.markForCheck();

    if (this.touchControlsTimeoutRef !== null) {
      clearTimeout(this.touchControlsTimeoutRef);
    }

    this.touchControlsTimeoutRef = setTimeout(() => {
      this.showControlsOnTouch = false;
      this.touchControlsTimeoutRef = null;
      this.changeDetectorRef.markForCheck();
    }, 4000);
  }

  /**
   * Returns display name of selected camera.
   * @returns {string} Camera device name or placeholder
   */
  getSelectedCameraName(): string {
    return this.selectedCamera?.device.name || 'Ninguna cámara seleccionada';
  }

  /**
   * Returns device state of selected camera.
   * @returns {string} Device state (ACTIVE, INACTIVE, FAILING) or N/A
   */
  getSelectedCameraState(): string {
    return this.selectedCamera?.device.state || 'N/A';
  }

  /**
   * Handles MJPEG stream loading error.
   * Falls back to snapshot polling mode.
   * @returns {void}
   */
  onStreamError(): void {
    if (this.isViewing && this.feedUrl && !this.isSnapshotMode) {
      this.isSnapshotMode = true;
      this.streamUrl = null;
      this.startSnapshotPolling(this.feedUrl);
      this.changeDetectorRef.detectChanges();
    }
  }

  /**
   * Detects Safari or iOS browser (no native MJPEG support).
   * @returns {boolean} True if Safari or iOS
   * @private
   */
  private isSafariOrIos(): boolean {
    const ua = navigator.userAgent;
    return (
      /iPad|iPhone|iPod/.test(ua) || (/Safari/.test(ua) && !/Chrome|CriOS|FxiOS|Edg/u.test(ua))
    );
  }

  /**
   * Detects mobile device (any mobile OS).
   * @returns {boolean} True if mobile browser detected
   */
  isMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    );
  }

  /**
   * Starts snapshot polling cycle for browsers without MJPEG support.
   * Converts MJPEG feed URL to snapshot endpoint and polls sequentially.
   * On mobile, requests smaller frames (640px, quality 50) for faster transfer.
   * Uses recursive scheduling with zero delay on success, 300ms on error.
   */
  private startSnapshotPolling(mjpegUrl: string): void {
    const snapshotBase = mjpegUrl
      .replace('/streams/feed/', '/streams/snapshot/')
      .replace('/stream/feed/', '/stream/snapshot/');
    const mobile = this.isMobile();
    const suffix = mobile ? '&w=640&q=50' : '';

    const scheduleNext = () => {
      if (this.snapshotIntervalRef === null) return;

      const img = new Image();
      this.pendingPreloadImg = img;

      img.onload = () => {
        this.pendingPreloadImg = null;
        if (this.snapshotIntervalRef === null) return;
        this.snapshotUrl = img.src;
        this.changeDetectorRef.detectChanges();
        this.snapshotIntervalRef = setTimeout(scheduleNext, 0) as unknown as ReturnType<
          typeof setInterval
        >;
      };

      img.onerror = () => {
        this.pendingPreloadImg = null;
        if (this.snapshotIntervalRef === null) return;
        this.snapshotIntervalRef = setTimeout(scheduleNext, 300) as unknown as ReturnType<
          typeof setInterval
        >;
      };

      img.src = `${snapshotBase}?t=${Date.now()}${suffix}`;
    };

    this.snapshotUrl = `${snapshotBase}?t=${Date.now()}${suffix}`;
    this.snapshotIntervalRef = setTimeout(scheduleNext, 0) as unknown as ReturnType<
      typeof setInterval
    >;
  }

  /**
   * Stops snapshot polling and clears pending image loads.
   * @private
   */
  private stopSnapshotPolling(): void {
    if (this.snapshotIntervalRef !== null) {
      clearTimeout(this.snapshotIntervalRef as unknown as ReturnType<typeof setTimeout>);
      this.snapshotIntervalRef = null;
    }
    this.isSnapshotMode = false;
    this.snapshotUrl = null;
    if (this.pendingPreloadImg) {
      this.pendingPreloadImg.onload = null;
      this.pendingPreloadImg.onerror = null;
      this.pendingPreloadImg = null;
    }
  }

  /**
   * Converts relative API URLs to absolute using runtime-injected base URL.
   * Handles both relative and absolute URLs, with localhost fallback.
   * @param {string | null} url - Relative or absolute URL
   * @returns {string | null} Absolute URL or null
   * @private
   */
  private toAbsoluteApiUrl(url: string | null): string | null {
    if (!url) {
      return null;
    }

    if (/^https?:\/\//i.test(url)) {
      return url;
    }

    const apiBase: string =
      (window as unknown as { __API_BASE_URL__?: string }).__API_BASE_URL__ ||
      'http://localhost:8080';
    const normalizedPath = url.startsWith('/') ? url : `/${url}`;
    return `${apiBase.replace(/\/$/, '')}${normalizedPath}`;
  }

  /**
   * Updates applied filters from external filter control.
   * @param {CameraFilters} filters - New filter values
   * @returns {void}
   */
  onFiltersChanged(filters: CameraFilters): void {
    this.appliedFilters = filters;
    this.changeDetectorRef.markForCheck();
  }
}
