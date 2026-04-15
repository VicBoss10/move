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
   * Observable stream de ubicaciones desde el backend
   * Cargado al inicializar el componente
   */
  devices$!: Observable<Device[]>;
  /**
   * Observable con ubicaciones únicas derivadas de los dispositivos.
   * Cada entrada contiene el `deviceId` asociado (primer dispositivo encontrado)
   * y la `label` para mostrar en el select.
   */
  locations$!: Observable<{ deviceId: number; label: string }[]>;

  /**
   * Evento que emite cuando cambian los filtros
   * Emite VehicleSearchCriteria
   */
  @Output() filterChange = new EventEmitter<VehicleSearchCriteria>();

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
  selectedDeviceId: number | null = null;
  startDate: string = '';
  endDate: string = '';

  /**
   * Constructor e inyección de dependencias
   */
  constructor(private deviceService: DeviceService) {
    this.initializeDevices();
  }

  /**
   * Inicializa las ubicaciones desde el backend
   * @private
   */
  private initializeDevices(): void {
    this.devices$ = this.deviceService.getAll().pipe(
      catchError((error) => {
        console.error('Error loading devices:', error);
        return of([]);
      }),
      shareReplay(1)
    );
    // Derivar lista de ubicaciones únicas por location.id
    this.locations$ = this.devices$.pipe(
      map((devices) => {
        const map = new Map<number | string, { deviceId: number; label: string }>();
        for (const d of devices) {
          const locId = d.location?.id ?? `no_loc_${d.id}`;
          if (!map.has(locId)) {
            const label = d.location?.description || d.name || `Dispositivo ${d.id}`;
            map.set(locId, { deviceId: d.id, label });
          }
        }
        return Array.from(map.values());
      }),
      shareReplay(1)
    );
  }

  /**
   * Aplica los filtros seleccionados
   * @returns {void}
   */
  applyFilters(): void {
    const criteria: VehicleSearchCriteria = {};

    if (this.selectedType) {
      criteria.type = this.selectedType as any;
    }
    if (this.selectedDeviceId) {
      criteria.deviceId = this.selectedDeviceId;
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
    this.selectedDeviceId = null;
    this.startDate = '';
    this.endDate = '';
    this.filterChange.emit({});
  }
}
