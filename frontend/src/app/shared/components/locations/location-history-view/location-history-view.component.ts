import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, Subject, forkJoin, of } from 'rxjs';
import { catchError, finalize, takeUntil } from 'rxjs/operators';
import { VehicleDetectedService } from '../../../../core/services/vehicle-detected.service';
import { SensorDataService } from '../../../../core/services/sensor-data.service';
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
 * LocationHistoryViewComponent
 *
 * Componente que muestra el historial de detecciones (vehículos y sensores) por ubicación.
 * Carga datos en tiempo real desde el backend.
 *
 * @component
 * @standalone true
 */
@Component({
  selector: 'app-location-history-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './location-history-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocationHistoryViewComponent implements OnInit, OnDestroy {
  /**
   * Subject para cleanup de suscripciones
   */
  private destroy$ = new Subject<void>();

  /**
   * Historial de detecciones agrupado por ubicación
   */
  detectionHistory: DetectionRecord[] = [];

  /**
   * Estadísticas generales
   */
  overallStats = {
    totalVehicleDetections: 0,
    totalSensorDetections: 0,
    totalDetections: 0,
  };

  /**
   * Estado de carga
   */
  isLoading = false;

  /**
   * Mensaje de error
   */
  errorMessage: string | null = null;

  /**
   * Constructor e inyección de dependencias
   */
  constructor(
    private vehicleService: VehicleDetectedService,
    private sensorService: SensorDataService,
    private locationService: LocationService,
    private cdr: ChangeDetectorRef,
  ) {}

  /**
   * Inicializa el componente
   */
  ngOnInit(): void {
    this.loadHistoryData();
  }

  /**
   * Hook del ciclo de vida: Limpia las suscripciones
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Carga los datos del historial desde el backend
   * @private
   * @returns {void}
   */
  private loadHistoryData(): void {
    this.isLoading = true;
    this.errorMessage = null;

    // Cargar ubicaciones, vehículos y sensores en paralelo
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
   * Procesa datos de detecciones (vehículos y sensores) agrupados por ubicación
   * @private
   * @param {Location[]} locations - Array de ubicaciones
   * @param {any[]} vehicles - Array de detecciones de vehículos
   * @param {any[]} sensors - Array de detecciones de sensores
   * @returns {void}
   */
  private processDetectionData(locations: Location[], vehicles: any[], sensors: any[]): void {
    const locationMap = new Map<number, DetectionRecord>();

    // Inicializar mapa con todas las ubicaciones
    const lastDateMap = new Map<number, Date | null>();
    locations.forEach((loc) => {
      locationMap.set(loc.id, {
        id: loc.id,
        description: loc.description || `Ubicación ${loc.id}`,
        vehicleDetections: 0,
        sensorDetections: 0,
        lastUpdate: '',
      });
      lastDateMap.set(loc.id, null);
    });

    // Contar detecciones de vehículos por ubicación y actualizar último timestamp
    vehicles.forEach((vehicle) => {
      // Try multiple paths where a vehicle's location can be stored
      const locationId =
        vehicle.location?.id ?? vehicle.device?.location?.id ?? vehicle.device?.locationId ?? null;
      if (locationId) {
        if (!locationMap.has(locationId)) {
          // create placeholder entry if vehicle references a location not in the locations list
          locationMap.set(locationId, {
            id: locationId,
            description: `Ubicación ${locationId}`,
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

    // Contar detecciones de sensores por ubicación y actualizar último timestamp
    sensors.forEach((sensor) => {
      const locationId = sensor.device?.location?.id;
      if (locationId) {
        if (!locationMap.has(locationId)) {
          locationMap.set(locationId, {
            id: locationId,
            description: `Ubicación ${locationId}`,
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

    // Convertir último timestamp a cadena legible y mostrar todas las ubicaciones
    this.detectionHistory = Array.from(locationMap.values()).map((r) => {
      const d = lastDateMap.get(r.id);
      return {
        ...r,
        lastUpdate: d ? d.toLocaleString('es-ES') : 'Sin datos',
        lastTimestamp: d ? d.getTime() : 0,
      } as DetectionRecord;
    });

    // Ordenar por última detección (más reciente primero, sin datos al final)
    this.detectionHistory.sort((a, b) => (b.lastTimestamp || 0) - (a.lastTimestamp || 0));

    this.calculateStats();
  }

  /**
   * Calcula las estadísticas generales
   * @private
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
