import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { VehicleTableComponent } from '../../../shared/components/vehicles/vehicle-table/vehicle-table.component';
import { VehicleFiltersComponent } from '../../../shared/components/vehicles/vehicle-filters/vehicle-filters.component';
import { VehicleDetectedService } from '../../../core/services/vehicle-detected.service';
import { VehicleDetected, VehicleSearchCriteria } from '../../../core/models/vehicle.model';
import { Observable, of, Subject, BehaviorSubject } from 'rxjs';
import { catchError, map, shareReplay, switchMap, tap } from 'rxjs/operators';

@Component({
  selector: 'app-vehicles-detected',
  standalone: true,
  imports: [CommonModule, VehicleTableComponent, VehicleFiltersComponent],
  templateUrl: './vehicles-detected.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VehiclesDetectedComponent implements OnInit, OnDestroy {
  /**
   * Subject para cleanup de suscripciones
   */
  private destroy$ = new Subject<void>();

  /**
   * Subject para disparar búsquedas con filtros
   */
  private searchTrigger$ = new BehaviorSubject<VehicleSearchCriteria | null>(null);

  /**
   * Observable que emite los vehículos detectados (ordenados por fecha)
   */
  vehicles$!: Observable<VehicleDetected[]>;
  /** Estadísticas por tipo derivadas de `vehicles$` */
  stats$!: Observable<
    Array<{ type: string; count: number; percent: number; trend?: number[]; trendMax?: number }>
  >;

  /**
   * Flag de carga
   */
  isLoading: boolean = false;

  /**
   * Mensaje de error si ocurre
   */
  errorMessage: string = '';

  constructor(
    private vehicleDetectedService: VehicleDetectedService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.initializeVehicles();
  }

  /**
   * Inicializa el observable de vehículos con patrón reactivo
   * @private
   */
  private initializeVehicles(): void {
    this.vehicles$ = this.searchTrigger$.pipe(
      tap(() => {
        this.isLoading = true;
        this.errorMessage = '';
        this.cdr.markForCheck();
      }),
      switchMap((criteria) =>
        criteria
          ? this.vehicleDetectedService.search(criteria)
          : this.vehicleDetectedService.getAll(),
      ),
      map((data) => {
        if (!Array.isArray(data)) {
          console.warn('Backend retornó respuesta no-JSON:', data);
          return [];
        }
        // Ordenar por fecha (más recientes primero)
        return data.sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        );
      }),
      tap(() => {
        this.isLoading = false;
        this.cdr.markForCheck();
      }),
      catchError((error) => {
        console.error('Error cargando vehículos:', error);
        this.errorMessage = 'Error al cargar los vehículos';
        this.isLoading = false;
        this.cdr.markForCheck();
        return of([]);
      }),
      shareReplay(1),
    );

    // Derivar estadísticas por tipo
    this.stats$ = this.vehicles$.pipe(
      map((vehicles) => {
        const types = ['CAR', 'BUS', 'MOTORCYCLE', 'BICYCLE', 'TRUCK'];
        const total = vehicles.length;
        // Prepare 12-hour slots for trend (last 12 hours)
        const now = new Date();
        const slots: { start: Date; end: Date }[] = [];
        for (let i = 11; i >= 0; i--) {
          const start = new Date(now.getTime() - i * 3600000);
          const end = new Date(start.getTime() + 3600000);
          slots.push({ start, end });
        }

        return types
          .map((t) => {
            const count = vehicles.filter((v) => v.vehicleType === t).length;
            // trend: counts per slot
            const trend = slots.map(
              (s) =>
                vehicles.filter(
                  (v) =>
                    v.vehicleType === t &&
                    new Date(v.timestamp) >= s.start &&
                    new Date(v.timestamp) < s.end,
                ).length,
            );
            const trendMax = Math.max(...trend, 1);
            const percent = total > 0 ? Math.round((count / total) * 100) : 0;
            return { type: t, count, percent, trend, trendMax };
          })
          .filter((s) => s.count > 0);
      }),
      shareReplay(1),
    );
  }

  /**
   * Maneja el cambio de filtros desde VehicleFiltersComponent
   * @param criteria - Criterios de búsqueda
   */
  handleFilterChange(criteria: VehicleSearchCriteria): void {
    this.searchTrigger$.next(criteria);
  }

  /**
   * Cleanup de suscripciones al destruir el componente
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
