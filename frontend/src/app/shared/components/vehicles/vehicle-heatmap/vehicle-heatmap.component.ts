import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  NgZone,
  ViewChild,
} from '@angular/core';

import { GoogleMap, GoogleMapsModule } from '@angular/google-maps';
import { Subject, of } from 'rxjs';
import { catchError, finalize, takeUntil } from 'rxjs/operators';
import { VehicleDetectedService } from '../../../../core/services/vehicle-detected.service';
import { VehicleDetected } from '../../../../core/models/vehicle.model';
import { DEFAULT_MAP_CONFIG } from '../../../../core/config/google-maps.config';
import { GoogleMapsLoaderService } from '../../../../core/services/google-maps-loader.service';

interface HeatPoint {
  lat: number;
  lng: number;
  weight: number;
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
 * 4. Renders weighted coordinates with gradient circles to Google Maps
 *
 * Features:
 * - Custom gradient heatmap using google.maps.Circle (replaces deprecated HeatmapLayer)
 * - Loading state with spinner animation during API and data loading
 * - Error handling for API unavailability
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
  private destroy$ = new Subject<void>();

  /** Reference to the GoogleMap component to access the underlying map instance */
  @ViewChild(GoogleMap) private mapRef?: GoogleMap;

  center: google.maps.LatLngLiteral = DEFAULT_MAP_CONFIG.center;

  zoom = 13;

  mapOptions: google.maps.MapOptions = {
    ...DEFAULT_MAP_CONFIG.options,
    mapTypeId: 'roadmap',
  };

  isApiLoaded = false;

  isLoading = false;

  errorMessage: string | null = null;

  totalDetections = 0;

  locationCount = 0;

  heatmapData: google.maps.LatLng[] = [];

  private heatCircles: google.maps.Circle[] = [];

  private heatPoints: HeatPoint[] = [];

  /** Prevents rendering circles multiple times on repeated tilesloaded events */
  private circlesRendered = false;

  heatmapOptions = {
    radius: 40,
    opacity: 0.75,
    dissipating: true,
  };

  constructor(
    private vehicleService: VehicleDetectedService,
    private mapsLoader: GoogleMapsLoaderService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.clearHeatCircles();
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Triggered when the map tiles finish loading — the map is fully usable at this point.
   * Re-renders circles if data already arrived before the map was ready.
   */
  onTilesLoaded(): void {
    if (!this.circlesRendered && this.heatPoints.length > 0) {
      this.renderHeatGradient();
    }
  }

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

    this.isApiLoaded = true;
    this.cdr.markForCheck();

    this.vehicleService
      .getAll()
      .pipe(
        takeUntil(this.destroy$),
        catchError((error: unknown) => {
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
    this.heatPoints = [];
    this.circlesRendered = false;

    locationMap.forEach((point) => {
      for (let i = 0; i < point.count; i++) {
        points.push(new google.maps.LatLng(point.lat, point.lng));
      }
      this.heatPoints.push({ lat: point.lat, lng: point.lng, weight: point.count });
    });

    this.heatmapData = points;

    if (locationMap.size > 0) {
      const first = locationMap.values().next().value!;
      this.center = { lat: first.lat, lng: first.lng };
    }
  }

  /**
   * Renders a circle per location using color + radius scaled to detection weight.
   * Color scale: teal (low) → green → yellow → orange → red (high).
   */
  private renderHeatGradient(): void {
    const map = this.mapRef?.googleMap;
    if (!map || this.heatPoints.length === 0) return;

    this.clearHeatCircles();
    this.circlesRendered = true;

    const maxWeight = Math.max(...this.heatPoints.map((p) => p.weight), 1);
    const gradient = ['#0d9488', '#16a34a', '#eab308', '#f97316', '#dc2626'];

    this.heatPoints.forEach((point) => {
      const normalized = point.weight / maxWeight;
      const colorIndex = Math.min(
        Math.floor(normalized * (gradient.length - 1)),
        gradient.length - 1,
      );

      const circle = new google.maps.Circle({
        center: { lat: point.lat, lng: point.lng },
        radius: 200 + normalized * 500,
        map,
        fillColor: gradient[colorIndex],
        fillOpacity: 0.55 - normalized * 0.2,
        strokeWeight: 0,
      });

      this.heatCircles.push(circle);
    });
  }

  private clearHeatCircles(): void {
    this.heatCircles.forEach((c) => c.setMap(null));
    this.heatCircles = [];
  }
}
