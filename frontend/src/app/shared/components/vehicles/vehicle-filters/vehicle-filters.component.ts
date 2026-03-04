import { Component, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';
import { VehicleSearchCriteria } from '../../../../core/models/vehicle.model';
import { LocationService } from '../../../../core/services/location.service';
import { Location } from '../../../../core/models/location.model';

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
  locations$!: Observable<Location[]>;

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
  selectedLocationId: number | null = null;
  startDate: string = '';
  endDate: string = '';

  /**
   * Constructor e inyección de dependencias
   */
  constructor(private locationService: LocationService) {
    this.initializeLocations();
  }

  /**
   * Inicializa las ubicaciones desde el backend
   * @private
   */
  private initializeLocations(): void {
    this.locations$ = this.locationService.getAll().pipe(
      catchError((error) => {
        console.error('Error loading locations:', error);
        return of([]);
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
    if (this.selectedLocationId) {
      criteria.locationId = this.selectedLocationId;
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
    this.selectedLocationId = null;
    this.startDate = '';
    this.endDate = '';
    this.filterChange.emit({});
  }
}
