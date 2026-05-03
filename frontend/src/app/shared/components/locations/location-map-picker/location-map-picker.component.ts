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

export interface MapCoordinates {
  latitude: number;
  longitude: number;
}

/**
 * LocationMapPickerComponent (Presentational Component)
 *
 * Displays an interactive Google Map for selecting location coordinates via mouse click.
 * Emits selected coordinates to parent via EventEmitter. Includes user geolocation with accuracy-based
 * fallback instructions, animated GPS pulse marker, and optional read-only mode.
 *
 * Features:
 * - Google Map with default center (Pasto, Colombia) from DEFAULT_MAP_CONFIG
 * - User geolocation via Geolocation API with accuracy threshold (<1000m = usable, shown in green)
 * - GPS pulse animation: blue dot (8px) with expanding 40px semi-transparent pulse ring (2s loop)
 * - Animated MapAdvancedMarker for selected location with click-to-open InfoWindow
 * - Info window displays selected coordinates (lat/lng formatted to 6 decimals)
 * - Click to place marker: updates markerPosition, emits MapCoordinates event
 * - Read-only mode Input: disables clicking, changes cursor to default, hides instructions
 * - Initial marker placement: if [initialLatitude] and [initialLongitude] provided, centers map on those coordinates
 * - Conditional instructions based on GPS accuracy: green bar if accurate, amber if imprecise, hidden if read-only
 * - API loading state with fallback message (div shows "Google Maps no disponible")
 * - Dark mode support via dark: Tailwind prefix
 * - Responsive map height via [mapHeight] Input (default 400px)
 * - OnPush change detection with markForCheck after async API load and geolocation
 *
 * Inputs:
 * - initialLatitude: number | null - starting marker position latitude
 * - initialLongitude: number | null - starting marker position longitude
 * - mapHeight: string - CSS height for map container (default '400px')
 * - readonly: boolean - if true, disables map interaction and instructions (default false)
 *
 * Outputs:
 * - coordinatesSelected: EventEmitter<MapCoordinates> - fires on map click with {latitude, longitude}
 *
 * @selector app-location-map-picker
 * @standalone true
 * @imports CommonModule, GoogleMapsModule
 * @example
 * <app-location-map-picker
 *   [initialLatitude]="6.2442"
 *   [initialLongitude]="-75.5812"
 *   mapHeight="500px"
 *   (coordinatesSelected)="onCoordinatesSelected($event)"
 * />
 */
@Component({
  selector: 'app-location-map-picker',
  standalone: true,
  imports: [CommonModule, GoogleMapsModule],
  templateUrl: './location-map-picker.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocationMapPickerComponent implements OnInit {
  @Input() initialLatitude: number | null = null;
  @Input() initialLongitude: number | null = null;
  @Input() mapHeight = '400px';
  @Input() readonly = false;

  @Output() coordinatesSelected = new EventEmitter<MapCoordinates>();

  @ViewChild(MapInfoWindow) infoWindow!: MapInfoWindow;

  center: google.maps.LatLngLiteral = DEFAULT_MAP_CONFIG.center;
  zoom = DEFAULT_MAP_CONFIG.zoom;
  mapOptions: google.maps.MapOptions = {
    ...DEFAULT_MAP_CONFIG.options,
    draggableCursor: 'crosshair',
  };
  markerPosition: google.maps.LatLngLiteral | null = null;
  userLocation: google.maps.LatLngLiteral | null = null;
  userLocationContent: HTMLElement | null = null;
  infoContent = '';
  gpsObtained = false;
  gpsAccurate = false;
  gpsAccuracy = 0;
  isApiLoaded = false;

  constructor(
    private mapsLoader: GoogleMapsLoaderService,
    private cdr: ChangeDetectorRef,
  ) {}

  /**
   * Initializes component on first view: loads Google Maps API asynchronously,
   * configures initial marker position from inputs, requests user geolocation,
   * and creates animated GPS pulse marker with accuracy validation.
   * Marks component for change detection after API load and geolocation completion.
   * @returns {void}
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

      this.isApiLoaded = true;
      this.cdr.markForCheck();

      this.mapsLoader.requestUserLocation().then((geoResult) => {
        if (geoResult) {
          const userPos = { lat: geoResult.lat, lng: geoResult.lng };
          this.gpsAccuracy = Math.round(geoResult.accuracy);
          this.gpsObtained = true;
          this.gpsAccurate = geoResult.accuracy < 1000;

          if (this.gpsAccurate) {
            this.userLocation = userPos;

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
   * Handles map click event to place marker and emit selected coordinates.
   * Validates readonly mode and event.latLng availability. Updates markerPosition,
   * formats info window text to 6 decimal places, and emits MapCoordinates event
   * with latitude and longitude. Disabled when readonly=true.
   * @param {google.maps.MapMouseEvent} event - Map mouse click event with latLng property
   * @returns {void}
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
   * Handles marker click event to display coordinates in InfoWindow.
   * Updates infoContent with current marker position formatted to 6 decimal places,
   * then opens InfoWindow at marker location. Validates infoWindow and markerPosition
   * existence before proceeding.
   * @param {MapAdvancedMarker} marker - Clicked map marker reference
   * @returns {void}
   */
  onMarkerClick(marker: MapAdvancedMarker): void {
    if (this.infoWindow && this.markerPosition) {
      this.infoContent = `Lat: ${this.markerPosition.lat.toFixed(6)}, Lng: ${this.markerPosition.lng.toFixed(6)}`;
      this.infoWindow.open(marker);
    }
  }
}
