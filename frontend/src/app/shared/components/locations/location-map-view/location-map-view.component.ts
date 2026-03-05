import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, of } from 'rxjs';
import { catchError, finalize, takeUntil, map } from 'rxjs/operators';
import { GoogleMapsModule, MapInfoWindow, MapAdvancedMarker } from '@angular/google-maps';
import { LocationFiltersComponent, LocationSearchCriteria } from '../location-filters/location-filters.component';
import { LocationService } from '../../../../core/services/location.service';
import { DEFAULT_MAP_CONFIG } from '../../../../core/config/google-maps.config';
import { GoogleMapsLoaderService } from '../../../../core/services/google-maps-loader.service';

/**
 * Ubicación transformada para visualización en el mapa de Google Maps
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
  markerContent: HTMLElement | null;
}

/**
 * LocationMapViewComponent
 *
 * Componente que visualiza ubicaciones de monitoreo en un mapa interactivo de Google Maps.
 * Reemplaza la visualización SVG anterior con Google Maps real.
 *
 * Características:
 * - Mapa interactivo de Google Maps
 * - Marcadores con colores según estado (activo/inactivo/advertencia)
 * - Info windows con detalles al hacer clic en marcadores
 * - Panel lateral con detalles de la ubicación seleccionada
 * - Integración con LocationFiltersComponent
 * - Fallback visual cuando la API no está disponible
 *
 * @selector app-location-map-view
 * @standalone true
 */
