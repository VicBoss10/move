import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  NgZone,
  ViewChild,
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { GoogleMap, GoogleMapsModule } from '@angular/google-maps';
import { Subject, of } from 'rxjs';
import { catchError, finalize, takeUntil } from 'rxjs/operators';
import { SensorDataService } from '../../../../core/services/sensor-data.service';
import { SensorData } from '../../../../core/models/sensor-data.model';
import { DEFAULT_MAP_CONFIG } from '../../../../core/config/google-maps.config';
import { GoogleMapsLoaderService } from '../../../../core/services/google-maps-loader.service';

interface Co2HeatPoint {
  lat: number;
  lng: number;
  avgCo2: number;
}

interface HeatRing {
  radiusFactor: number;
  color: string;
  opacity: number;
}

/**
 * CO₂ threshold levels matching environment-thresholds.config.ts.
 * Used to select the correct ring palette based on average CO₂ value.
 */
const CO2_THRESHOLDS = {
  good: 600,
  moderate: 1000,
  poor: 1500,
};

/**
 * Ring palettes per CO₂ level.
 * Rings are listed outermost → innermost so inner (hotter) circles paint on top.
 * The center color reflects the actual pollution level; outer rings cool down from there.
 */
const RING_PALETTES: Record<string, HeatRing[]> = {
  // good: green center fading to lighter greens — barely noticeable
  good: [
    { radiusFactor: 1.00, color: '#d1fae5', opacity: 0.12 }, // emerald-100
    { radiusFactor: 0.70, color: '#6ee7b7', opacity: 0.20 }, // emerald-300
    { radiusFactor: 0.45, color: '#34d399', opacity: 0.32 }, // emerald-400
    { radiusFactor: 0.25, color: '#10b981', opacity: 0.50 }, // emerald-500 center
  ],
  // moderate: yellow center fading to green
  moderate: [
    { radiusFactor: 1.00, color: '#10b981', opacity: 0.10 }, // green outer
    { radiusFactor: 0.75, color: '#86efac', opacity: 0.15 }, // green-300
    { radiusFactor: 0.55, color: '#fde68a', opacity: 0.28 }, // yellow-200
    { radiusFactor: 0.35, color: '#fbbf24', opacity: 0.45 }, // amber-400
    { radiusFactor: 0.18, color: '#f59e0b', opacity: 0.65 }, // amber-500 center
  ],
  // poor: orange center fading through yellow to green
  poor: [
    { radiusFactor: 1.00, color: '#10b981', opacity: 0.10 }, // green outer
    { radiusFactor: 0.78, color: '#fbbf24', opacity: 0.18 }, // yellow
    { radiusFactor: 0.56, color: '#fb923c', opacity: 0.30 }, // orange-400
    { radiusFactor: 0.36, color: '#f97316', opacity: 0.48 }, // orange-500
    { radiusFactor: 0.18, color: '#ea580c', opacity: 0.68 }, // orange-600 center
  ],
  // critical: red center fading through orange → yellow → green
  critical: [
    { radiusFactor: 1.00, color: '#10b981', opacity: 0.10 }, // green outer
    { radiusFactor: 0.80, color: '#eab308', opacity: 0.18 }, // yellow
    { radiusFactor: 0.60, color: '#f97316', opacity: 0.30 }, // orange
    { radiusFactor: 0.40, color: '#ef4444', opacity: 0.45 }, // red-500
    { radiusFactor: 0.20, color: '#dc2626', opacity: 0.68 }, // red-600 center
  ],
};

/**
 * PollutionHeatmapComponent
 *
 * Displays a Google Maps heatmap showing CO₂ concentration by sensor location.
 * Ring color palette adapts to the actual CO₂ level of each location:
 * - good  (<600 ppm)   → green gradient
 * - moderate (600-1000) → yellow gradient
 * - poor  (1000-1500)  → orange gradient
 * - critical (>1500)   → red gradient
 *
 * Data: average of last hour per sensor location.
 *
 * @selector app-pollution-heatmap
 * @standalone true
 * @imports CommonModule, GoogleMapsModule
 * @example
 * <app-pollution-heatmap />
 */
