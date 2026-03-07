import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SensorData } from '../../../../core/models/sensor-data.model';

/**
 * SensorDataTableComponent (Shared/Presentational)
 *
 * Componente que presenta la tabla de datos históricos.
 * Recibe todos los datos y estados desde el componente padre.
 * Emite eventos cuando el usuario solicita cargar más registros.
 *
 * @selector app-sensor-data-table
 * @standalone true
 */
@Component({
  selector: 'app-sensor-data-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sensor-data-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SensorDataTableComponent {
  /**
   * Registros a mostrar en la tabla
   */
  @Input() filteredRecords: SensorData[] = [];

  /**
   * Flag de carga
   */
  @Input() isLoading: boolean = false;

  /**
   * Mensaje de error si ocurre
   */
  @Input() errorMessage: string = '';

  /**
   * Flag para indicar si hay más datos disponibles
   */
  @Input() hasMoreData: boolean = true;

  /**
   * Tamaño de página (para mostrar en mensaje)
   */
  @Input() pageSize: number = 100;

  /**
   * Evento cuando el usuario pide cargar más registros
   */
  @Output() loadMore = new EventEmitter<void>();

  /**
   * Invoca cargar más registros
   */
  onLoadMore(): void {
    this.loadMore.emit();
  }
}
