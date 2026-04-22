import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Location } from '../../../../core/models/location.model';
import { LocationService } from '../../../../core/services/location.service';
import { DeviceService } from '../../../../core/services/device.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ModalComponent } from '../../ui/modal/modal.component';
import {
  LocationMapPickerComponent,
  MapCoordinates,
} from '../location-map-picker/location-map-picker.component';

/**
 * LocationTableComponent
 *
 * Componente que muestra una tabla de ubicaciones de monitoreo.
 * Incluye información de ubicaciones con coordenadas.
 *
 * Características:
 * - Tabla de ubicaciones disponibles
 * - Coordenadas (Latitud, Longitud)
 * - Descripción de ubicación
 * - Indicadores de cobertura
 * - Responsive layout
 * - Dark mode support
 *
 * @selector app-location-table
 * @standalone true
 * @imports CommonModule
 * @returns Tabla de ubicaciones
 *
 * @example
 * <app-location-table [locations]="monitoringLocations" />
 */
@Component({
  selector: 'app-location-table',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ModalComponent, LocationMapPickerComponent],
  templateUrl: './location-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocationTableComponent {
  @Input() locations: Location[] = [];
  @Output() locationChanged = new EventEmitter<void>();

  /** Map of locationId -> number of devices */
  devicesCount: Record<number, number> = {};

  // ── Edit state ───────────────────────────────────────────
  editingLocation: Location | null = null;
  editForm: FormGroup;
  editSaving = false;

  // ── Delete state ─────────────────────────────────────────
  deleteTarget: Location | null = null;
  deleteSaving = false;

  constructor(
    private fb: FormBuilder,
    private locationService: LocationService,
    private deviceService: DeviceService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef,
  ) {
    this.editForm = this.fb.group({
      description: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(255)]],
      latitude: ['', Validators.required],
      longitude: ['', Validators.required],
    });

    this.deviceService.getAll().subscribe((devices: any[]) => {
      const map: Record<number, number> = {};
      devices.forEach((d: any) => {
        const locId = d.location?.id;
        if (!locId) return;
        map[locId] = (map[locId] || 0) + 1;
      });
      this.devicesCount = map;
      this.cdr.markForCheck();
    });
  }

  formatCoordinates(latitude: number, longitude: number): string {
    return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  }

  // ── Edit ─────────────────────────────────────────────────
  openEdit(location: Location): void {
    this.editingLocation = location;
    this.editForm.patchValue({
      description: location.description ?? '',
      latitude: location.latitude,
      longitude: location.longitude,
    });
    this.editSaving = false;
  }

  closeEdit(): void {
    this.editingLocation = null;
    this.editForm.reset();
  }

  onEditMapCoords(coords: MapCoordinates): void {
    this.editForm.patchValue({
      latitude: coords.latitude.toFixed(6),
      longitude: coords.longitude.toFixed(6),
    });
  }

  saveEdit(): void {
    if (this.editForm.invalid || !this.editingLocation) return;
    this.editSaving = true;
    const updated: Location = {
      ...this.editingLocation,
      description: this.editForm.value.description.trim(),
      latitude: parseFloat(this.editForm.value.latitude),
      longitude: parseFloat(this.editForm.value.longitude),
    };
    this.locationService.update(updated).subscribe({
      next: () => {
        this.editSaving = false;
        this.closeEdit();
        this.toastService.success(`Ubicación "${updated.description}" actualizada`, 'Éxito');
        this.locationChanged.emit();
        this.cdr.markForCheck();
      },
      error: () => {
        this.editSaving = false;
        this.toastService.error('Error al actualizar la ubicación', 'Error');
        this.cdr.markForCheck();
      },
    });
  }

  // ── Delete ───────────────────────────────────────────────
  openDelete(location: Location): void {
    this.deleteTarget = location;
    this.deleteSaving = false;
  }

  closeDelete(): void {
    this.deleteTarget = null;
    this.deleteSaving = false;
  }

  confirmDelete(): void {
    if (!this.deleteTarget) return;
    this.deleteSaving = true;
    const target = this.deleteTarget;
    this.locationService.delete(target.id).subscribe({
      next: () => {
        this.deleteSaving = false;
        this.closeDelete();
        this.toastService.success(
          `Ubicación "${target.description ?? '#' + target.id}" eliminada`,
          'Éxito',
        );
        this.locationChanged.emit();
        this.cdr.markForCheck();
      },
      error: () => {
        this.deleteSaving = false;
        this.toastService.error(
          'No se pudo eliminar. Puede tener dispositivos asignados.',
          'Error',
        );
        this.cdr.markForCheck();
      },
    });
  }
}
