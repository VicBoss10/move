import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, Subject, of } from 'rxjs';
import { catchError, finalize, takeUntil, map } from 'rxjs/operators';
import { LocationFiltersComponent, LocationSearchCriteria } from '../location-filters/location-filters.component';
import { LocationService } from '../../../../core/services/location.service';

/**
 * Location interface for map display
 */
export interface MapLocation {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  description: string;
  status: 'active' | 'inactive' | 'warning';
  vehiclesDetected: number;
  zone: string;
}

/**
 * LocationMapViewComponent
 * 
 * Componente que visualiza ubicaciones en un mapa interactivo SVG.
 * Proporciona filtros, selección de ubicaciones y vista de detalles.
 * 
 * Características:
 * - Mapa SVG interactivo
 * - Marcadores clicables
 * - Panel lateral con detalles
 * - Integración con LocationFiltersComponent
 *
 * @selector app-location-map-view
 * @standalone true
 */
@Component({
  selector: 'app-location-map-view',
  standalone: true,
  imports: [CommonModule, LocationFiltersComponent],
  templateUrl: './location-map-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocationMapViewComponent implements OnInit, OnDestroy {
  /**
   * Subject para cleanup de suscripciones
   */
  private destroy$ = new Subject<void>();

  /**
   * Observable stream de ubicaciones desde el backend
   */
  locations$: Observable<MapLocation[]> = of([]);

  /**
   * Array de ubicaciones para binding en el template
   */
  locations: MapLocation[] = [];

  /**
   * Estado de carga
   */
  isLoading = false;

  /**
   * Mensaje de error
   */
  errorMessage: string | null = null;

  /**
   * Ubicación seleccionada en el mapa
   */
  selectedLocation: MapLocation | null = null;

  /**
   * Escala del zoom (1-20)
   */
  zoomLevel = 12;

  /**
   * Centro del mapa (Medellín)
   */
  mapCenter = { lat: 6.2226, lng: -75.5558 };

  /**
   * Filtros actuales aplicados
   */
  activeFilters: LocationSearchCriteria | null = null;

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
      map((backendLocations) => this.transformToMapLocations(backendLocations)),
      finalize(() => {
        this.isLoading = false;
        this.cdr.markForCheck();
      }),
      catchError((error) => {
        console.error('Error loading locations:', error);
        this.errorMessage = 'Error al cargar ubicaciones del mapa';
        return of([]);
      }),
      takeUntil(this.destroy$)
    );

    this.locations$
      .pipe(takeUntil(this.destroy$))
      .subscribe((locations) => {
        this.locations = locations;
        this.cdr.markForCheck();
      });
  }

  /**
   * Transforma Location del backend a MapLocation para el mapa
   * @private
   * @param {any[]} backendLocations - Array de ubicaciones desde el backend
   * @returns {MapLocation[]} Array transformado
   */
  private transformToMapLocations(backendLocations: any[]): MapLocation[] {
    return backendLocations.map((loc, index) => ({
      id: loc.id,
      name: loc.description || `Ubicación ${loc.id}`,
      latitude: loc.latitude,
      longitude: loc.length, // length = longitude en el modelo
      description: loc.description || 'Punto de monitoreo',
      status: 'active' as const,
      vehiclesDetected: Math.floor(Math.random() * 350), // TODO: Obtener del backend
      zone: this.getZoneFromLatLng(loc.latitude, loc.length),
    }));
  }

  /**
   * Determina la zona según coordenadas GPS aproximadas
   * @private
   * @param {number} lat - Latitud
   * @param {number} lng - Longitud
   * @returns {string} Nombre de la zona
   */
  private getZoneFromLatLng(lat: number, lng: number): string {
    if (lat > 6.25) return 'Zona Norte';
    if (lat < 6.15) return 'Zona Conurbana';
    if (lng < -75.55) return 'Zona Occidental';
    return 'Centro';
  }

  /**
   * Maneja cambios en los filtros y busca ubicaciones según criterios
   * @param {LocationSearchCriteria} criteria - Criterios de búsqueda desde location-filters
   */
  onFiltersChanged(criteria: LocationSearchCriteria): void {
    this.activeFilters = criteria;

    if (!criteria || Object.keys(criteria).length === 0) {
      // Si filtros vacíos, recargar todas las ubicaciones
      this.loadLocations();
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    this.locationService.search(criteria)
      .pipe(
        map((backendLocations) => this.transformToMapLocations(backendLocations)),
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
        this.cdr.markForCheck();
      });
  }

  /**
   * Selecciona una ubicación en el mapa
   * @param location - Ubicación a seleccionar
   */
  selectLocation(location: MapLocation): void {
    this.selectedLocation = location;
  }

  /**
   * Deselecciona la ubicación actual
   */
  deselectLocation(): void {
    this.selectedLocation = null;
  }

  /**
   * Obtiene el color del marcador según el estado
   * @param status - Estado de la ubicación
   * @returns Clase de color de Tailwind
   */
  getStatusColor(status: string): string {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'inactive':
        return 'bg-gray-400';
      case 'warning':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  }

  /**
   * Obtiene el color del ícono de estado
   * @param status - Estado de la ubicación
   * @returns Clase de color
   */
  getStatusTextColor(status: string): string {
    switch (status) {
      case 'active':
        return 'text-green-600 dark:text-green-400';
      case 'inactive':
        return 'text-gray-600 dark:text-gray-400';
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400';
      default:
        return 'text-gray-600';
    }
  }

  /**
   * Obtiene la etiqueta de estado
   * @param status - Estado de la ubicación
   * @returns Etiqueta legible
   */
  getStatusLabel(status: string): string {
    switch (status) {
      case 'active':
        return 'Activa';
      case 'inactive':
        return 'Inactiva';
      case 'warning':
        return 'Advertencia';
      default:
        return 'Desconocido';
    }
  }

  /**
   * Calcula la posición en píxeles relativa al contenedor del mapa
   * @param latitude - Latitud
   * @param longitude - Longitud
   * @returns Objeto con propiedades top y left en porcentaje
   */
  getMarkerPosition(latitude: number, longitude: number): { top: string; left: string } {
    // Rango aproximado de Medellín
    const minLat = 6.1;
    const maxLat = 6.35;
    const minLng = -75.65;
    const maxLng = -75.45;

    const top = ((maxLat - latitude) / (maxLat - minLat)) * 100;
    const left = ((longitude - minLng) / (maxLng - minLng)) * 100;

    return {
      top: Math.max(0, Math.min(100, top)) + '%',
      left: Math.max(0, Math.min(100, left)) + '%',
    };
  }
}
