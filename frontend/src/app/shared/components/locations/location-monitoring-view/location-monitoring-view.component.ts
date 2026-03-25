import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, of } from 'rxjs';
import { catchError, finalize, takeUntil } from 'rxjs/operators';
import { GoogleMapsModule, MapInfoWindow, MapMarker } from '@angular/google-maps';
import { LocationTableComponent } from '../location-table/location-table.component';
import { LocationFiltersComponent, LocationSearchCriteria } from '../location-filters/location-filters.component';
import { LocationService } from '../../../../core/services/location.service';
import { DeviceService } from '../../../../core/services/device.service';
import { Location as AppLocation } from '../../../../core/models/location.model';
import { DEFAULT_MAP_CONFIG } from '../../../../core/config/google-maps.config';
import { GoogleMapsLoaderService } from '../../../../core/services/google-maps-loader.service';

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
  imports: [CommonModule, GoogleMapsModule, LocationTableComponent, LocationFiltersComponent],
  templateUrl: './location-monitoring-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocationMonitoringViewComponent implements OnInit, OnDestroy {
  /**
   * Subject para cleanup de suscripciones
   */
  private destroy$ = new Subject<void>();

  /** Referencia al InfoWindow del mapa */
  @ViewChild(MapInfoWindow) infoWindow!: MapInfoWindow;

  /**
   * Array de ubicaciones para binding en el template
   */
  locations: AppLocation[] = [];

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

  /** Centro del mapa */
  center: google.maps.LatLngLiteral = DEFAULT_MAP_CONFIG.center;

  /** Nivel de zoom */
  zoom = DEFAULT_MAP_CONFIG.zoom;

  /** Opciones del mapa */
  mapOptions: google.maps.MapOptions = { ...DEFAULT_MAP_CONFIG.options };

  /** Indica si la API de Google Maps está disponible */
  isApiLoaded = false;

  /** Ubicación seleccionada en el info window */
  selectedInfoLocation: AppLocation | null = null;

  /**
   * Constructor e inyección de dependencias
   */
  constructor(
    private locationService: LocationService,
    private mapsLoader: GoogleMapsLoaderService,
    private deviceService: DeviceService,
    private cdr: ChangeDetectorRef
  ) {}

  /**
   * Hook del ciclo de vida: Carga ubicaciones al inicializar
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
   * Carga las ubicaciones desde el backend
   * @private
   * @returns {void}
   */
  loadLocations(): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.locationService.getAll()
      .pipe(
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
      )
      .subscribe((locations) => {
        this.locations = locations;
        this.updateSystemInfo();
        this.fitMapToLocations();
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
        this.fitMapToLocations();
        this.cdr.markForCheck();
      });
  }

  /**
   * Abre el InfoWindow al hacer clic en un marcador del mapa
   * @param marker - Referencia al MapAdvancedMarker
   * @param location - Datos de la ubicación
   */
  onMarkerClick(marker: MapMarker | any, location: AppLocation): void {
    // First set shallow location so info window can open quickly
    this.selectedInfoLocation = location;
    if (this.infoWindow) this.infoWindow.open(marker);
    this.cdr.markForCheck();

    // Load devices on the client side (avoid depending on search params on backend)
    this.deviceService.getAll().pipe(takeUntil(this.destroy$)).subscribe({
      next: (devices) => {
        const related = (devices || []).filter(d => (d as any).location?.id === location.id);
        (this.selectedInfoLocation as any).devices = related;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.warn('Failed to load devices list', err);
      }
    });
  }

  /**
   * Genera un icono SVG como data-URL para usar como marcador
   * Color y estilo se calculan según actividad/estado de la ubicación
   */
  getMarkerIcon(location: AppLocation): string | google.maps.Icon {
    const lastActivity = (location as any).lastActivity ? new Date((location as any).lastActivity).getTime() : 0;
    const isRecent = lastActivity && (Date.now() - lastActivity) < 24 * 60 * 60 * 1000; // 24h
    const color = isRecent ? '#10B981' : '#2563EB'; // green or blue

    // Determine device count to adjust marker visual size
    const deviceCount = ((location as any).deviceCount || ((location as any).devices || []).length) as number;
    const baseSize = isRecent ? 36 : 48; // px
    const size = baseSize + Math.min(24, (deviceCount || 0) * 6);

    // Simple pin-shaped SVG marker encoded as data URL
    const svg = `<?xml version='1.0' encoding='UTF-8'?>
<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${Math.round(size * 1.3)}' viewBox='0 0 48 62'>
  <path d='M24 2C15.16 2 8 9.16 8 18c0 12 16 28 16 28s16-16 16-28c0-8.84-7.16-16-16-16z' fill='${color}' stroke='#ffffff' stroke-width='2'/>
  <circle cx='24' cy='18' r='6' fill='#ffffff'/>
</svg>`;

    const url = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
    return url;
  }

  /**
   * Return a small label object to show emoji indicators for camera/sensor
   */
  getMarkerLabel(location: AppLocation): google.maps.MarkerLabel | null {
    const hasCamera = ((location as any).cameraCount && (location as any).cameraCount > 0)
      || (((location as any).devices || []) as any[]).some(d => (d.type || '').toLowerCase().includes('camera'));
    const hasSensor = ((location as any).sensorCount && (location as any).sensorCount > 0)
      || (((location as any).devices || []) as any[]).some(d => (d.type || '').toLowerCase().includes('sensor'));

    let text = '';
    if (hasCamera && hasSensor) text = 'C/S';
    else if (hasCamera) text = 'C';
    else if (hasSensor) text = 'S';
    else return null;

    return { text, color: '#ffffff', fontSize: '12px' } as any;
  }

  /** helper used in info window */
  getCameraCount(location: AppLocation | null): number {
    if (!location) return 0;
    if ((location as any).cameraCount != null) return (location as any).cameraCount;
    const devices = (location as any).devices || [];
    return devices.filter((d: any) => (d.type || '').toLowerCase().includes('camera')).length;
  }

  getSensorCount(location: AppLocation | null): number {
    if (!location) return 0;
    if ((location as any).sensorCount != null) return (location as any).sensorCount;
    const devices = (location as any).devices || [];
    return devices.filter((d: any) => (d.type || '').toLowerCase().includes('sensor')).length;
  }

  /** Devuelve el listado de dispositivos de la ubicación seleccionada (evita casts en plantilla) */
  getSelectedDevices(): any[] {
    return (this.selectedInfoLocation as any)?.devices || [];
  }

  /**
   * Centra el mapa en una ubicación específica
   * @param location - Ubicación a enfocar
   */
  focusOnLocation(location: AppLocation): void {
    this.center = { lat: location.latitude, lng: location.longitude };
    this.zoom = 16;
    this.cdr.markForCheck();
  }

  /**
   * Ajusta el centro del mapa para mostrar todas las ubicaciones.
   * Si no hay ubicaciones, mantiene el centro actual (Pasto por defecto).
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
    this.zoom = DEFAULT_MAP_CONFIG.zoom;
  }

  /**
   * Hook del ciclo de vida: Limpia las suscripciones
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
