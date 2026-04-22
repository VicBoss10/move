import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HistoryFiltersComponent } from '../../../shared/components/environment-detail-charts/history-filters/history-filters.component';
import { SensorDataTableComponent } from '../../../shared/components/environment-detail-charts/sensor-data-table/sensor-data-table.component';
import { SensorDataService } from '../../../core/services/sensor-data.service';
import { SensorData, SensorDataSearchCriteria } from '../../../core/models/sensor-data.model';
import { Observable, of, Subject } from 'rxjs';
import { catchError, finalize, takeUntil } from 'rxjs/operators';

/**
 * EnvironmentalHistoryComponent (Page/Smart Container)
 *
 * Componente de página que orquesta la visualización del historial ambiental:
 * - Llama a SensorDataService para obtener datos
 * - Maneja el estado de filtros y paginación
 * - Renderiza HistoryFiltersComponent y SensorDataTableComponent
 *
 * @selector app-environmental-history
 * @standalone true
 */
@Component({
  selector: 'app-environmental-history',
  standalone: true,
  imports: [CommonModule, HistoryFiltersComponent, SensorDataTableComponent],
  templateUrl: './environmental-history.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnvironmentalHistoryComponent implements OnInit, OnDestroy {
  /**
   * Subject para cleanup de suscripciones
   */
  private destroy$ = new Subject<void>();

  /**
   * Registros actuales para la vista
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
   * Página actual de resultados
   */
  currentPage: number = 0;

  /**
   * Tamaño de página (registros por carga)
   */
  pageSize: number = 100;

  /**
   * Flag para indicar si hay más datos disponibles
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
   * Carga datos de sensores con paginación
   * @param append - Si es true, agrega los datos a los existentes
   */
  private loadSensorData(append: boolean = false): void {
    this.isLoading = true;
    this.errorMessage = '';

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
          console.error('Error cargando datos de historial:', error);
          this.errorMessage = 'Error al cargar los datos del historial';
          return of([]);
        }),
        finalize(() => {
          this.isLoading = false;
        }),
      )
      .subscribe((data) => {
        this.hasMoreData = data.length === this.pageSize;

        const sortedData = data.sort((a, b) => {
          const dateA = new Date(a.timestamp).getTime();
          const dateB = new Date(b.timestamp).getTime();
          return this.sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        });

        if (append) {
          this.filteredRecords = [...this.filteredRecords, ...sortedData];
        } else {
          this.filteredRecords = sortedData;
        }

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
    this.loadSensorData(false);
  }

  /**
   * Carga la siguiente página de resultados
   */
  loadMore(): void {
    if (!this.hasMoreData || this.isLoading) {
      return;
    }
    this.currentPage++;
    this.loadSensorData(true);
  }

  /**
   * Cleanup de suscripciones al destruir el componente
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
