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

  /** Indicador de streaming activo */
  isStreaming: boolean = false;

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

  constructor(
    private cameraService: CameraService,
    private changeDetectorRef: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadCameras();
  }

  ngOnDestroy(): void {
    if (this.sessionId) {
      this.stopStream();
    }
    this.stopSnapshotPolling();
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
            this.isStreaming = false;
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
    if (this.isStreaming && this.selectedCamera?.id === camera.id) {
      return;
    }

    if (this.isStreaming) {
      this.stopStream();
    }

    this.selectedCamera = camera;
    this.errorMessage = null;
    this.changeDetectorRef.markForCheck();
  }

  startStream(): void {
    if (!this.selectedCamera || this.isStreaming) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    this.cameraService.startStream(this.selectedCamera.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: StreamResponse) => {
          this.sessionId = response.sessionId;
          this.isStreaming = true;
          this.isLoading = false;
          
          // MJPEG directo para todos excepto Safari/iOS (que tiene problemas con multipart).
          // En móvil Android/Chrome MJPEG funciona igual que en escritorio.
          // Si MJPEG falla, onStreamError() cae automáticamente a snapshot polling.
          if (this.isSafariOrIos()) {
            this.isSnapshotMode = true;
            this.feedUrl = response.streamUrl;
            this.streamUrl = null;
            this.startSnapshotPolling(response.streamUrl);
          } else {
            this.isSnapshotMode = false;
            this.feedUrl = response.streamUrl;
            this.streamUrl = response.streamUrl;
          }
          
          this.changeDetectorRef.markForCheck();
        },
        error: (error) => {
          console.error('Error starting stream:', error);
          this.errorMessage = error.error?.message || 'Error al iniciar el streaming';
          this.isLoading = false;
          this.changeDetectorRef.markForCheck();
        }
      });
  }

  stopStream(): void {
    if (!this.sessionId || !this.isStreaming) {
      return;
    }

    this.cameraService.stopStream(this.sessionId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.sessionId = null;
          this.streamUrl = null;
          this.isStreaming = false;
          this.stopSnapshotPolling();
          this.changeDetectorRef.markForCheck();
        },
        error: (error) => {
          console.error('Error stopping stream:', error);
          this.sessionId = null;
          this.streamUrl = null;
          this.isStreaming = false;
          this.stopSnapshotPolling();
          this.changeDetectorRef.markForCheck();
        }
      });
  }

  getSelectedCameraName(): string {
    return this.selectedCamera?.device.name || 'Ninguna cámara seleccionada';
  }

  getSelectedCameraState(): string {
    return this.selectedCamera?.device.state || 'N/A';
  }

  onStreamError(): void {
    if (this.isStreaming && this.feedUrl && !this.isSnapshotMode) {
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

  private isMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  private startSnapshotPolling(mjpegUrl: string): void {
    const snapshotBase = mjpegUrl.replace('/stream/feed/', '/stream/snapshot/');
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

  onFiltersChanged(filters: CameraFilters): void {
    this.appliedFilters = filters;
    this.changeDetectorRef.markForCheck();
  }
}
