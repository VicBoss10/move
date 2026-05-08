import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';

import { HistoryFiltersComponent } from '../../../shared/components/environment-detail-charts/history-filters/history-filters.component';
import { SensorHistoryChartsComponent } from '../../../shared/components/environment-detail-charts/sensor-history-charts/sensor-history-charts.component';
import { SensorDataTableComponent } from '../../../shared/components/environment-detail-charts/sensor-data-table/sensor-data-table.component';
import { SensorDataService } from '../../../core/services/sensor-data.service';
import { SensorData, SensorDataSearchCriteria } from '../../../core/models/sensor-data.model';
import { of, Subject } from 'rxjs';
import { catchError, finalize, takeUntil } from 'rxjs/operators';

/**
 * EnvironmentalHistoryComponent (Page/Smart Container)
 *
 * Orquesta la visualización del historial ambiental con gráficas y tabla.
 * Features:
 * - Filtrado de datos por fecha y parámetros a través de HistoryFiltersComponent
 * - Visualización gráfica de tendencias mediante SensorHistoryChartsComponent
 * - Tabla paginada de registros detallados con SensorDataTableComponent
 * - Gestión centralizada de estado de filtros, paginación y carga
 * - Integración de múltiples vistas de los mismos datos
 *
 * @selector app-environmental-history
 * @standalone true
 */
@Component({
  selector: 'app-environmental-history',
  standalone: true,
  imports: [HistoryFiltersComponent, SensorHistoryChartsComponent, SensorDataTableComponent],
  templateUrl: './environmental-history.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnvironmentalHistoryComponent implements OnInit, OnDestroy {
  /**
   * Subject para cleanup de suscripciones
   */
  private destroy$ = new Subject<void>();

  /**
   * Todos los registros para la gráfica (sin paginación)
   */
  allRecords: SensorData[] = [];

  /**
   * Registros actuales para la tabla (paginados)
   */
  filteredRecords: SensorData[] = [];

  /**
   * Flag de carga
   */
  isLoading: boolean = false;

  /**
   * Mensaje de error si ocurre
   */
  errorMessage: string = '';

  /**
   * Orden de clasificación (asc/desc)
   */
  sortOrder: string = 'desc';

  /**
   * Página actual de resultados de la tabla
   */
  currentPage: number = 0;

  /**
   * Tamaño de página (registros por carga)
   */
  pageSize: number = 100;

  /**
   * Flag para indicar si hay más datos disponibles en la tabla
   */
  hasMoreData: boolean = true;

  /**
   * Criterios de búsqueda actuales
   */
  currentCriteria: SensorDataSearchCriteria = {};

  constructor(
    private sensorDataService: SensorDataService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadSensorData();
  }

  /**
   * Carga todos los datos de sensores para la gráfica (sin paginación)
   */
  private loadSensorData(): void {
    const criteria: SensorDataSearchCriteria = {
      ...this.currentCriteria,
    };

    this.sensorDataService
      .search(criteria)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          console.error('Error cargando datos de historial:', error);
          this.errorMessage = 'Error al cargar los datos del historial';
          return of([]);
        }),
      )
      .subscribe((data) => {
        const sortedData = data.sort((a, b) => {
          const dateA = new Date(a.timestamp).getTime();
          const dateB = new Date(b.timestamp).getTime();
          return this.sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        });

        this.allRecords = sortedData;
        this.cdr.markForCheck();
      });
  }

  /**
   * Maneja el cambio de filtros desde HistoryFiltersComponent
   */
  onFilterChange(criteria: SensorDataSearchCriteria): void {
    this.currentPage = 0;
    this.currentCriteria = criteria;
    this.filteredRecords = [];
    this.hasMoreData = true;
    this.loadSensorData();
    this.loadTablePage();
  }

  /**
   * Carga la siguiente página de resultados para la tabla
   */
  loadMore(): void {
    if (!this.hasMoreData || this.isLoading) {
      return;
    }
    this.currentPage++;
    this.loadTablePage();
  }

  /**
   * Carga una página de la tabla con paginación de 100 registros
   */
  private loadTablePage(): void {
    this.isLoading = true;

    const criteria: SensorDataSearchCriteria = {
      ...this.currentCriteria,
      page: this.currentPage,
      size: this.pageSize,
    };

    this.sensorDataService
      .search(criteria)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          console.error('Error cargando más datos de tabla:', error);
          this.errorMessage = 'Error al cargar más datos';
          return of([]);
        }),
        finalize(() => {
          this.isLoading = false;
        }),
      )
      .subscribe((data) => {
        this.hasMoreData = data.length === this.pageSize;

        if (this.currentPage === 0) {
          this.filteredRecords = data;
        } else {
          this.filteredRecords = [...this.filteredRecords, ...data];
        }

        this.cdr.markForCheck();
      });
  }

  /**
   * Cleanup de suscripciones al destruir el componente
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
