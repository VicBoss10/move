import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { CameraService } from '../../../../core/services/camera.service';
import { Camera, StreamResponse } from '../../../../core/models/camera.model';

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
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCameras(): void {
    this.isLoading = true;
    this.cameraService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (cameras) => {
          this.cameras = Array.isArray(cameras) ? cameras : [];
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
          this.streamUrl = response.streamUrl;
          this.isStreaming = true;
          this.isLoading = false;
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
          this.changeDetectorRef.markForCheck();
        },
        error: (error) => {
          console.error('Error stopping stream:', error);
          this.sessionId = null;
          this.streamUrl = null;
          this.isStreaming = false;
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

  onFiltersChanged(filters: CameraFilters): void {
    this.appliedFilters = filters;
    this.changeDetectorRef.markForCheck();
  }
}
