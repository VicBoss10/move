import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, Subject, of, interval, BehaviorSubject } from 'rxjs';
import { catchError, map, shareReplay, switchMap, takeUntil, tap } from 'rxjs/operators';
import {
  VehicleStatsCardsComponent,
  VehicleStats,
} from '../../../shared/components/vehicles/vehicle-stats-cards/vehicle-stats-cards.component';
import { VehicleChartComponent } from '../../../shared/components/vehicles/vehicle-chart/vehicle-chart.component';
import { VehicleTypeChartComponent } from '../../../shared/components/vehicles/vehicle-type-chart/vehicle-type-chart.component';
import { VehicleHeatmapComponent } from '../../../shared/components/vehicles/vehicle-heatmap/vehicle-heatmap.component';
import { VehicleDetectedService } from '../../../core/services/vehicle-detected.service';
import { VehicleDetected } from '../../../core/models/vehicle.model';

/**
 * VehiclesStatsComponent
 *
 * Página que muestra estadísticas generales del monitoreo de vehículos.
 * Incluye tarjetas de métricas clave y gráficos de análisis.
 * Carga datos en tiempo real desde el backend via VehicleDetectedService.
 *
 * Características:
 * - Tarjetas con métricas principales desde el backend
 * - Gráfico de detecciones por hora
 * - Gráfico de tipos de vehículos
 * - Auto-refresco cada 30 segundos
 * - Manejo de errores con degradación elegante
 *
 * @selector app-vehicles-stats
 * @standalone true
 * @imports CommonModule, VehicleStatsCardsComponent, VehicleChartComponent
 * @returns Página con estadísticas de vehículos
 *
 * @example
 * <app-vehicles-stats />
 */
@Component({
  selector: 'app-vehicles-stats',
  standalone: true,
  imports: [
    CommonModule,
    VehicleStatsCardsComponent,
    VehicleChartComponent,
    VehicleTypeChartComponent,
    VehicleHeatmapComponent,
  ],
  templateUrl: './vehicles-stats.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VehiclesStatsComponent implements OnInit, OnDestroy {
  /**
   * Subject para cleanup de suscripciones
   */
  private destroy$ = new Subject<void>();

  /**
   * Subject para disparar recarga de estadísticas
   */
  private refreshTrigger$ = new BehaviorSubject<void>(undefined);

  /**
   * Observable stream de vehículos desde el backend
   */
  vehicles$!: Observable<VehicleDetected[]>;

  /**
   * Observable stream de estadísticas desde el backend
   */
  stats$!: Observable<VehicleStats>;

  /**
   * Estado de carga
   */
  isLoading = false;

  /**
   * Mensaje de error si hay
   */
  errorMessage: string | null = null;

  /**
   * Estadísticas por defecto
   */
  private readonly defaultStats: VehicleStats = {
    totalDetected: 0,
    carCount: 0,
    motorcycleCount: 0,
    busCount: 0,
    truckCount: 0,
    bicycleCount: 0,
  };

  /**
   * Constructor e inyección de dependencias
   */
  constructor(
    private vehicleService: VehicleDetectedService,
    private cdr: ChangeDetectorRef,
  ) {}

  /**
   * Hook del ciclo de vida: Carga estadísticas al inicializar
   */
  ngOnInit(): void {
    this.initializeStats();
    // Auto-refresco cada 30 segundos
    interval(30000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.refreshTrigger$.next());
  }

  /**
   * Hook del ciclo de vida: Limpia las suscripciones
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Inicializa los observables de vehículos y estadísticas con patrón reactivo
   * @private
   */
  private initializeStats(): void {
    this.vehicles$ = this.refreshTrigger$.pipe(
      tap(() => {
        this.isLoading = true;
        this.errorMessage = null;
        this.cdr.markForCheck();
      }),
      switchMap(() => this.vehicleService.getAll()),
      tap(() => {
        this.isLoading = false;
        this.cdr.markForCheck();
      }),
      catchError((error) => {
        console.error('Error loading vehicles:', error);
        this.errorMessage = 'Error al cargar vehículos';
        this.isLoading = false;
        this.cdr.markForCheck();
        return of([]);
      }),
      shareReplay(1),
    );

    this.stats$ = this.vehicles$.pipe(
      map((vehicles: VehicleDetected[]) => ({
        totalDetected: vehicles.length,
        carCount: vehicles.filter((v) => v.vehicleType === 'CAR').length,
        motorcycleCount: vehicles.filter((v) => v.vehicleType === 'MOTORCYCLE').length,
        busCount: vehicles.filter((v) => v.vehicleType === 'BUS').length,
        truckCount: vehicles.filter((v) => v.vehicleType === 'TRUCK').length,
        bicycleCount: vehicles.filter((v) => v.vehicleType === 'BICYCLE').length,
      })),
      catchError((error) => {
        console.error('Error calculating stats:', error);
        return of(this.defaultStats);
      }),
      shareReplay(1),
    );
  }
}
