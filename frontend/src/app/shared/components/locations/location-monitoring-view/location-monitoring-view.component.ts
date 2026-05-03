import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, of, combineLatest } from 'rxjs';
import { catchError, finalize, takeUntil, map } from 'rxjs/operators';
import { GoogleMapsModule, MapInfoWindow, MapAdvancedMarker } from '@angular/google-maps';
import { LocationFiltersComponent } from '../location-filters/location-filters.component';
import { LocationService } from '../../../../core/services/location.service';
import { DeviceService } from '../../../../core/services/device.service';
import { VehicleDetectedService } from '../../../../core/services/vehicle-detected.service';
import { SensorDataService } from '../../../../core/services/sensor-data.service';
import { Location as AppLocation } from '../../../../core/models/location.model';
import { Device, DeviceType } from '../../../../core/models/device.model';
import { DEFAULT_MAP_CONFIG } from '../../../../core/config/google-maps.config';
import { GoogleMapsLoaderService } from '../../../../core/services/google-maps-loader.service';

interface LocationView extends AppLocation {
  devices?: Device[];
  deviceCount?: number;
  cameraCount?: number;
  sensorCount?: number;
  lastActivity?: Date | string | null;
}

/**
 * LocationMonitoringViewComponent (Container Component)
 *
 * Displays all monitoring locations on an interactive Google Map with system summary statistics,
 * device counts per location, and integrated location filtering table. Loads location, device,
 * and detection data via combineLatest with enrichment calculations.
 *
 * Features:
 * - Summary stat cards: total locations, active locations (with ACTIVE devices), last detection timestamp
 * - Google Map with default center from DEFAULT_MAP_CONFIG, auto-fit to all location bounds
 * - Dynamic marker icons: green SVG pins (36px) for recent detections (last 24h), larger pins scaled by device count
 * - Marker labels: "C" for camera-only, "S" for sensor-only, "C/S" for mixed devices
 * - InfoWindow popup: location description, lat/lng (6 decimals), device count with icons, device list
 * - Marker click handler: lazy-loads device list for selected location on demand
 * - Location enrichment: calculates deviceCount, cameraCount, sensorCount, lastActivity for each location
 * - Helper methods: getCameraCount, getSensorCount, getSelectedDevices (avoid casts in template)
 * - Manual refresh trigger: onLocationChanged() called from location-filters component
 * - Error handling: independent catchError on each data stream, returns empty arrays on failure
 * - User geolocation: requests and centers map on user location if accuracy <1000m
 * - focusOnLocation method: centers map at zoom 16 on a specific location
 * - fitMapToLocations private method: auto-centers and zooms map to show all valid locations
 * - Loading state with isLoading flag and finalize operator
 * - Responsive grid: 2 columns mobile, 3 columns desktop for stat cards
 * - Dark mode support via dark: Tailwind prefix
 * - OnPush change detection with markForCheck after async operations
 * - OnDestroy cleanup via takeUntil(destroy$) pattern
 * - Child component: LocationFiltersComponent integrated at bottom for unified management
 *
 * @selector app-location-monitoring-view
 * @standalone true
 * @imports CommonModule, GoogleMapsModule, LocationFiltersComponent
 * @example
 * <app-location-monitoring-view />
 */
