import { Component, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';
import { VehicleSearchCriteria } from '../../../../core/models/vehicle.model';
import { DeviceService } from '../../../../core/services/device.service';
import { Device } from '../../../../core/models/device.model';

/**
 * VehicleFiltersComponent
 *
 * Componente de filtros para la página de vehículos detectados.
 * Permite filtrar por tipo de vehículo, ubicación y rango de fechas.
 * Emite VehicleSearchCriteria cuando se aplican los filtros.
 *
 * Características:
 * - Filtro por tipo (CAR, BUS, MOTORCYCLE, BICYCLE, TRUCK)
 * - Filtro por ubicación
 * - Filtro por rango de fechas
 * - Emite eventos cuando se aplican o limpian filtros
 *
 * @selector app-vehicle-filters
 * @standalone true
 * @imports CommonModule, FormsModule
 * @returns Panel de filtros para vehículos
 *
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
export class VehicleFiltersComponent {
  /**
   * Observable stream de dispositivos desde el backend
   * Cargado al inicializar el componente
   */
  devices$!: Observable<Device[]>;

  /**
   * Observable con ubicaciones únicas y sus dispositivos asociados
   */
  locations$!: Observable<{ locationId: number; label: string; deviceIds: number[] }[]>;

  /**
   * Evento que emite cuando cambian los filtros
   * Emite VehicleSearchCriteria
   */
  @Output() filterChange = new EventEmitter<VehicleSearchCriteria | null>();

  /**
   * Tipos de vehículos disponibles (del Enum del backend)
   * @type {string[]}
   */
  vehicleTypes = [
    { value: 'CAR', label: 'Auto' },
    { value: 'BUS', label: 'Bus' },
    { value: 'MOTORCYCLE', label: 'Moto' },
    { value: 'BICYCLE', label: 'Bicicleta' },
    { value: 'TRUCK', label: 'Camión' },
  ];

  /**
   * Filtros actuales
   */
  selectedType: string = '';
  selectedLocationId: string = '';
  startDate: string = '';
  endDate: string = '';

  /**
   * Mapeo de locationId → deviceIds
   */
  private locationDeviceMap = new Map<number, number[]>();

  /**
   * Constructor e inyección de dependencias
   */
  constructor(private deviceService: DeviceService) {
    this.initializeDevices();
  }

  /**
   * Inicializa los dispositivos desde el backend y agrupa por ubicación
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
            const label =
              device.location.description || `Ubicación ${locId}`;
            locationMap.set(locId, { label, deviceIds: [] });
          }
          locationMap.get(locId)!.deviceIds.push(device.id);
        }

        // Guardar mapeo para usar en applyFilters
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
   * Aplica los filtros seleccionados
   * @returns {void}
   */
  applyFilters(): void {
    const criteria: VehicleSearchCriteria = {};

    if (this.selectedType) {
      criteria.type = this.selectedType as VehicleSearchCriteria['type'];
    }

    if (this.selectedLocationId) {
      const parsedLocationId = Number(this.selectedLocationId);
      if (!isNaN(parsedLocationId) && this.locationDeviceMap.has(parsedLocationId)) {
        // Enviar todos los deviceIds de esa ubicación
        criteria.deviceIds = this.locationDeviceMap.get(parsedLocationId);
      }
    }

    if (this.startDate) {
      criteria.start = new Date(this.startDate);
    }
    if (this.endDate) {
      const end = new Date(this.endDate);
      end.setHours(23, 59, 59, 999);
      criteria.end = end;
    }

    this.filterChange.emit(criteria);
  }

  /**
   * Limpia todos los filtros
   * @returns {void}
   */
  clearFilters(): void {
    this.selectedType = '';
    this.selectedLocationId = '';
    this.startDate = '';
    this.endDate = '';
    this.filterChange.emit(null);
  }
}
