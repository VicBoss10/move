import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VehicleTableComponent } from '../../../shared/components/vehicles/vehicle-table/vehicle-table.component';
import { VehicleFiltersComponent } from '../../../shared/components/vehicles/vehicle-filters/vehicle-filters.component';
import { VehicleDetectedService } from '../../../core/services/vehicle-detected.service';
import { VehicleDetected, VehicleSearchCriteria } from '../../../core/models/vehicle.model';
import { Observable, of, Subject } from 'rxjs';
import { catchError, finalize, takeUntil, map } from 'rxjs/operators';

@Component({
  selector: 'app-vehicles-detected',
  standalone: true,
  imports: [CommonModule, VehicleTableComponent, VehicleFiltersComponent],
  templateUrl: './vehicles-detected.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VehiclesDetectedComponent implements OnInit, OnDestroy {
  /**
   * Subject para cleanup de suscripciones
   */
  private destroy$ = new Subject<void>();

  /**
   * Observable que emite los vehículos detectados
   */
  vehicles$: Observable<VehicleDetected[]> = of([]);

  /**
   * Array de vehículos actuales para la vista
   */
  filteredVehicles: VehicleDetected[] = [];

  /**
   * Flag de carga
   */
  isLoading: boolean = false;

  /**
   * Mensaje de error si ocurre
   */
  errorMessage: string = '';

  constructor(
    private vehicleDetectedService: VehicleDetectedService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Cargar todos los vehículos inicialmente
    this.loadVehicles();
  }

  /**
   * Carga vehículos desde el servicio backend
   */
  private loadVehicles(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.vehicles$ = this.vehicleDetectedService.getAll()
      .pipe(
        takeUntil(this.destroy$),
        map(data => {
          // Si data es un array, usarlo normalmente
          if (Array.isArray(data)) {
            return data;
          }
          // Si no es array, retornar array vacío
          console.warn('Backend retornó respuesta no-JSON:', data);
          return [];
        }),
        catchError((error) => {
          console.error('Error cargando vehículos:', error);
          this.errorMessage = 'Error al cargar los vehículos';
          return of([]);
        }),
        finalize(() => {
          this.isLoading = false;
        })
      );

    // Suscribirse para actualizar la vista
    this.vehicles$.pipe(takeUntil(this.destroy$)).subscribe((data) => {
      this.filteredVehicles = data.sort((a, b) => {
        const dateA = new Date(b.timestamp).getTime();
        const dateB = new Date(a.timestamp).getTime();
        return dateA - dateB; // Más recientes primero
      });
      this.cdr.markForCheck();
    });
  }

  /**
   * Maneja el cambio de filtros desde VehicleFiltersComponent
   * @param criteria - Criterios de búsqueda
   */
  handleFilterChange(criteria: VehicleSearchCriteria): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.vehicles$ = this.vehicleDetectedService.search(criteria)
      .pipe(
        takeUntil(this.destroy$),
        map(data => {
          if (Array.isArray(data)) {
            return data;
          }
          console.warn('Backend retornó respuesta no-JSON:', data);
          return [];
        }),
        catchError((error) => {
          console.error('Error buscando vehículos:', error);
          this.errorMessage = 'Error al buscar vehículos';
          return of([]);
        }),
        finalize(() => {
          this.isLoading = false;
        })
      );

    // Suscribirse para actualizar la vista
    this.vehicles$.pipe(takeUntil(this.destroy$)).subscribe((data) => {
      this.filteredVehicles = data.sort((a, b) => {
        const dateA = new Date(b.timestamp).getTime();
        const dateB = new Date(a.timestamp).getTime();
        return dateA - dateB;
      });
      this.cdr.markForCheck();
    });
  }

  /**
   * Cleanup de suscripciones al destruir el componente
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
