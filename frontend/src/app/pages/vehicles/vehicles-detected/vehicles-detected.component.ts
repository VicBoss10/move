import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VehicleTableComponent } from '../../../shared/components/vehicles/vehicle-table/vehicle-table.component';
import { VehicleFiltersComponent } from '../../../shared/components/vehicles/vehicle-filters/vehicle-filters.component';
import { Vehicle } from '../../../shared/components/vehicles/vehicle-table/vehicle-table.component';

/**
 * VehiclesDetectedComponent
 *
 * Página que muestra el listado de vehículos detectados en tiempo real.
 * Incluye filtros y tabla interactiva con detalles de cada vehículo.
 *
 * Características:
 * - Tabla responsive de vehículos detectados
 * - Filtros por tipo de vehículo y ubicación
 * - Actualización en tiempo real (mediante servicio)
 * - Indicadores visuales por tipo de vehículo
 * - Timestamps relativos
 *
 * @selector app-vehicles-detected
 * @standalone true
 * @imports CommonModule, VehicleTableComponent, VehicleFiltersComponent
 * @returns Página con vehículos detectados
 *
 * @example
 * <app-vehicles-detected />
 */
@Component({
  selector: 'app-vehicles-detected',
  standalone: true,
  imports: [CommonModule, VehicleTableComponent, VehicleFiltersComponent],
  templateUrl: './vehicles-detected.component.html',
})
export class VehiclesDetectedComponent {
  /**
   * Lista de vehículos a mostrar
   * En producción, esto vendría de un servicio
   * @type {Vehicle[]}
   */
  vehicles: Vehicle[] = [
    {
      id: 1,
      vehicleType: 'CAR',
      timestamp: new Date(),
      location: {
        id: 1,
        latitude: 4.7110,
        length: -74.0721,
        description: 'Carrera 7 con Calle 10',
      },
    },
    {
      id: 2,
      vehicleType: 'MOTORCYCLE',
      timestamp: new Date(Date.now() - 60000),
      location: {
        id: 2,
        latitude: 4.7150,
        length: -74.0750,
        description: 'Parque Arvi',
      },
    },
    {
      id: 3,
      vehicleType: 'TRUCK',
      timestamp: new Date(Date.now() - 300000),
      location: {
        id: 3,
        latitude: 4.7080,
        length: -74.0680,
        description: 'Centro Comercial',
      },
    },
    {
      id: 4,
      vehicleType: 'BUS',
      timestamp: new Date(Date.now() - 30000),
      location: {
        id: 4,
        latitude: 4.7200,
        length: -74.0800,
        description: 'Terminal de Transporte',
      },
    },
    {
      id: 5,
      vehicleType: 'CAR',
      timestamp: new Date(Date.now() - 10000),
      location: {
        id: 1,
        latitude: 4.7110,
        length: -74.0721,
        description: 'Carrera 7 con Calle 10',
      },
    },
  ];

  /**
   * Maneja el cambio de filtros
   * @param {any} filters - Filtros aplicados
   * @returns {void}
   */
  handleFilterChange(filters: any): void {
    // TODO: Filtrar la lista de vehículos según los filtros aplicados
    console.log('Filtros cambiados:', filters);
  }
}