@Component({
  selector: 'app-location-map-view',
  standalone: true,
  imports: [CommonModule, GoogleMapsModule, LocationFiltersComponent],
  templateUrl: './location-map-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocationMapViewComponent implements OnInit, OnDestroy {
  /**
   * Subject para cleanup de suscripciones
   */
  private destroy$ = new Subject<void>();

  /**
   * Referencia al InfoWindow del mapa
   */
  @ViewChild(MapInfoWindow) infoWindow!: MapInfoWindow;

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
   * Centro del mapa (Medellín)
   */
  center: google.maps.LatLngLiteral = DEFAULT_MAP_CONFIG.center;

  /**
   * Nivel de zoom
   */
  zoom = DEFAULT_MAP_CONFIG.zoom;

  /**
   * Opciones del mapa
   */
  mapOptions: google.maps.MapOptions = {
    ...DEFAULT_MAP_CONFIG.options,
  };

  /**
   * Contenido del InfoWindow actual
   */
  infoWindowContent: MapLocation | null = null;

  /**
   * Filtros actuales aplicados
   */
  activeFilters: LocationSearchCriteria | null = null;

  /**
   * Indica si la API de Google Maps está disponible
   */
  isApiLoaded = false;

  /**
   * Constructor e inyección de dependencias
   */
  constructor(
    private locationService: LocationService,
    private mapsLoader: GoogleMapsLoaderService,
    private cdr: ChangeDetectorRef
  ) {}

  /**
   * Hook del ciclo de vida: Carga la API de Google Maps y las ubicaciones
   */
  ngOnInit(): void {
    this.mapsLoader.load().then((loaded) => {
      if (!loaded) {
        this.isApiLoaded = false;
        this.cdr.markForCheck();
        return;
      }

      // Mostrar el mapa inmediatamente con centro por defecto (Pasto)
      this.isApiLoaded = true;
      this.cdr.markForCheck();

      // Geolocalización en segundo plano — no bloquea el render del mapa
      this.mapsLoader.requestUserLocation().then((userLocation) => {
        if (userLocation && userLocation.accuracy < 1000) {
          this.center = { lat: userLocation.lat, lng: userLocation.lng };
          this.cdr.markForCheck();
        }
      });
    });
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

    this.locationService.getAll()
      .pipe(
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
      )
      .subscribe((locations) => {
        this.locations = locations;
        this.locations.forEach(loc => {
          loc.markerContent = this.createMarkerContent(loc.status);
        });
        this.fitMapToLocations();
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
    return backendLocations.map((loc) => ({
      id: loc.id,
      name: loc.description || `Ubicación ${loc.id}`,
      latitude: loc.latitude,
      longitude: loc.length, // length = longitude en el modelo
      description: loc.description || 'Punto de monitoreo',
      status: 'active' as const,
      vehiclesDetected: Math.floor(Math.random() * 350), // TODO: Obtener del backend
      zone: this.getZoneFromLatLng(loc.latitude, loc.length),
      markerContent: null,
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
   * Ajusta el centro del mapa para mostrar todas las ubicaciones
   * @private
   */
  private fitMapToLocations(): void {
    if (this.locations.length === 0) return;

    // Filtrar ubicaciones con coordenadas válidas
    const valid = this.locations.filter(loc =>
      loc.latitude != null && loc.longitude != null &&
      isFinite(loc.latitude) && isFinite(loc.longitude)
    );
    if (valid.length === 0) return;

    if (valid.length === 1) {
      this.center = {
        lat: valid[0].latitude,
        lng: valid[0].longitude,
      };
      this.zoom = 15;
      return;
    }

    const avgLat = valid.reduce((sum, loc) => sum + loc.latitude, 0) / valid.length;
    const avgLng = valid.reduce((sum, loc) => sum + loc.longitude, 0) / valid.length;
    this.center = { lat: avgLat, lng: avgLng };
  }

  /**
   * Maneja cambios en los filtros y busca ubicaciones según criterios
   * @param {LocationSearchCriteria} criteria - Criterios de búsqueda desde location-filters
   */
  onFiltersChanged(criteria: LocationSearchCriteria): void {
    this.activeFilters = criteria;

    if (!criteria || Object.keys(criteria).length === 0) {
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
        this.locations.forEach(loc => {
          loc.markerContent = this.createMarkerContent(loc.status);
        });
        this.fitMapToLocations();
        this.cdr.markForCheck();
      });
  }

  /**
   * Selecciona una ubicación (desde la lista o el marcador del mapa)
   * @param location - Ubicación a seleccionar
   */
  selectLocation(location: MapLocation): void {
    this.selectedLocation = location;
    this.center = { lat: location.latitude, lng: location.longitude };
    this.zoom = 16;
  }

  /**
   * Abre el InfoWindow al hacer clic en un marcador
   * @param marker - Referencia al MapAdvancedMarker
   * @param location - Datos de la ubicación
   */
  onMarkerClick(marker: MapAdvancedMarker, location: MapLocation): void {
    this.infoWindowContent = location;
    this.selectedLocation = location;
    if (this.infoWindow) {
      this.infoWindow.open(marker);
    }
    this.cdr.markForCheck();
  }

  /**
   * Deselecciona la ubicación actual
   */
  deselectLocation(): void {
    this.selectedLocation = null;
  }

  /**
   * Genera un ícono SVG personalizado para el marcador según el estado
   * @param status - Estado de la ubicación
   * @returns Configuración del ícono de Google Maps
   */
  /**
   * Crea un elemento HTML SVG para usar como contenido de un AdvancedMarker
   * @param status - Estado de la ubicación
   * @returns HTMLElement con el SVG del marcador
   */
  private createMarkerContent(status: string): HTMLElement {
    const colors: Record<string, string> = {
      active: '#22c55e',
      inactive: '#9ca3af',
      warning: '#eab308',
    };
    const color = colors[status] || colors['inactive'];

    const container = document.createElement('div');
    container.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
        <path d="M16 0C7.2 0 0 7.2 0 16c0 12 16 24 16 24s16-12 16-24C32 7.2 24.8 0 16 0z" fill="${color}" stroke="white" stroke-width="2"/>
        <circle cx="16" cy="14" r="6" fill="white" opacity="0.9"/>
      </svg>`;
    return container;
  }

  /**
   * Obtiene el color de fondo del estado
   * @param status - Estado de la ubicación
   * @returns Clase CSS de Tailwind
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
   * Obtiene el color del texto de estado
   * @param status - Estado de la ubicación
   * @returns Clase CSS de color
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
   * Obtiene la etiqueta legible del estado
   * @param status - Estado de la ubicación
   * @returns Etiqueta del estado
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
}