@Component({
  selector: 'app-pollution-heatmap',
  standalone: true,
  imports: [CommonModule, GoogleMapsModule],
  templateUrl: './pollution-heatmap.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PollutionHeatmapComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

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

  avgCo2 = 0;
  locationCount = 0;
  hasData = false;

  private heatCircles: google.maps.Circle[] = [];
  private heatPoints: Co2HeatPoint[] = [];
  private circlesRendered = false;

  private readonly HOURS_WINDOW = 1;

  constructor(
    private sensorDataService: SensorDataService,
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

    const end = new Date();
    const start = new Date(end.getTime() - this.HOURS_WINDOW * 3_600_000);

    this.sensorDataService
      .search({ start, end })
      .pipe(
        takeUntil(this.destroy$),
        catchError((error: unknown) => {
          console.error('Error loading pollution heatmap data:', error);
          this.errorMessage = 'Failed to load pollution data.';
          return of([]);
        }),
        finalize(() => {
          this.isLoading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe((readings: SensorData[]) => {
        this.processData(readings);
        this.cdr.markForCheck();
      });
  }

  private processData(readings: SensorData[]): void {
    const locationMap = new Map<
      string,
      { lat: number; lng: number; co2Sum: number; count: number }
    >();

    readings.forEach((r) => {
      const loc = r.device?.location;
      if (!loc?.latitude || !loc?.longitude || !r.co2) return;

      const key = `${loc.latitude.toFixed(6)},${loc.longitude.toFixed(6)}`;
      const existing = locationMap.get(key);
      if (existing) {
        existing.co2Sum += r.co2;
        existing.count++;
      } else {
        locationMap.set(key, { lat: loc.latitude, lng: loc.longitude, co2Sum: r.co2, count: 1 });
      }
    });

    this.locationCount = locationMap.size;
    this.heatPoints = [];
    this.circlesRendered = false;

    let totalCo2 = 0;
    locationMap.forEach((point) => {
      const avgCo2 = point.co2Sum / point.count;
      totalCo2 += avgCo2;
      this.heatPoints.push({ lat: point.lat, lng: point.lng, avgCo2 });
    });

    this.avgCo2 = locationMap.size > 0 ? totalCo2 / locationMap.size : 0;
    this.hasData = this.heatPoints.length > 0;

    if (this.heatPoints.length > 0) {
      this.center = { lat: this.heatPoints[0].lat, lng: this.heatPoints[0].lng };
    }
  }

  /**
   * Selects ring palette based on CO₂ threshold level,
   * then draws concentric circles for each location.
   */
  private renderHeatGradient(): void {
    const map = this.mapRef?.googleMap;
    if (!map || this.heatPoints.length === 0) return;

    this.clearHeatCircles();
    this.circlesRendered = true;

    this.heatPoints.forEach((point) => {
      const rings = this.getRingsForCo2(point.avgCo2);
      // Base radius: 400m minimum, scaled slightly higher for critical zones
      const normalized = Math.min(point.avgCo2 / 2000, 1);
      const baseRadius = 350 + normalized * 450;

      rings.forEach((ring) => {
        const circle = new google.maps.Circle({
          center: { lat: point.lat, lng: point.lng },
          radius: baseRadius * ring.radiusFactor,
          map,
          fillColor: ring.color,
          fillOpacity: ring.opacity,
          strokeWeight: 0,
          clickable: false,
        });
        this.heatCircles.push(circle);
      });
    });
  }

  /**
   * Returns the ring palette that matches the CO₂ threshold level.
   */
  private getRingsForCo2(co2: number): HeatRing[] {
    if (co2 < CO2_THRESHOLDS.good) return RING_PALETTES['good'];
    if (co2 < CO2_THRESHOLDS.moderate) return RING_PALETTES['moderate'];
    if (co2 < CO2_THRESHOLDS.poor) return RING_PALETTES['poor'];
    return RING_PALETTES['critical'];
  }

  private clearHeatCircles(): void {
    this.heatCircles.forEach((c) => c.setMap(null));
    this.heatCircles = [];
  }
}
