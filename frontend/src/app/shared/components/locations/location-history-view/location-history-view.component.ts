import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, forkJoin, of } from 'rxjs';
import { catchError, finalize, takeUntil } from 'rxjs/operators';
import { VehicleDetectedService } from '../../../../core/services/vehicle-detected.service';
import { SensorDataService } from '../../../../core/services/sensor-data.service';
import { VehicleDetected } from '../../../../core/models/vehicle.model';
import { SensorData } from '../../../../core/models/sensor-data.model';
import { LocationService } from '../../../../core/services/location.service';
import { Location } from '../../../../core/models/location.model';

interface DetectionRecord {
  id: number;
  description: string;
  vehicleDetections: number;
  sensorDetections: number;
  lastUpdate: string;
  lastTimestamp?: number | null;
}

/**
 * LocationHistoryViewComponent (Presentation Component)
 *
 * Displays aggregated detection history (vehicles and sensors) grouped by location with summary statistics,
 * a detailed table, and overall system tallies. Data loads via forkJoin from three parallel streams:
 * locations, vehicle detections, and sensor data.
 *
 * Features:
 * - Three summary stat cards: total detections (brand color), vehicles detected (warning/yellow), sensors detected (green)
 * - Detection history table with five columns: location description, vehicle count (warning badge), sensor count (green badge), total, last update
 * - Parallel data loading via forkJoin with independent error handling (returns empty arrays on API failure)
 * - Detection record aggregation: counts vehicles and sensors grouped by location.id from both vehicle and sensor objects
 * - Latest timestamp tracking per location (compares vehicle and sensor timestamps, shows most recent)
 * - Sort by lastUpdate descending (most recent first), "Sin datos" for locations with no detections
 * - Overall statistics calculated from aggregated data (totalVehicleDetections, totalSensorDetections, totalDetections)
 * - Loading state with isLoading flag and finalize operator: shows a spinner and hides the cards and table until data arrives
 * - Empty state with centered message when no detection records exist
 * - Responsive grid: 1 column mobile, 3 columns desktop for stat cards
 * - Dark mode support via dark: Tailwind prefix
 * - OnPush change detection with manual markForCheck calls
 * - OnDestroy cleanup via takeUntil(destroy$) pattern
 *
 * @selector app-location-history-view
 * @standalone true
 * @imports CommonModule
 * @example
 * <app-location-history-view />
 */
