import { Component, Output, EventEmitter, ChangeDetectionStrategy, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';
import { VehicleSearchCriteria } from '../../../../core/models/vehicle.model';
import { DeviceService } from '../../../../core/services/device.service';
import { Device } from '../../../../core/models/device.model';
import { VehicleDetectedService } from '../../../../core/services/vehicle-detected.service';

/**
 * VehicleFiltersComponent (Smart Component)
 *
 * Provides interactive filter panel for vehicle detection search with multiple criteria options.
 * Loads device locations dynamically from backend and emits filter changes to parent component.
 * Supports filtering by vehicle type, location, and date range with apply/clear actions.
 *
 * Features:
 * - Dropdown selector for vehicle types: CAR, BUS, MOTORCYCLE, BICYCLE, TRUCK
 * - Location selector populated from unique device locations
 * - Date range pickers with input validation (start date ≤ end date)
 * - Apply and clear button actions with event emission
 * - Maps location IDs to device IDs for backend filter queries
 * - Reactive data from DeviceService with error fallback
 * - Responsive grid layout: 1 column mobile, 2 columns tablet, 4 columns desktop
 * - Dark mode support with Tailwind CSS
 * - OnPush change detection
 *
 * @selector app-vehicle-filters
 * @standalone true
 * @imports CommonModule, FormsModule
 * @example
 * <app-vehicle-filters (filterChange)="handleFilterChange($event)" />
 */
@Component({
  selector: 'app-vehicle-filters',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './vehicle-filters.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VehicleFiltersComponent implements OnInit {
  /**
   * Observable stream of all registered devices with current state
   * @type {Observable<Device[]>}
   */
  devices$!: Observable<Device[]>;

  /**
   * Observable stream of unique locations aggregated from devices with associated device IDs
   * @type {Observable<{locationId: number; label: string; deviceIds: number[]}[]>}
   */
  locations$!: Observable<{ locationId: number; label: string; deviceIds: number[] }[]>;

  /**
   * Output event emitting filter criteria changes when filters are applied
   * @type {EventEmitter<VehicleSearchCriteria | null>}
   */
  @Output() filterChange = new EventEmitter<VehicleSearchCriteria | null>();

  /**
   * Available vehicle types for dropdown selector matching VehicleType enum from backend
   * @type {Array<{value: string; label: string}>}
   */
  vehicleTypes = [
    { value: 'CAR', label: 'Auto' },
    { value: 'BUS', label: 'Bus' },
    { value: 'MOTORCYCLE', label: 'Moto' },
    { value: 'BICYCLE', label: 'Bicicleta' },
    { value: 'TRUCK', label: 'Camión' },
  ];

  /**
   * Currently selected vehicle type filter value (empty string = all types)
   * @type {string}
   */
  selectedType: string = '';

  /**
   * Currently selected location ID filter value (empty string = all locations)
   * @type {string}
   */
  selectedLocationId: string = '';

  /**
   * Start date filter in ISO format (YYYY-MM-DD), empty if not set
   * @type {string}
   */
  startDate: string = '';

  /**
   * End date filter in ISO format (YYYY-MM-DD), empty if not set
   * @type {string}
   */
  endDate: string = '';

  /**
   * Minimum selectable date (first available vehicle detection) in YYYY-MM-DD format.
   * @type {string}
   */
  minDate: string = '';

  /**
   * Maximum selectable date (last available vehicle detection) in YYYY-MM-DD format.
   * @type {string}
   */
  maxDate: string = '';

  /**
   * Map of locationId to array of associated device IDs for filter queries
   * @type {Map<number, number[]>}
   * @private
   */
  private locationDeviceMap = new Map<number, number[]>();

  /**
   * Initializes component with service dependencies and loads device/location data.
   * @param {DeviceService} deviceService - Service for fetching device list
   * @param {VehicleDetectedService} vehicleService - Service for fetching vehicle detection date bounds
   * @param {ChangeDetectorRef} cdr - Change detection reference for manual triggering in OnPush mode
   */
  constructor(
    private deviceService: DeviceService,
    private vehicleService: VehicleDetectedService,
    private cdr: ChangeDetectorRef,
  ) {
    this.initializeDevices();
  }

  ngOnInit(): void {
    this.loadDateBounds();
  }

  /**
   * Initializes devices and locations streams from backend, aggregating unique locations
   * and their associated device IDs for filter dropdown population.
   * @private
   */
  private initializeDevices(): void {
    this.devices$ = this.deviceService.getAll().pipe(
      catchError((error) => {
        console.error('Error loading devices:', error);
        return of([]);
      }),
      shareReplay(1),
    );

    this.locations$ = this.devices$.pipe(
      map((devices: Device[]) => {
        const locationMap = new Map<number, { label: string; deviceIds: number[] }>();

        for (const device of devices) {
          const locId = device.location.id;
          if (!locationMap.has(locId)) {
            const label = device.location.description || `Location ${locId}`;
            locationMap.set(locId, { label, deviceIds: [] });
          }
          locationMap.get(locId)!.deviceIds.push(device.id);
        }

        this.locationDeviceMap.clear();
        locationMap.forEach((value, key) => {
          this.locationDeviceMap.set(key, value.deviceIds);
        });

        return Array.from(locationMap.entries()).map(([locationId, { label, deviceIds }]) => ({
          locationId,
          label,
          deviceIds,
        }));
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
  }

  /**
   * Applies current filter selections and emits VehicleSearchCriteria with active filters.
   * Includes vehicle type, location device IDs, and date range in emitted criteria.
   */
  applyFilters(): void {
    const criteria: VehicleSearchCriteria = {};

    if (this.selectedType) {
      criteria.type = this.selectedType as VehicleSearchCriteria['type'];
    }

    if (this.selectedLocationId) {
      const parsedLocationId = Number(this.selectedLocationId);
      if (!isNaN(parsedLocationId) && this.locationDeviceMap.has(parsedLocationId)) {
        criteria.deviceIds = this.locationDeviceMap.get(parsedLocationId);
      }
    }

    if (this.startDate) {
      criteria.start = new Date(this.startDate + 'T00:00:00');
    }
    if (this.endDate) {
      criteria.end = new Date(this.endDate + 'T23:59:59');
    }

    this.filterChange.emit(criteria);
  }

  /**
   * Clears all filter selections and emits null to reset parent component's filter state.
   */
  clearFilters(): void {
    this.selectedType = '';
    this.selectedLocationId = '';
    this.startDate = '';
    this.endDate = '';
    this.filterChange.emit(null);
  }

  /**
   * Loads first and last vehicle detection record timestamps to constrain date picker min/max.
   * Silently fails on error (no message if no records exist).
   * @private
   */
  private loadDateBounds(): void {
    this.vehicleService.getFirstRecord().subscribe({
      next: (r) => {
        this.minDate = this.toDateString(r.timestamp);
        this.cdr.markForCheck();
      },
      error: () => {},
    });
    this.vehicleService.getLastRecord().subscribe({
      next: (r) => {
        this.maxDate = this.toDateString(r.timestamp);
        this.cdr.markForCheck();
      },
      error: () => {},
    });
  }

  /**
   * Converts timestamp to ISO 8601 date string (YYYY-MM-DD) for date input binding.
   * @param {string | number | Date | null | undefined} timestamp - Timestamp to convert
   * @returns {string} ISO date string or empty string if null
   * @private
   */
  private toDateString(timestamp: string | number | Date | null | undefined): string {
    if (!timestamp) return '';
    const d = new Date(timestamp);
    return d.toISOString().split('T')[0];
  }
}
