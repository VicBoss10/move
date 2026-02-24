import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Subject, takeUntil } from 'rxjs';
import { CameraDeviceTableComponent } from '../../../shared/components/cameras/camera-device-table/camera-device-table.component';
import { CameraFiltersComponent } from '../../../shared/components/cameras/camera-filters/camera-filters.component';
import { CameraService } from '../../../core/services/camera.service';
import { Camera, StreamResponse } from '../../../core/models/camera.model';

@Component({
  selector: 'app-camera-streaming',
  standalone: true,
  imports: [CommonModule, RouterModule, CameraDeviceTableComponent, CameraFiltersComponent],
  templateUrl: './camera-streaming.component.html',
})
export class CameraStreamingComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  cameras: Camera[] = [];
  selectedCamera: Camera | null = null;
  streamUrl: SafeUrl | null = null;
  sessionId: string | null = null;
  isLoading: boolean = false;
  isStreaming: boolean = false;
  errorMessage: string | null = null;
  detectionCount: number = 0;

  constructor(
    private cameraService: CameraService,
    private sanitizer: DomSanitizer
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
        },
        error: (error) => {
          console.error('Error loading cameras:', error);
          this.errorMessage = 'Error al cargar las cámaras';
          this.isLoading = false;
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
          this.streamUrl = this.sanitizer.bypassSecurityTrustUrl(response.streamUrl);
          this.isStreaming = true;
          this.isLoading = false;
          this.detectionCount = response.detectionCount;
        },
        error: (error) => {
          console.error('Error starting stream:', error);
          this.errorMessage = error.error?.message || 'Error al iniciar el streaming';
          this.isLoading = false;
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
          this.detectionCount = 0;
        },
        error: (error) => {
          console.error('Error stopping stream:', error);
          this.sessionId = null;
          this.streamUrl = null;
          this.isStreaming = false;
        }
      });
  }

  getSelectedCameraName(): string {
    return this.selectedCamera?.device.name || 'Ninguna cámara seleccionada';
  }

  getSelectedCameraState(): string {
    return this.selectedCamera?.device.state || 'N/A';
  }

  onFiltersChanged(filters: any): void {
    console.log('Filtros aplicados:', filters);
  }
}
