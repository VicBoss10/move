import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';

import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Location } from '../../../../core/models/location.model';
import { Device } from '../../../../core/models/device.model';
import { LocationService } from '../../../../core/services/location.service';
import { DeviceService } from '../../../../core/services/device.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ModalComponent } from '../../ui/modal/modal.component';
import {
  LocationMapPickerComponent,
  MapCoordinates,
} from '../location-map-picker/location-map-picker.component';

/**
 * LocationTableComponent (Presentation Component)
 *
 * Displays a responsive table of monitoring locations with ID, description, device count, coordinates,
 * and edit/delete action buttons. Includes inline modal dialogs for editing location details (description and
 * coordinates via interactive map picker) and confirming deletion.
 *
 * Features:
 * - Table with five columns: ID, description (with location icon badge), device count, coordinates (formatted code block), actions
 * - Responsive overflow-x-auto on mobile, full-width on desktop
 * - Device count per location: lazy-loaded from DeviceService.getAll() and cached in devicesCount map
 * - Edit modal: uses LocationMapPickerComponent for interactive coordinate adjustment, FormGroup for reactive validation
 * - Edit form: description field (3-255 chars), latitude, longitude via map picker
 * - Description validation: required, minLength 3, maxLength 255
 * - Delete modal: confirmation dialog with danger-colored button, prevents accidental deletion
 * - API calls: location.update() and location.delete() with success/error toast feedback
 * - Output event: locationChanged EventEmitter<void> fired after successful edit or delete
 * - Inputs: locations Location[] array, tracks by location object (angular default)
 * - Coordinate formatting: 4 decimals for display, 6 decimals for form values
 * - Loading state: editSaving and deleteSaving flags disable buttons during operations
 * - Dark mode support via dark: Tailwind prefix
 * - OnPush change detection with markForCheck after async operations
 *
 * @selector app-location-table
 * @standalone true
 * @imports ReactiveFormsModule, ModalComponent, LocationMapPickerComponent
 * @example
 * <app-location-table
 *   [locations]="locations$ | async"
 *   (locationChanged)="onRefresh()"
 * />
 */
@Component({
  selector: 'app-location-table',
  standalone: true,
  imports: [ReactiveFormsModule, ModalComponent, LocationMapPickerComponent],
  templateUrl: './location-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocationTableComponent {
  @Input() locations: Location[] = [];
  @Output() locationChanged = new EventEmitter<void>();

  devicesCount: Record<number, number> = {};

  editingLocation: Location | null = null;
  editForm: FormGroup;
  editSaving = false;

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

    this.deviceService.getAll().subscribe((devices: Device[]) => {
      const map: Record<number, number> = {};
      devices.forEach((d: Device) => {
        const locId = d.location?.id;
        if (!locId) return;
        map[locId] = (map[locId] || 0) + 1;
      });
      this.devicesCount = map;
      this.cdr.markForCheck();
    });
  }

  /**
   * Formats latitude and longitude coordinates to 4 decimal places for display in table.
   * @param {number} latitude - Latitude coordinate value
   * @param {number} longitude - Longitude coordinate value
   * @returns {string} Formatted coordinate string as "lat.xxxx, lng.xxxx"
   */
  formatCoordinates(latitude: number, longitude: number): string {
    return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  }

  /**
   * Opens edit modal dialog and populates form with current location data.
   * Patches form values with location description, latitude, and longitude.
   * Resets editSaving flag to false. Sets editingLocation reference for modal binding.
   * @param {Location} location - Location object to edit
   * @returns {void}
   */
  openEdit(location: Location): void {
    this.editingLocation = location;
    this.editForm.patchValue({
      description: location.description ?? '',
      latitude: location.latitude,
      longitude: location.longitude,
    });
    this.editSaving = false;
  }

  /**
   * Closes edit modal dialog and clears all form state.
   * Clears editingLocation reference and resets form to pristine state.
   * @returns {void}
   */
  closeEdit(): void {
    this.editingLocation = null;
    this.editForm.reset();
  }

  /**
   * Updates form latitude and longitude fields when coordinates are selected from map picker.
   * Formats coordinates to 6 decimal places and patches form values.
   * Called from LocationMapPickerComponent (coordinatesSelected) output event.
   * @param {MapCoordinates} coords - Coordinate object with latitude and longitude properties
   * @returns {void}
   */
  onEditMapCoords(coords: MapCoordinates): void {
    this.editForm.patchValue({
      latitude: coords.latitude.toFixed(6),
      longitude: coords.longitude.toFixed(6),
    });
  }

  /**
   * Submits location edit to backend via LocationService.update().
   * Validates form first, constructs updated Location object from form values,
   * sets editSaving flag, handles success/error responses, and emits locationChanged event.
   * Closes modal on success and displays toast notifications.
   * @returns {void}
   */
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
        this.toastService.success(`Location "${updated.description}" updated`, 'Success');
        this.locationChanged.emit();
        this.cdr.markForCheck();
      },
      error: () => {
        this.editSaving = false;
        this.toastService.error('Error updating location', 'Error');
        this.cdr.markForCheck();
      },
    });
  }

  /**
   * Opens delete confirmation modal dialog for specified location.
   * Sets deleteTarget reference for modal binding and resets deleteSaving flag.
   * @param {Location} location - Location object to delete
   * @returns {void}
   */
  openDelete(location: Location): void {
    this.deleteTarget = location;
    this.deleteSaving = false;
  }

  /**
   * Closes delete confirmation modal dialog and resets deletion state.
   * Clears deleteTarget reference and deleteSaving flag.
   * @returns {void}
   */
  closeDelete(): void {
    this.deleteTarget = null;
    this.deleteSaving = false;
  }

  /**
   * Submits location deletion to backend via LocationService.delete().
   * Validates deleteTarget existence, sets deleteSaving flag, handles success/error responses,
   * emits locationChanged event on success, and displays toast notifications.
   * Displays error toast if location has assigned devices.
   * @returns {void}
   */
  confirmDelete(): void {
    if (!this.deleteTarget) return;
    this.deleteSaving = true;
    const target = this.deleteTarget;
    this.locationService.delete(target.id).subscribe({
      next: () => {
        this.deleteSaving = false;
        this.closeDelete();
        this.toastService.success(
          `Location "${target.description ?? '#' + target.id}" deleted`,
          'Success',
        );
        this.locationChanged.emit();
        this.cdr.markForCheck();
      },
      error: () => {
        this.deleteSaving = false;
        this.toastService.error('Unable to delete. It may have assigned devices.', 'Error');
        this.cdr.markForCheck();
      },
    });
  }
}
