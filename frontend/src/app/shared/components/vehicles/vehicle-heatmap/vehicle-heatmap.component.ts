import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';

import { GoogleMapsModule } from '@angular/google-maps';
import { Subject, of } from 'rxjs';
import { catchError, finalize, takeUntil } from 'rxjs/operators';
import { VehicleDetectedService } from '../../../../core/services/vehicle-detected.service';
import { VehicleDetected } from '../../../../core/models/vehicle.model';
import { DEFAULT_MAP_CONFIG } from '../../../../core/config/google-maps.config';
import { GoogleMapsLoaderService } from '../../../../core/services/google-maps-loader.service';

interface HeatPoint {
  lat: number;
  lng: number;
  count: number;
  description: string;
}

/**
 * VehicleHeatmapComponent
 *
 * Displays a Google Maps heatmap visualization showing vehicle detection density and concentration by location.
 * Hot zones (red/orange) indicate high detection concentrations, cool zones (green/blue) show low activity.
 * Integrates with Google Maps API and automatically centers map on first location with data.
 *
 * Data flow:
 * 1. Loads all vehicle detections from backend via VehicleDetectedService
 * 2. Groups detections by location coordinate (latitude/longitude from device)
 * 3. Uses detection count as weight for heatmap intensity
 * 4. Renders weighted coordinates to Google Maps HeatmapLayer
 *
 * Features:
 * - Google Maps heatmap layer with configurable radius, opacity, and dissipating animation
 * - Loading state with spinner animation during API and data loading
 * - Error handling for API unavailability and visualization library loading failures
 * - Empty state when no location data available (devices without GPS coordinates)
 * - Color gradient legend from cool (low activity) to hot (high activity)
 * - Auto-centering on first location with detection data
 * - Display of total detections and unique location count in header
 * - OnPush change detection with manual ChangeDetectorRef triggers
 *
 * @selector app-vehicle-heatmap
 * @standalone true
 * @imports GoogleMapsModule
 * @example
 * <app-vehicle-heatmap />
 */
@Component({
  selector: 'app-vehicle-heatmap',
  standalone: true,
  imports: [GoogleMapsModule],
  templateUrl: './vehicle-heatmap.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VehicleHeatmapComponent implements OnInit, OnDestroy {
  /**
   * Subject for managing component lifecycle cleanup
   * @private
   */
  private destroy$ = new Subject<void>();

  /**
   * Map center coordinates, initialized to project default (Pasto, Nariño)
   */
  center: google.maps.LatLngLiteral = DEFAULT_MAP_CONFIG.center;

  /**
   * Map zoom level (default 13 for city-level view)
   */
  zoom = 13;

  /**
   * Google Maps configuration options with default styling and controls
   */
  mapOptions: google.maps.MapOptions = {
    ...DEFAULT_MAP_CONFIG.options,
    mapTypeId: 'roadmap',
  };

  /**
   * Flag indicating if Google Maps API has been successfully loaded
   */
  isApiLoaded = false;

  /**
   * Flag indicating if data or API loading is in progress
   */
  isLoading = false;

  /**
   * Error message to display if API load or data fetch fails, null if no error
   */
  errorMessage: string | null = null;

  /**
   * Total number of vehicle detections processed for heatmap
   */
  totalDetections = 0;

  /**
   * Number of unique locations with detection data
   */
  locationCount = 0;

  /**
   * Weighted array of LatLng points for heatmap visualization.
   * Uses 'any' type to avoid strict typing dependency on dynamically-loaded google.maps.visualization
   */
  heatmapData: google.maps.LatLng[] = [];

  /**
   * Heatmap layer rendering configuration (radius, opacity, dissipating animation)
   */
  heatmapOptions = {
    radius: 40,
    opacity: 0.75,
    dissipating: true,
  };

  /**
   * Initializes component with service dependencies.
   * @param {VehicleDetectedService} vehicleService - Service for fetching vehicle detections
   * @param {GoogleMapsLoaderService} mapsLoader - Service for loading Google Maps API
   * @param {ChangeDetectorRef} cdr - Change detection reference for manual triggering in OnPush mode
   */
  constructor(
    private vehicleService: VehicleDetectedService,
    private mapsLoader: GoogleMapsLoaderService,
    private cdr: ChangeDetectorRef,
  ) {}

  /**
   * Lifecycle hook: loads map data on initialization
   */
  ngOnInit(): void {
    this.loadData();
  }

  /**
   * Lifecycle hook: cleans up subscriptions on destroy
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Asynchronously loads Google Maps API, visualization library, and vehicle detection data.
   * Sets appropriate error messages and loading states. Calls processHeatmapData on successful load.
   * @private
   */
  private async loadData(): Promise<void> {
    this.isLoading = true;
    this.cdr.markForCheck();

    const mapsReady = await this.mapsLoader.load();
    if (!mapsReady) {
      this.errorMessage = 'Google Maps API unavailable. Check your API key.';
      this.isLoading = false;
      this.cdr.markForCheck();
      return;
    }

    try {
      await (google.maps as any).importLibrary('visualization');
    } catch {
      this.errorMessage = 'Failed to load visualization library.';
      this.isLoading = false;
      this.cdr.markForCheck();
      return;
    }

    this.isApiLoaded = true;
    this.cdr.markForCheck();

    this.vehicleService
      .getAll()
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          console.error('Error loading heatmap data:', error);
          this.errorMessage = 'Failed to load heatmap data.';
          return of([]);
        }),
        finalize(() => {
          this.isLoading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe((vehicles: VehicleDetected[]) => {
        this.processHeatmapData(vehicles);
        this.cdr.markForCheck();
      });
  }

  /**
   * Groups vehicle detections by location coordinate and constructs weighted heatmap points.
   * Each coordinate is repeated N times (where N = detection count) to create weight for heatmap intensity.
   * Updates totalDetections, locationCount, and recalculates map center to first location with data.
   * @param {VehicleDetected[]} vehicles - Array of vehicle detections from backend
   * @private
   */
  private processHeatmapData(vehicles: VehicleDetected[]): void {
    this.totalDetections = vehicles.length;

    const locationMap = new Map<
      string,
      { lat: number; lng: number; count: number; description: string }
    >();

    vehicles.forEach((v) => {
      const loc = v.device?.location;
      if (!loc?.latitude || !loc?.longitude) return;

      const key = `${loc.latitude.toFixed(6)},${loc.longitude.toFixed(6)}`;
      const existing = locationMap.get(key);
      if (existing) {
        existing.count++;
      } else {
        locationMap.set(key, {
          lat: loc.latitude,
          lng: loc.longitude,
          count: 1,
          description: loc.description ?? 'No description',
        });
      }
    });

    this.locationCount = locationMap.size;

    const points: google.maps.LatLng[] = [];
    locationMap.forEach((point) => {
      for (let i = 0; i < point.count; i++) {
        points.push(new google.maps.LatLng(point.lat, point.lng));
      }
    });

    this.heatmapData = points;

    if (locationMap.size > 0) {
      const first = locationMap.values().next().value!;
      this.center = { lat: first.lat, lng: first.lng };
    }
  }
}
