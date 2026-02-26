import { Component, OnInit, OnDestroy, Output, EventEmitter, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, Subject, of } from 'rxjs';
import { catchError, finalize, takeUntil } from 'rxjs/operators';
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
export class VehicleFiltersComponent implements OnInit, OnDestroy {
  /**
   * Subject para cleanup de suscripciones
   */
  private destroy$ = new Subject<void>();

  /**
   * Observable stream de ubicaciones desde el backend
   */
  locations$: Observable<Location[]> = of([]);

  /**
   * Array de ubicaciones para binding en el template
   */
  loadedLocations: Location[] = [];

  /**
   * Estado de carga de ubicaciones
   */
  isLoadingLocations = false;

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
  constructor(
    private locationService: LocationService,
    private cdr: ChangeDetectorRef
  ) {}

  /**
   * Carga las ubicaciones desde el backend
   * @private
   * @returns {void}
   */
  private loadLocations(): void {
    this.isLoadingLocations = true;
    this.locations$ = this.locationService.getAll().pipe(
      takeUntil(this.destroy$),
      finalize(() => {
        this.isLoadingLocations = false;
        this.cdr.markForCheck();
      }),
      catchError((error) => {
        console.error('Error loading locations:', error);
        return of([]);
      })
    );

    // Suscribirse al Observable para obtener los valores para el template
    this.locations$
      .pipe(takeUntil(this.destroy$))
      .subscribe((locations) => {
        this.loadedLocations = locations;
        this.cdr.markForCheck();
      });
  }

  /**
   * Hook del ciclo de vida: Carga las ubicaciones al inicializar
   */
  ngOnInit(): void {
    this.loadLocations();
  }

  /**
   * Hook del ciclo de vida: Limpia las suscripciones
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
