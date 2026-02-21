import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, of } from 'rxjs';
import { catchError, shareReplay } from 'rxjs/operators';
import { CameraService } from '../../../../core/services/camera.service';
import { Camera } from '../../../../core/models/camera.model';

/**
 * Interfaz para ubicación de cámara
 * @interface Location
 * @property {number} id - ID único
 * @property {number} latitude - Latitud
 * @property {number} length - Longitud
 * @property {string} description - Descripción de ubicación
 */
export interface Location {
  id: number;
  latitude: number;
  length: number;
  description: string;
}

/**
 * Interfaz para dispositivo de cámara
 * @interface CameraDevice
 * @property {number} id - ID único
 * @property {string} name - Nombre del dispositivo
 * @property {'ACTIVE'|'INACTIVE'|'FAILING'} state - Estado del dispositivo
 * @property {Location} location - Ubicación del dispositivo
 */
export interface CameraDevice {
  id: number;
  name: string;
  state: 'ACTIVE' | 'INACTIVE' | 'FAILING';
  location: Location;
}

/**
 * CameraDeviceTableComponent
 *
 * Componente que muestra una tabla de dispositivos de cámara.
 * Incluye estado, ubicación y acciones.
 *
 * Características:
 * - Tabla responsiva con estado visual
 * - Indicadores de color por estado (ACTIVE, INACTIVE, FAILING)
 * - Datos dinámicos del servicio CameraService
 * - Responsive en mobile/tablet/desktop
 * - Dark mode support
 * - OnPush change detection para mejor performance
 *
 * @selector app-camera-device-table
 * @standalone true
 * @imports CommonModule
 * @returns Tabla de dispositivos de cámara
 *
 * @example
 * <app-camera-device-table />
 */
@Component({
  selector: 'app-camera-device-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './camera-device-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CameraDeviceTableComponent {
  /**
   * Cameras Observable - carga datos dinámicamente del servicio
   * @type {Observable<Camera[]>}
   */
  cameras$: Observable<Camera[]>;

  constructor(private cameraService: CameraService) {
    this.cameras$ = this.cameraService.getAll().pipe(
      catchError((error) => {
        console.error('Error loading cameras:', error);
        return of([] as Camera[]);
      }),
      shareReplay(1)
    );
  }

  /**
   * Obtiene el color del badge según el estado
   * @param {string} state - Estado del dispositivo
   * @returns {string} Clases Tailwind para el color
   */
  getStateColor(state: string): string {
    const stateColors: Record<string, string> = {
      ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      INACTIVE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      FAILING: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    };
    return stateColors[state] || stateColors['INACTIVE'];
  }

  /**
   * Obtiene la etiqueta traducida del estado
   * @param {string} state - Estado del dispositivo
   * @returns {string} Etiqueta en español
   */
  getStateLabel(state: string): string {
    const stateLabels: Record<string, string> = {
      ACTIVE: 'Activa',
      INACTIVE: 'Inactiva',
      FAILING: 'Fallando',
    };
    return stateLabels[state] || state;
  }

  /**
   * Obtiene el ícono para el estado
   * @param {string} state - Estado del dispositivo
   * @returns {string} Emoji o símbolo
   */
  getStateIcon(state: string): string {
    const stateIcons: Record<string, string> = {
      ACTIVE: '🟢',
      INACTIVE: '🟡',
      FAILING: '🔴',
    };
    return stateIcons[state] || '⚪';
  }

  /**
   * Formatea las coordenadas para visualización
   * @param {number} latitude - Latitud
   * @param {number} longitude - Longitud
   * @returns {string} Coordenadas formateadas
   */
  formatCoordinates(latitude: number, longitude: number): string {
    return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  }
}
