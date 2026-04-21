import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { CameraService } from '../../../../core/services/camera.service';
import { Camera, StreamResponse } from '../../../../core/models/camera.model';
import { DeviceState } from '../../../../core/models/device.model';

/**
 * Interfaz para filtros de cámara
 */
export interface CameraFilters {
  state: string;
  location: number;
}

/**
 * CameraStreamingComponent
 *
 * Componente que permite visualizar streaming de cámaras en tiempo real.
 * Maneja la selección de cámaras, inicio/parada de streams y detección de vehículos.
 *
 * Características:
 * - Lista de cámaras disponibles
 * - Visualización de streaming en tiempo real
 * - Control de inicio/parada del stream
 * - Contador de detecciones de vehículos
 * - Manejo de errores y estados de carga
 * - Dark mode support
 *
 * @selector app-camera-streaming-content
 * @standalone true
 * @imports CommonModule, RouterModule
 * @returns Página de streaming de cámaras
 *
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
   * Subject para manejo de cleanup en ngOnDestroy
   * @private
   */
  private destroy$ = new Subject<void>();

  /** Lista de cámaras disponibles */
  cameras: Camera[] = [];

  /** Cámara actualmente seleccionada */
  selectedCamera: Camera | null = null;

  /** URL del stream */
  streamUrl: string | null = null;

  /** ID de sesión del stream activo */
  sessionId: string | null = null;

  /** Indicador de estado de carga */
  isLoading: boolean = false;

  /** True cuando la detección está activa en el backend para la cámara seleccionada */
  detectionActive: boolean = false;

  /** True cuando el usuario está visualizando el feed de video */
  isViewing: boolean = false;

  /** Mensaje de error actual */
  errorMessage: string | null = null;

  /** URL original del feed (para fallback a snapshot) */
  private feedUrl: string | null = null;

  /** Modo snapshot para navegadores sin soporte MJPEG (Safari/iOS) */
  isSnapshotMode: boolean = false;

  /** URL del snapshot actual con cache-busting */
  snapshotUrl: string | null = null;

  /** Intervalo de polling para snapshots */
  private snapshotIntervalRef: ReturnType<typeof setInterval> | null = null;
  private pendingPreloadImg: HTMLImageElement | null = null;

  /** Filtros aplicados a la tabla */
  appliedFilters: CameraFilters = {
    state: '',
    location: 0,
  };

  /** Flag para mostrar controles en móvil cuando se toca el stream */
  showControlsOnTouch: boolean = false;

  /** Referencia al timeout de ocultamiento de controles */
  private touchControlsTimeoutRef: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private cameraService: CameraService,
    private changeDetectorRef: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadCameras();
    // React to camera list refreshes triggered elsewhere (start/stop detection)
    this.cameraService.refresh$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.loadCameras();
    });
  }

  ngOnDestroy(): void {
    // Solo detener la visualización — la detección persiste en el backend hasta detenerse explícitamente
    if (this.isViewing) {
      this.stopViewing();
    }
    // Limpiar timeout de controles
    if (this.touchControlsTimeoutRef !== null) {
      clearTimeout(this.touchControlsTimeoutRef);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCameras(): void {
    this.isLoading = true;
    this.cameraService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (cameras) => {
          const all = Array.isArray(cameras) ? cameras : [];
          // Mostrar por defecto solo cámaras con estado ACTIVE
          this.cameras = all.filter(c => (c.device?.state || '').toString().toUpperCase() === DeviceState.ACTIVE);
          // Si la cámara seleccionada ya no está en la lista (por estar inactiva), deseleccionarla
          if (this.selectedCamera && !this.cameras.find(cc => cc.id === this.selectedCamera?.id)) {
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
        }
      });
  }

  selectCamera(camera: Camera): void {
    if (this.selectedCamera?.id === camera.id) {
      return;
    }

    // Solo cambiar la selección; no hacer nada más
    if (this.isViewing) {
      this.stopViewing();
    }

    this.selectedCamera = camera;
    this.sessionId = null;
    this.feedUrl = null;
    this.detectionActive = false;
    this.errorMessage = null;

    // Validar que la cámara esté activa en BD (device.state === ACTIVE)
    if (camera.device.state === DeviceState.ACTIVE) {
      // La detección está activa en el backend; solicitar la sesión activa asociada al device
      this.detectionActive = true;
      this.isLoading = true;
      this.cameraService.getActiveStreamByDevice(camera.device.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (res) => {
            // El backend devuelve sessionId y streamUrl/snapshotUrl
            this.sessionId = (res as any)?.sessionId || null;
            this.feedUrl = this.toAbsoluteApiUrl((res as any)?.streamUrl || null);
            this.isLoading = false;
            this.changeDetectorRef.markForCheck();
          },
          error: (err) => {
            // No hay sesión activa o error: mantener detectionActive true (BD) pero no hay feed
            console.warn('No active stream for device or error:', err);
            this.sessionId = null;
            this.feedUrl = null;
            this.isLoading = false;
            this.changeDetectorRef.markForCheck();
          }
        });
    }

    this.changeDetectorRef.markForCheck();
  }

  startViewing(): void {
    // Fallback: Si feedUrl aún no está disponible pero tenemos sessionId,
    // construirla localmente. Esto ocurre en iPhone cuando el usuario da click
    // antes de que getActiveStreamByDevice() complete.
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

  stopViewing(): void {
    this.isViewing = false;
    this.streamUrl = null;
    this.showControlsOnTouch = false;
    // Limpiar timeout de controles
    if (this.touchControlsTimeoutRef !== null) {
      clearTimeout(this.touchControlsTimeoutRef);
      this.touchControlsTimeoutRef = null;
    }
    this.stopSnapshotPolling();
    this.changeDetectorRef.markForCheck();
  }

  toggleFullScreen(element: HTMLElement): void {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      element.requestFullscreen();
    }
  }

  /**
   * Maneja el evento de toque en el stream para mostrar controles en móvil
   * Los controles se ocultarán después de 4 segundos (similar a YouTube)
   */
  onStreamTouched(): void {
    if (!this.isViewing) {
      return;
    }

    // Mostrar controles
    this.showControlsOnTouch = true;
    this.changeDetectorRef.markForCheck();

    // Limpiar timeout anterior si existe
    if (this.touchControlsTimeoutRef !== null) {
      clearTimeout(this.touchControlsTimeoutRef);
    }

    // Ocultar controles después de 4 segundos
    this.touchControlsTimeoutRef = setTimeout(() => {
      this.showControlsOnTouch = false;
      this.touchControlsTimeoutRef = null;
      this.changeDetectorRef.markForCheck();
    }, 4000);
  }

  getSelectedCameraName(): string {
    return this.selectedCamera?.device.name || 'Ninguna cámara seleccionada';
  }

  getSelectedCameraState(): string {
    return this.selectedCamera?.device.state || 'N/A';
  }

  onStreamError(): void {
    if (this.isViewing && this.feedUrl && !this.isSnapshotMode) {
      this.isSnapshotMode = true;
      this.streamUrl = null;
      this.startSnapshotPolling(this.feedUrl);
      this.changeDetectorRef.detectChanges();
    }
  }

  private isSafariOrIos(): boolean {
    const ua = navigator.userAgent;
    return /iPad|iPhone|iPod/.test(ua) ||
      (/Safari/.test(ua) && !/Chrome|CriOS|FxiOS|Edg/.test(ua));
  }

  isMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  private startSnapshotPolling(mjpegUrl: string): void {
    const snapshotBase = mjpegUrl
      .replace('/streams/feed/', '/streams/snapshot/')
      .replace('/stream/feed/', '/stream/snapshot/');
    // En móvil: pedir frame más pequeño (640px, quality 50) para transferir rápido
    const mobile = this.isMobile();
    const suffix = mobile ? '&w=640&q=50' : '';

    // Ciclo secuencial: el siguiente request arranca inmediatamente al completar el anterior.
    const scheduleNext = () => {
      if (this.snapshotIntervalRef === null) return;

      const img = new Image();
      this.pendingPreloadImg = img;

      img.onload = () => {
        this.pendingPreloadImg = null;
        if (this.snapshotIntervalRef === null) return;
        this.snapshotUrl = img.src;
        this.changeDetectorRef.detectChanges();
        // Sin delay: encadenar inmediatamente el siguiente frame
        this.snapshotIntervalRef = setTimeout(scheduleNext, 0) as unknown as ReturnType<typeof setInterval>;
      };

      img.onerror = () => {
        this.pendingPreloadImg = null;
        if (this.snapshotIntervalRef === null) return;
        this.snapshotIntervalRef = setTimeout(scheduleNext, 300) as unknown as ReturnType<typeof setInterval>;
      };

      img.src = `${snapshotBase}?t=${Date.now()}${suffix}`;
    };

    // Primer snapshot inmediato
    this.snapshotUrl = `${snapshotBase}?t=${Date.now()}${suffix}`;
    this.snapshotIntervalRef = setTimeout(scheduleNext, 0) as unknown as ReturnType<typeof setInterval>;
  }

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

  private toAbsoluteApiUrl(url: string | null): string | null {
    if (!url) {
      return null;
    }

    if (/^https?:\/\//i.test(url)) {
      return url;
    }

    const apiBase: string = (window as any).__API_BASE_URL__ || 'http://localhost:8080';
    const normalizedPath = url.startsWith('/') ? url : `/${url}`;
    return `${apiBase.replace(/\/$/, '')}${normalizedPath}`;
  }

  onFiltersChanged(filters: CameraFilters): void {
    this.appliedFilters = filters;
    this.changeDetectorRef.markForCheck();
  }
}
