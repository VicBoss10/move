import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HistoryFiltersComponent } from '../../../shared/components/environment-detail-charts/history-filters/history-filters.component';
import { SensorDataService } from '../../../core/services/sensor-data.service';
import { SensorData, SensorDataSearchCriteria } from '../../../core/models/sensor-data.model';
import { Observable, of, Subject } from 'rxjs';
import { catchError, finalize, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-environmental-history',
  standalone: true,
  imports: [CommonModule, HistoryFiltersComponent],
  templateUrl: './environmental-history.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnvironmentalHistoryComponent implements OnInit, OnDestroy {
  /**
   * Subject para cleanup de suscripciones
   */
  private destroy$ = new Subject<void>();

  /**
   * Observable que emite registros históricos
   */
  records$: Observable<SensorData[]> = of([]);

  /**
   * Registros actuales para la vista
   * @type {SensorData[]}
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
   * @type {string}
   */
  sortOrder: string = 'desc';

  constructor(private sensorDataService: SensorDataService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    // Cargar todos los datos inicialmente
    this.loadSensorData();
  }

  /**
   * Carga datos de sensores sin criterios (todos los datos)
   */
  private loadSensorData(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.sensorDataService.getAll()
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          console.error('Error cargando datos de historial:', error);
          this.errorMessage = 'Error al cargar los datos del historial';
          return of([]);
        }),
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe((data) => {
        this.filteredRecords = data.sort((a, b) => {
          const dateA = new Date(a.timestamp).getTime();
          const dateB = new Date(b.timestamp).getTime();
          return this.sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        });
        this.cdr.markForCheck();
      });
  }

  /**
   * Maneja el cambio de filtros desde HistoryFiltersComponent
   * @param criteria - Criterios de búsqueda
   */
  onFilterChange(criteria: SensorDataSearchCriteria): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.sensorDataService.search(criteria)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          console.error('Error buscando datos:', error);
          this.errorMessage = 'Error al buscar los datos';
          return of([]);
        }),
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe((data) => {
        this.filteredRecords = data.sort((a, b) => {
          const dateA = new Date(a.timestamp).getTime();
          const dateB = new Date(b.timestamp).getTime();
          return this.sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        });
        this.cdr.markForCheck(); // Força detección de cambios con OnPush
      });
  }

  /**
   * Invierte el orden de clasificación
   * @returns {void}
   */
  toggleSortOrder(): void {
    this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    this.filteredRecords = [...this.filteredRecords].reverse();
  }

  /**
   * Cleanup de suscripciones al destruir el componente
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
