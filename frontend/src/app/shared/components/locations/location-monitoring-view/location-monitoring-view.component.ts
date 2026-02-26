import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, Subject, of } from 'rxjs';
import { catchError, finalize, takeUntil } from 'rxjs/operators';
import { LocationTableComponent } from '../location-table/location-table.component';
import { LocationFiltersComponent, LocationSearchCriteria } from '../location-filters/location-filters.component';
import { LocationService } from '../../../../core/services/location.service';
import { Location } from '../../../../core/models/location.model';

/**
 * LocationMonitoringViewComponent
 *
 * Componente que muestra los puntos de monitoreo (ubicaciones)
 * disponibles en el sistema con información geográfica.
 * Carga datos en tiempo real desde el backend.
 *
 * Características:
 * - Ubicaciones desde el backend (no hardcodeadas)
 * - Información de coordenadas GPS
 * - Filtros por ubicación
 * - Descripción de cada ubicación
 * - Panel de información del sistema en tiempo real
 *
 * @selector app-location-monitoring-view
 * @standalone true
 */
@Component({
  selector: 'app-location-monitoring-view',
  standalone: true,
  imports: [CommonModule, LocationTableComponent, LocationFiltersComponent],
  templateUrl: './location-monitoring-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocationMonitoringViewComponent implements OnInit, OnDestroy {
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
  locations: Location[] = [];

  /**
   * Información general del sistema (calculada dinámicamente)
   */
  systemInfo = {
    totalLocations: 0,
    activeLocations: 0,
    lastUpdate: new Date().toLocaleString('es-ES'),
  };

  /**
   * Estado de carga
   */
  isLoading = false;

  /**
   * Mensaje de error si hay
   */
  errorMessage: string | null = null;

  /**
   * Constructor e inyección de dependencias
   */
  constructor(
    private locationService: LocationService,
    private cdr: ChangeDetectorRef
  ) {}

  /**
   * Hook del ciclo de vida: Carga ubicaciones al inicializar
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
   * Carga las ubicaciones desde el backend
   * @private
   * @returns {void}
   */
  private loadLocations(): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.locations$ = this.locationService.getAll().pipe(
      finalize(() => {
        this.isLoading = false;
        this.cdr.markForCheck();
      }),
      catchError((error) => {
        console.error('Error loading locations:', error);
        this.errorMessage = 'Error al cargar las ubicaciones. Usando datos offline.';
        return of(this.locations);
      }),
      takeUntil(this.destroy$)
    );

    this.locations$
      .pipe(takeUntil(this.destroy$))
      .subscribe((locations) => {
        this.locations = locations;
        this.updateSystemInfo();
        this.cdr.markForCheck();
      });
  }

  /**
   * Actualiza la información del sistema basada en datos reales
   * @private
   * @returns {void}
   */
  private updateSystemInfo(): void {
    this.systemInfo.totalLocations = this.locations.length;
    this.systemInfo.activeLocations = this.locations.length;
    this.systemInfo.lastUpdate = new Date().toLocaleString('es-ES');
  }

  /**
   * Maneja cambios en los filtros y busca ubicaciones según criterios
   * @param {LocationSearchCriteria} criteria - Criterios de búsqueda desde location-filters
   */
  onFiltersChanged(criteria: LocationSearchCriteria): void {
    if (!criteria || Object.keys(criteria).length === 0) {
      // Si filtros vacíos, recargar todas las ubicaciones
      this.loadLocations();
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    this.locationService.search(criteria)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.markForCheck();
        }),
        catchError((error) => {
          console.error('Error searching locations:', error);
          this.errorMessage = 'Error en la búsqueda de ubicaciones';
          return of([]);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((locations) => {
        this.locations = locations;
        this.updateSystemInfo();
        this.cdr.markForCheck();
      });
  }
}
