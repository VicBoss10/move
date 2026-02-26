import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, Subject, of, interval } from 'rxjs';
import { catchError, finalize, takeUntil, switchMap } from 'rxjs/operators';
import { VehicleStatsCardsComponent, VehicleStats } from '../../../shared/components/vehicles/vehicle-stats-cards/vehicle-stats-cards.component';
import { VehicleChartComponent } from '../../../shared/components/vehicles/vehicle-chart/vehicle-chart.component';
import { VehicleDetectedService } from '../../../core/services/vehicle-detected.service';

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
  imports: [CommonModule, VehicleStatsCardsComponent, VehicleChartComponent],
  templateUrl: './vehicles-stats.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VehiclesStatsComponent implements OnInit, OnDestroy {
  /**
   * Subject para cleanup de suscripciones
   */
  private destroy$ = new Subject<void>();

  /**
   * Observable stream de estadísticas desde el backend
   */
  stats$: Observable<VehicleStats> = of(this.getEmptyStats());

  /**
   * Estadísticas actuales para binding en el template
   */
  stats: VehicleStats = this.getEmptyStats();

  /**
   * Estado de carga
   */
  isLoading = false;

  /**
   * Mensaje de error si hay
   */
  errorMessage: string | null = null;

  /**
   * Constructor e inyección de dependencias
   */
  constructor(
    private vehicleService: VehicleDetectedService,
    private cdr: ChangeDetectorRef
  ) {}

  /**
   * Hook del ciclo de vida: Carga estadísticas al inicializar
   */
  ngOnInit(): void {
    this.loadStats();
    // Recargar estadísticas cada 30 segundos para mantener datos frescos
    interval(30000)
      .pipe(
        switchMap(() => this.createStatsObservable()),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  /**
   * Hook del ciclo de vida: Limpia las suscripciones
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Carga las estadísticas desde el backend
   * @private
   * @returns {void}
   */
  private loadStats(): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.stats$ = this.createStatsObservable();

    this.stats$
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (stats) => {
          this.stats = stats;
          this.cdr.markForCheck();
        }
      );
  }

  /**
   * Crea el Observable de estadísticas
   * @private
   * @returns {Observable<VehicleStats>}
   */
  private createStatsObservable(): Observable<VehicleStats> {
    return this.vehicleService.getAll().pipe(
      finalize(() => {
        this.isLoading = false;
        this.cdr.markForCheck();
      }),
      catchError((error) => {
        console.error('Error loading vehicle stats:', error);
        this.errorMessage = 'Error al cargar estadísticas de vehículos';
        return of(this.stats); // Mantener stats anteriores en caso de error
      }),
      // Mapear datos del backend al formato esperado por el componente
      switchMap((vehicles: any) => {
        const stats: VehicleStats = {
          totalDetected: vehicles.length,
          activeNow: 0, // TODO: Agregar lógica para detectar vehículos activos en tiempo real
          carCount: vehicles.filter((v: any) => v.vehicleType === 'CAR').length,
          motorcycleCount: vehicles.filter((v: any) => v.vehicleType === 'MOTORCYCLE').length,
          busCount: vehicles.filter((v: any) => v.vehicleType === 'BUS').length,
          truckCount: vehicles.filter((v: any) => v.vehicleType === 'TRUCK').length,
        };
        return of(stats);
      }),
      takeUntil(this.destroy$)
    );
  }

  /**
   * Retorna estadísticas vacías por defecto
   * @private
   * @returns {VehicleStats}
   */
  private getEmptyStats(): VehicleStats {
    return {
      totalDetected: 0,
      activeNow: 0,
      carCount: 0,
      motorcycleCount: 0,
      busCount: 0,
      truckCount: 0,
    };
  }
}