@Component({
  selector: 'app-location-history-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './location-history-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocationHistoryViewComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  detectionHistory: DetectionRecord[] = [];

  overallStats = {
    totalVehicleDetections: 0,
    totalSensorDetections: 0,
    totalDetections: 0,
  };

  isLoading = false;
  errorMessage: string | null = null;
  constructor(
    private vehicleService: VehicleDetectedService,
    private sensorService: SensorDataService,
    private locationService: LocationService,
    private cdr: ChangeDetectorRef,
  ) {}

  /**
   * Lifecycle hook: initializes component on first view.
   * Triggers loadHistoryData() to fetch and process detection history
   * from locations, vehicles, and sensors.
   * @returns {void}
   */
  ngOnInit(): void {
    this.loadHistoryData();
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

  /**
   * Loads detection history data from backend via parallel streams using forkJoin.
   * Combines locationService.getAll(), vehicleService.getAll(), and sensorService.getAll()
   * with independent error handling (returns empty arrays on API failure).
   * Sets isLoading flag with finalize operator and calls processDetectionData() for aggregation.
   * Executed once on component init via ngOnInit().
   * @returns {void}
   */
  private loadHistoryData(): void {
    this.isLoading = true;
    this.errorMessage = null;

    forkJoin({
      locations: this.locationService.getAll().pipe(
        catchError((error) => {
          console.error('Error loading locations:', error);
          return of([]);
        }),
      ),
      vehicles: this.vehicleService.getAll().pipe(
        catchError((error) => {
          console.error('Error loading vehicles:', error);
          return of([]);
        }),
      ),
      sensors: this.sensorService.getAll().pipe(
        catchError((error) => {
          console.error('Error loading sensors:', error);
          return of([]);
        }),
      ),
    })
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.markForCheck();
        }),
        takeUntil(this.destroy$),
      )
      .subscribe(({ locations, vehicles, sensors }) => {
        this.processDetectionData(locations, vehicles, sensors);
        this.cdr.markForCheck();
      });
  }

  /**
   * Processes and aggregates detection history grouped by location ID.
   * Creates location map with initial device counts, processes vehicle detections,
   * processes sensor data, and populates detection records with aggregated counts.
   * Tracks latest timestamp per location across both vehicle and sensor detections.
   * Sorts records by lastUpdate descending (most recent first).
   * Calls calculateStats() to update overall statistics.
   * @param {Location[]} locations - Array of Location objects from backend
   * @param {VehicleDetected[]} vehicles - Array of vehicle detection records
   * @param {SensorData[]} sensors - Array of sensor data records
   * @returns {void}
   */
  private processDetectionData(
    locations: Location[],
    vehicles: VehicleDetected[],
    sensors: SensorData[],
  ): void {
    const locationMap = new Map<number, DetectionRecord>();

    const lastDateMap = new Map<number, Date | null>();
    locations.forEach((loc) => {
      locationMap.set(loc.id, {
        id: loc.id,
        description: loc.description || `Location ${loc.id}`,
        vehicleDetections: 0,
        sensorDetections: 0,
        lastUpdate: '',
      });
      lastDateMap.set(loc.id, null);
    });

    vehicles.forEach((vehicle) => {
      const locationId = vehicle.location?.id ?? vehicle.device?.location?.id ?? null;
      if (locationId) {
        if (!locationMap.has(locationId)) {
          locationMap.set(locationId, {
            id: locationId,
            description: `Location ${locationId}`,
            vehicleDetections: 0,
            sensorDetections: 0,
            lastUpdate: '',
          });
          lastDateMap.set(locationId, null);
        }
        const record = locationMap.get(locationId)!;
        record.vehicleDetections++;
        const ts = vehicle.timestamp ? new Date(vehicle.timestamp) : null;
        if (ts) {
          const prev = lastDateMap.get(locationId) || null;
          if (!prev || ts > prev) lastDateMap.set(locationId, ts);
        }
      }
    });

    sensors.forEach((sensor) => {
      const locationId = sensor.device?.location?.id;
      if (locationId) {
        if (!locationMap.has(locationId)) {
          locationMap.set(locationId, {
            id: locationId,
            description: `Location ${locationId}`,
            vehicleDetections: 0,
            sensorDetections: 0,
            lastUpdate: '',
          });
          lastDateMap.set(locationId, null);
        }
        const record = locationMap.get(locationId)!;
        record.sensorDetections++;
        const ts = sensor.timestamp ? new Date(sensor.timestamp) : null;
        if (ts) {
          const prev = lastDateMap.get(locationId) || null;
          if (!prev || ts > prev) lastDateMap.set(locationId, ts);
        }
      }
    });

    this.detectionHistory = Array.from(locationMap.values()).map((r) => {
      const d = lastDateMap.get(r.id);
      return {
        ...r,
        lastUpdate: d ? d.toLocaleString('en-US') : 'No data',
        lastTimestamp: d ? d.getTime() : 0,
      } as DetectionRecord;
    });

    this.detectionHistory.sort((a, b) => (b.lastTimestamp || 0) - (a.lastTimestamp || 0));

    this.calculateStats();
  }

  /**
   * Calculates aggregate statistics from detection history records.
   * Computes totalVehicleDetections, totalSensorDetections, and totalDetections (sum of both)
   * by reducing over detectionHistory array.
   * Updates overallStats object used to display summary cards in template.
   * Called internally by processDetectionData() after aggregation completes.
   * @returns {void}
   */
  private calculateStats(): void {
    this.overallStats.totalVehicleDetections = this.detectionHistory.reduce(
      (sum, item) => sum + item.vehicleDetections,
      0,
    );
    this.overallStats.totalSensorDetections = this.detectionHistory.reduce(
      (sum, item) => sum + item.sensorDetections,
      0,
    );
    this.overallStats.totalDetections =
      this.overallStats.totalVehicleDetections + this.overallStats.totalSensorDetections;
  }
}
