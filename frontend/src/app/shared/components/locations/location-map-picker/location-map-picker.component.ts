import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { GoogleMapsModule, MapInfoWindow, MapAdvancedMarker } from '@angular/google-maps';
import { DEFAULT_MAP_CONFIG } from '../../../../core/config/google-maps.config';
import { GoogleMapsLoaderService } from '../../../../core/services/google-maps-loader.service';

/**
 * Coordenadas emitidas al seleccionar un punto en el mapa
 */
export interface MapCoordinates {
  latitude: number;
  longitude: number;
}

/**
 * LocationMapPickerComponent
 *
 * Componente reutilizable que muestra un Google Map interactivo para seleccionar
 * una ubicación haciendo clic. Emite las coordenadas seleccionadas al componente padre.
 *
 * Uso:
 * ```html
 * <app-location-map-picker
 *   [initialLatitude]="6.2442"
 *   [initialLongitude]="-75.5812"
 *   (coordinatesSelected)="onCoordinatesSelected($event)"
 * />
 * ```
 *
 * @selector app-location-map-picker
 * @standalone true
 */
@Component({
  selector: 'app-location-map-picker',
  standalone: true,
  imports: [CommonModule, GoogleMapsModule],
  templateUrl: './location-map-picker.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocationMapPickerComponent implements OnInit {
  /**
   * Latitud inicial del marcador (opcional)
   */
  @Input() initialLatitude: number | null = null;

  /**
   * Longitud inicial del marcador (opcional)
   */
  @Input() initialLongitude: number | null = null;

  /**
   * Altura del contenedor del mapa
   */
  @Input() mapHeight = '400px';

  /**
   * Si el mapa es solo lectura (no permite seleccionar)
   */
  @Input() readonly = false;

  /**
   * Emite las coordenadas cuando el usuario hace clic en el mapa
   */
  @Output() coordinatesSelected = new EventEmitter<MapCoordinates>();

  /** Referencia al InfoWindow del mapa */
  @ViewChild(MapInfoWindow) infoWindow!: MapInfoWindow;

  /** Centro del mapa */
  center: google.maps.LatLngLiteral = DEFAULT_MAP_CONFIG.center;

  /** Nivel de zoom */
  zoom = DEFAULT_MAP_CONFIG.zoom;

  /** Opciones del mapa */
  mapOptions: google.maps.MapOptions = {
    ...DEFAULT_MAP_CONFIG.options,
    draggableCursor: 'crosshair',
  };

  /** Posición del marcador seleccionado */
  markerPosition: google.maps.LatLngLiteral | null = null;

  /** Ubicación actual del usuario (punto azul) */
  userLocation: google.maps.LatLngLiteral | null = null;

  /** Contenido visual del marcador de ubicación del usuario (punto azul) */
  userLocationContent: HTMLElement | null = null;

  /** Texto del info window */
  infoContent = '';

  /** Indica si se obtuvo la ubicación GPS del usuario */
  gpsObtained = false;

  /** Indica si la precisión del GPS fue suficiente */
  gpsAccurate = false;

  /** Precisión del GPS en metros */
  gpsAccuracy = 0;

  /** Indica si la API de Google Maps está disponible */
  isApiLoaded = false;

  constructor(
    private mapsLoader: GoogleMapsLoaderService,
    private cdr: ChangeDetectorRef,
  ) {}

  /**
   * Inicializa el mapa: carga la API dinámicamente y configura la posición inicial
   */
  ngOnInit(): void {
    if (this.initialLatitude !== null && this.initialLongitude !== null) {
      this.markerPosition = {
        lat: this.initialLatitude,
        lng: this.initialLongitude,
      };
      this.center = { ...this.markerPosition };
    }

    if (this.readonly) {
      this.mapOptions = {
        ...this.mapOptions,
        draggableCursor: 'default',
      };
    }

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
      this.mapsLoader.requestUserLocation().then((geoResult) => {
        if (geoResult) {
          const userPos = { lat: geoResult.lat, lng: geoResult.lng };
          this.gpsAccuracy = Math.round(geoResult.accuracy);
          this.gpsObtained = true;
          this.gpsAccurate = geoResult.accuracy < 1000; // < 1km = usable

          // Solo mostrar punto azul y centrar si la precisión es aceptable
          if (this.gpsAccurate) {
            this.userLocation = userPos;

            // Crear punto azul con animación de pulso
            const wrapper = document.createElement('div');
            wrapper.style.position = 'relative';
            wrapper.style.width = '20px';
            wrapper.style.height = '20px';

            const pulse = document.createElement('div');
            pulse.style.cssText = `
              position: absolute; inset: -6px; border-radius: 50%;
              background: rgba(66,133,244,0.25);
              animation: gps-pulse 2s infinite;
            `;

            const dot = document.createElement('div');
            dot.style.cssText = `
              position: absolute; inset: 0; border-radius: 50%;
              background: #4285F4; border: 2.5px solid white;
              box-shadow: 0 1px 4px rgba(0,0,0,0.3);
            `;

            wrapper.appendChild(pulse);
            wrapper.appendChild(dot);
            this.userLocationContent = wrapper;

            if (!document.getElementById('gps-pulse-style')) {
              const style = document.createElement('style');
              style.id = 'gps-pulse-style';
              style.textContent = `@keyframes gps-pulse { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(2.5); opacity: 0; } }`;
              document.head.appendChild(style);
            }

            // Centrar en la ubicación real del usuario
            if (this.markerPosition === null) {
              this.center = userPos;
              this.zoom = 17;
            }
          }
        }
        this.cdr.markForCheck();
      });
    });
  }

  /**
   * Maneja el clic en el mapa para seleccionar una ubicación
   * @param event - Evento del mapa con las coordenadas del clic
   */
  onMapClick(event: google.maps.MapMouseEvent): void {
    if (this.readonly || !event.latLng) return;

    const lat = event.latLng.lat();
    const lng = event.latLng.lng();

    this.markerPosition = { lat, lng };
    this.infoContent = `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`;

    this.coordinatesSelected.emit({
      latitude: lat,
      longitude: lng,
    });
  }

  /**
   * Abre el InfoWindow al hacer clic en el marcador
   * @param marker - Referencia al marcador
   */
  onMarkerClick(marker: MapAdvancedMarker): void {
    if (this.infoWindow && this.markerPosition) {
      this.infoContent = `Lat: ${this.markerPosition.lat.toFixed(6)}, Lng: ${this.markerPosition.lng.toFixed(6)}`;
      this.infoWindow.open(marker);
    }
  }
}