@Component({
  selector: 'app-location-monitoring-view',
  standalone: true,
  imports: [CommonModule, GoogleMapsModule, LocationFiltersComponent],
  templateUrl: './location-monitoring-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocationMonitoringViewComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  @ViewChild(MapInfoWindow) infoWindow!: MapInfoWindow;

  locations: LocationView[] = [];

  systemInfo = {
    totalLocations: 0,
    activeLocations: 0,
    lastDetection: new Date(),
  };

  isLoading = false;
  errorMessage: string | null = null;

  center: google.maps.LatLngLiteral = DEFAULT_MAP_CONFIG.center;
  zoom = DEFAULT_MAP_CONFIG.zoom;
  mapOptions: google.maps.MapOptions = { ...DEFAULT_MAP_CONFIG.options };
  isApiLoaded = false;

  selectedInfoLocation: LocationView | null = null;
  constructor(
    private locationService: LocationService,
    private mapsLoader: GoogleMapsLoaderService,
    private deviceService: DeviceService,
    private vehicleService: VehicleDetectedService,
    private sensorService: SensorDataService,
    private cdr: ChangeDetectorRef,
  ) {}

  /**
   * Lifecycle hook: initializes component on first view.
   * Loads Google Maps API asynchronously, requests user geolocation if available,
   * and triggers loadLocations() to populate map with location data.
   * Marks component for change detection after API load and geolocation completion.
   * @returns {void}
   */
  ngOnInit(): void {
    this.mapsLoader.load().then((loaded) => {
      if (!loaded) {
        this.isApiLoaded = false;
        this.cdr.markForCheck();
        return;
      }

      this.isApiLoaded = true;
      this.cdr.markForCheck();

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
   * Loads locations, devices, and detection data from backend via parallel streams.
   * Uses combineLatest to merge locations$, devices$, lastDetect$ observables.
   * Enriches each location with device count, camera/sensor counts, and last activity timestamp.
   * Calculates system info (total locations, active locations, last detection).
   * Fits map bounds to show all valid location coordinates.
   * Sets isLoading flag with finalize operator and handles errors via catchError.
   * @returns {void}
   */
  loadLocations(): void {
    this.isLoading = true;
    this.errorMessage = null;

    const locations$ = this.locationService.getAll().pipe(
      catchError((err) => {
        console.error('Error loading locations:', err);
        return of([] as AppLocation[]);
      }),
    );

    const devices$ = this.deviceService.getAll().pipe(
      catchError((err) => {
        console.error('Error loading devices:', err);
        return of([] as Device[]);
      }),
    );

    const vehicleLast$ = this.vehicleService.getLastRecord().pipe(
      map((v) => (v && v.timestamp ? new Date(v.timestamp) : null)),
      catchError((err) => {
        console.warn('Error fetching last vehicle detection:', err);
        return of(null);
      }),
    );

    const sensorLast$ = this.sensorService.getLastRecord().pipe(
      map((s) => (s && s.timestamp ? new Date(s.timestamp) : null)),
      catchError((err) => {
        console.warn('Error fetching last sensor data:', err);
        return of(null);
      }),
    );

    const lastDetect$ = combineLatest([vehicleLast$, sensorLast$]).pipe(
      map(([vDate, sDate]) => {
        if (vDate && sDate) return vDate > sDate ? vDate : sDate;
        return vDate || sDate || new Date();
      }),
    );

    combineLatest([locations$, devices$, lastDetect$])
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.markForCheck();
        }),
        takeUntil(this.destroy$),
      )
      .subscribe((values) => {
        const [locations, devices, lastDetection] = values as [AppLocation[], Device[], Date];

        const enriched = locations.map((loc) => {
          const related = (devices || []).filter((d) => d?.location?.id === loc.id);
          const deviceCount = related.length;
          const cameraCount = related.filter(
            (d) => d.type === DeviceType.CAMERA || String(d.type).toLowerCase().includes('camera'),
          ).length;
          const sensorCount = related.filter(
            (d) => d.type === DeviceType.SENSOR || String(d.type).toLowerCase().includes('sensor'),
          ).length;
          const rawLast = (loc as unknown as Partial<{ lastActivity?: string | Date }>)
            .lastActivity;
          const lastActivity = rawLast ? new Date(rawLast) : null;
          return {
            ...(loc as AppLocation),
            devices: related,
            deviceCount,
            cameraCount,
            sensorCount,
            lastActivity,
          } as LocationView;
        });

        this.locations = enriched;
        this.updateSystemInfo(devices, lastDetection);
        this.fitMapToLocations();
        this.cdr.markForCheck();
      });
  }

  /**
   * Updates system info object with aggregate statistics from devices and last detection.
   * Calculates totalLocations (all locations), activeLocations (unique location IDs with ACTIVE devices),
   * and lastDetection timestamp (most recent vehicle or sensor data).
   * Used internally by loadLocations() to populate systemInfo display cards.
   * @param {Device[]} devices - Array of Device objects from backend
   * @param {Date} lastDetection - Most recent detection timestamp (vehicle or sensor)
   * @returns {void}
   */
  private updateSystemInfo(devices: Device[], lastDetection: Date): void {
    this.systemInfo.totalLocations = this.locations.length;
    const activeLocationIds = new Set<number>();
    (devices || []).forEach((d: Device) => {
      if (d && d.location && d.location.id != null && d.state === 'ACTIVE') {
        activeLocationIds.add(d.location.id);
      }
    });
    this.systemInfo.activeLocations = activeLocationIds.size;
    this.systemInfo.lastDetection = lastDetection;
  }

  /**
   * Handles location changes from child LocationFiltersComponent.
   * Called from LocationTableComponent (locationChanged) output event.
   * Re-executes loadLocations() to refresh map and system info with latest backend data.
   * @returns {void}
   */
  onLocationChanged(): void {
    this.loadLocations();
  }

  /**
   * Handles map marker click to display location info and load associated devices.
   * Sets selectedInfoLocation reference, opens InfoWindow, and asynchronously loads
   * device list for the location. Updates device counts (camera/sensor) on load.
   * Called from map-advanced-marker click event in template.
   * @param {MapAdvancedMarker} marker - Google Maps advanced marker element
   * @param {AppLocation} location - Location object associated with clicked marker
   * @returns {void}
   */
  onMarkerClick(marker: MapAdvancedMarker, location: AppLocation): void {
    this.selectedInfoLocation = location as LocationView;
    if (this.infoWindow) this.infoWindow.open(marker);
    this.cdr.markForCheck();

    this.deviceService
      .getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (devices: Device[]) => {
          const related = (devices || []).filter((d) => d.location?.id === location.id);
          if (this.selectedInfoLocation) {
            const sel = this.selectedInfoLocation as LocationView;
            sel.devices = related;
            sel.deviceCount = related.length;
            sel.cameraCount = related.filter(
              (d) =>
                d.type === DeviceType.CAMERA || String(d.type).toLowerCase().includes('camera'),
            ).length;
            sel.sensorCount = related.filter(
              (d) =>
                d.type === DeviceType.SENSOR || String(d.type).toLowerCase().includes('sensor'),
            ).length;
          }
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.warn('Failed to load devices list', err);
        },
      });
  }

  /**
   * Generates custom SVG marker icon with dynamic color and size based on activity recency and device count.
   * Recent activity (last 24h) uses green (#10B981), older uses light green (#14d83f).
   * Base size is 36px for recent, 48px for older; increases by 6px per device (max +24px).
   * Returns HTML element with SVG for use with AdvancedMarkerElement.
   * @param {LocationView | AppLocation} location - Location object with lastActivity and device count
   * @returns {HTMLElement} HTML element containing SVG marker icon
   */
  getMarkerIcon(location: LocationView | AppLocation): HTMLElement {
    const rawLast = (location as unknown as Partial<{ lastActivity?: string | Date }>).lastActivity;
    const lastActivity = rawLast ? new Date(rawLast).getTime() : 0;
    const isRecent = lastActivity && Date.now() - lastActivity < 24 * 60 * 60 * 1000;
    const color = isRecent ? '#10B981' : '#14d83f';

    const locPartial = location as Partial<LocationView>;
    const deviceCount = (locPartial.deviceCount ?? (locPartial.devices ?? []).length) as number;
    const baseSize = isRecent ? 36 : 48;
    const size = baseSize + Math.min(24, (deviceCount || 0) * 6);

    const svg = `<?xml version='1.0' encoding='UTF-8'?>
<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${Math.round(size * 1.3)}' viewBox='0 0 48 62' style='cursor:pointer;'>
  <path d='M24 2C15.16 2 8 9.16 8 18c0 12 16 28 16 28s16-16 16-28c0-8.84-7.16-16-16-16z' fill='${color}' stroke='#ffffff' stroke-width='2'/>
  <circle cx='24' cy='18' r='6' fill='#ffffff'/>
</svg>`;

    const div = document.createElement('div');
    div.innerHTML = svg;
    return div;
  }

  /**
   * Generates marker label to indicate device types present at location.
   * Returns "C/S" for locations with both cameras and sensors,
   * "C" for camera-only, "S" for sensor-only, null if no devices.
   * Uses cameraCount/sensorCount or filters devices array as fallback.
   * White text on marker, 12px font size.
   * @param {LocationView | AppLocation} location - Location object with device type information
   * @returns {google.maps.MarkerLabel | null} Label object or null if no devices
   */
  getMarkerLabel(location: LocationView | AppLocation): google.maps.MarkerLabel | null {
    const devices = (location as unknown as Partial<LocationView>)?.devices ?? [];
    const hasCamera =
      ((location as unknown as Partial<LocationView>)?.cameraCount ?? 0) > 0 ||
      devices.some((d) => (String(d.type) || '').toLowerCase().includes('camera'));
    const hasSensor =
      ((location as unknown as Partial<LocationView>)?.sensorCount ?? 0) > 0 ||
      devices.some((d) => (String(d.type) || '').toLowerCase().includes('sensor'));

    let text = '';
    if (hasCamera && hasSensor) text = 'C/S';
    else if (hasCamera) text = 'C';
    else if (hasSensor) text = 'S';
    else return null;

    return { text, color: '#ffffff', fontSize: '12px' } as google.maps.MarkerLabel;
  }

  /**
   * Returns count of CAMERA type devices for specified location.
   * Uses cameraCount property if available; otherwise filters devices array
   * for entries where type string contains 'camera' (case-insensitive).
   * Returns 0 if location is null or no cameras found.
   * Used in template for device count display in info window.
   * @param {LocationView | AppLocation | null} location - Location object to check
   * @returns {number} Count of camera devices (0 or positive integer)
   */
  getCameraCount(location: LocationView | AppLocation | null): number {
    if (!location) return 0;
    const loc = location as Partial<LocationView>;
    if (loc.cameraCount != null) return loc.cameraCount as number;
    const devices = (loc.devices ?? []) as Device[];
    return devices.filter((d: Device) => (String(d.type) || '').toLowerCase().includes('camera'))
      .length;
  }

  /**
   * Returns count of SENSOR type devices for specified location.
   * Uses sensorCount property if available; otherwise filters devices array
   * for entries where type string contains 'sensor' (case-insensitive).
   * Returns 0 if location is null or no sensors found.
   * Used in template for device count display in info window.
   * @param {LocationView | AppLocation | null} location - Location object to check
   * @returns {number} Count of sensor devices (0 or positive integer)
   */
  getSensorCount(location: LocationView | AppLocation | null): number {
    if (!location) return 0;
    const loc = location as Partial<LocationView>;
    if (loc.sensorCount != null) return loc.sensorCount as number;
    const devices = (loc.devices ?? []) as Device[];
    return devices.filter((d: Device) => (String(d.type) || '').toLowerCase().includes('sensor'))
      .length;
  }

  /**
   * Returns device list for currently selected location displayed in info window.
   * Reads from selectedInfoLocation.devices array (populated on marker click).
   * Returns empty array if selectedInfoLocation is null or has no devices.
   * Used in template to render device details in info window popup.
   * @returns {Device[]} Array of Device objects for selected location
   */
  getSelectedDevices(): Device[] {
    return (this.selectedInfoLocation?.devices ?? []) as Device[];
  }

  /**
   * Centers and zooms map to focus on specified location.
   * Sets map center to location coordinates and zoom level to 16.
   * Marks component for change detection to trigger map redraw.
   * Can be called from template or parent component to focus on specific location.
   * @param {AppLocation} location - Location object with latitude and longitude
   * @returns {void}
   */
  focusOnLocation(location: AppLocation): void {
    this.center = { lat: location.latitude, lng: location.longitude };
    this.zoom = 16;
    this.cdr.markForCheck();
  }

  /**
   * Automatically fits map center and zoom level to show all valid locations.
   * Filters locations with valid (finite) latitude/longitude coordinates.
   * For single location: centers on it at zoom 15.
   * For multiple locations: calculates average center point and uses default zoom.
   * For zero locations: takes no action.
   * Called internally by loadLocations() after data enrichment.
   * @returns {void}
   */
  private fitMapToLocations(): void {
    if (this.locations.length === 0) return;

    const valid = this.locations.filter(
      (loc) =>
        loc.latitude != null &&
        loc.longitude != null &&
        isFinite(loc.latitude) &&
        isFinite(loc.longitude),
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
   * Lifecycle hook: cleans up subscriptions and completes destroy$ subject.
   * Called when component is destroyed to prevent memory leaks.
   * Unsubscribes all observables using takeUntil(destroy$) pattern.
   * @returns {void}
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
