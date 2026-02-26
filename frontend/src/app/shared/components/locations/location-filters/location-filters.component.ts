import { Component, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Location } from '../../../../core/models/location.model';
import { LocationService } from '../../../../core/services/location.service';

/**
 * Criterios de búsqueda para ubicaciones
 * Alineado con LocationSearchCriteria del backend
 * @interface LocationSearchCriteria
 * @property {string} description - Descripción o nombre de la ubicación
 * @property {string} keyword - Palabra clave para búsqueda
 * @property {number} latitude - Latitud para búsqueda geográfica
 * @property {number} longitude - Longitud para búsqueda geográfica
 * @property {number} radiusKm - Radio de búsqueda en kilómetros
 */
export interface LocationSearchCriteria {
  description?: string;
  keyword?: string;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
}

/**
 * LocationFiltersComponent
 *
 * Componente que proporciona filtros para búsqueda de ubicaciones.
 * Autocomplete de descripción de ubicaciones registradas + campos adicionales opcionales.
 *
 * Características:
 * - Autocomplete inteligente de descripción de ubicaciones
 * - Lista desplegable de ubicaciones registradas
 * - Filtro por palabra clave (opcional)
 * - Filtro por latitud/longitud (opcional)
 * - Debounce en búsqueda de autocomplete
 * - Botones para aplicar y limpiar filtros
 * - Dark mode support
 *
 * @selector app-location-filters
 * @standalone true
 * @imports CommonModule, FormsModule
 * @returns Formulario de filtros
 *
 * @example
 * <app-location-filters (filtersChanged)="onFiltersChanged($event)" />
 */
@Component({
  selector: 'app-location-filters',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './location-filters.component.html',
})
export class LocationFiltersComponent implements OnInit, OnDestroy {
  /**
   * Todas las ubicaciones registradas
   */
  allLocations: Location[] = [];

  /**
   * Ubicaciones filtradas para el autocomplete
   */
  filteredLocations: Location[] = [];

  /**
   * Muestra/oculta el dropdown de autocomplete
   */
  showDropdown = false;

  /**
   * Criterios de filtro/búsqueda actuales
   * @type {LocationSearchCriteria}
   */
  filters: LocationSearchCriteria = {
    description: '',
    keyword: '',
    latitude: undefined,
    longitude: undefined,
  };

  /**
   * Subject para cleanup de suscripciones
   */
  private destroy$ = new Subject<void>();

  /**
   * Subject para debounce en búsqueda de descripción
   */
  private descriptionSearch$ = new Subject<string>();

  /**
   * Evento que emite los criterios de búsqueda cuando el usuario aplica filtros
   * @type {EventEmitter<LocationSearchCriteria>}
   */
  @Output() filtersChanged = new EventEmitter<LocationSearchCriteria>();

  constructor(private locationService: LocationService) {}

  /**
   * Hook del ciclo de vida: Carga ubicaciones y configura autocomplete
   */
  ngOnInit(): void {
    // Cargar todas las ubicaciones disponibles
    this.locationService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe(locations => {
        this.allLocations = locations;
        this.filteredLocations = locations;
      });

    // Configurar debounce para búsqueda de descripción
    this.descriptionSearch$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(searchTerm => {
        this.filterLocations(searchTerm);
      });
  }

  /**
   * Hook del ciclo de vida: Limpia suscripciones
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Filtra ubicaciones según el término de búsqueda
   * @param searchTerm - Término de búsqueda
   */
  private filterLocations(searchTerm: string): void {
    if (!searchTerm.trim()) {
      this.filteredLocations = this.allLocations;
      return;
    }

    const term = searchTerm.toLowerCase();
    this.filteredLocations = this.allLocations.filter(loc =>
      (loc.description || '').toLowerCase().includes(term)
    );
  }

  /**
   * Maneja cambios en el campo de descripción con debounce
   * @param value - Valor del campo
   */
  onDescriptionChange(value: string): void {
    this.filters.description = value;
    // Cerrar dropdown si el campo está vacío
    if (!value.trim()) {
      this.showDropdown = false;
    } else {
      this.showDropdown = true;
    }
    this.descriptionSearch$.next(value);
  }

  /**
   * Cierra el dropdown cuando el input pierde el foco
   */
  onInputBlur(): void {
    // Esperar un poco para permitir clicks en el dropdown
    setTimeout(() => {
      this.showDropdown = false;
    }, 200);
  }

  /**
   * Selecciona una ubicación del dropdown
   * @param location - Ubicación seleccionada
   */
  selectLocation(location: Location): void {
    this.filters.description = location.description;
    this.showDropdown = false;
    this.filteredLocations = [location];
  }

  /**
   * Cierra el dropdown
   */
  closeDropdown(): void {
    this.showDropdown = false;
  }

  /**
   * Aplica los filtros actuales, emitiendo solo los campos que tienen valor
   */
  applyFilters(): void {
    // Crear copia sin campos vacíos para el backend
    const cleanedFilters: LocationSearchCriteria = {};
    
    if (this.filters.description?.trim()) cleanedFilters.description = this.filters.description;
    if (this.filters.keyword?.trim()) cleanedFilters.keyword = this.filters.keyword;
    if (this.filters.latitude !== undefined && this.filters.latitude !== null) cleanedFilters.latitude = this.filters.latitude;
    if (this.filters.longitude !== undefined && this.filters.longitude !== null) cleanedFilters.longitude = this.filters.longitude;
    
    this.filtersChanged.emit(cleanedFilters);
  }

  /**
   * Limpia todos los filtros a valores por defecto
   */
  clearFilters(): void {
    this.filters = {
      description: '',
      keyword: '',
      latitude: undefined,
      longitude: undefined,
    };
    this.filteredLocations = this.allLocations;
    this.showDropdown = false;
    this.applyFilters();
  }
}
