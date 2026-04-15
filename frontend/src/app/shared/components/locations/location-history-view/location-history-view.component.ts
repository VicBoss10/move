import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
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
  imports: [
    CommonModule,
  ],
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
    private cdr: ChangeDetectorRef
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
        })
      ),
      vehicles: this.vehicleService.getAll().pipe(
        catchError((error) => {
          console.error('Error loading vehicles:', error);
          return of([]);
        })
      ),
      sensors: this.sensorService.getAll().pipe(
        catchError((error) => {
          console.error('Error loading sensors:', error);
          return of([]);
        })
      ),
    })
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.markForCheck();
        }),
        takeUntil(this.destroy$)
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
    locations.forEach((loc) => {
      locationMap.set(loc.id, {
        id: loc.id,
        description: loc.description || `Ubicación ${loc.id}`,
        vehicleDetections: 0,
        sensorDetections: 0,
        lastUpdate: new Date().toLocaleString('es-ES'),
      });
    });

    // Contar detecciones de vehículos por ubicación
    vehicles.forEach((vehicle) => {
      const locationId = vehicle.location?.id;
      if (locationId && locationMap.has(locationId)) {
        const record = locationMap.get(locationId)!;
        record.vehicleDetections++;
      }
    });

    // Contar detecciones de sensores por ubicación
    sensors.forEach((sensor) => {
      const locationId = sensor.device?.location?.id;
      if (locationId && locationMap.has(locationId)) {
        const record = locationMap.get(locationId)!;
        record.sensorDetections++;
      }
    });

    this.detectionHistory = Array.from(locationMap.values()).filter(
      (record) => record.vehicleDetections > 0 || record.sensorDetections > 0
    );

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
      0
    );
    this.overallStats.totalSensorDetections = this.detectionHistory.reduce(
      (sum, item) => sum + item.sensorDetections,
      0
    );
    this.overallStats.totalDetections =
      this.overallStats.totalVehicleDetections + this.overallStats.totalSensorDetections;
  }


}
