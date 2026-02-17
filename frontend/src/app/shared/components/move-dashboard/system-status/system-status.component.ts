import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SafeHtmlPipe } from '../../../pipe/safe-html.pipe';
import { DeviceService } from '../../../../core/services/device.service';
import { LocationService } from '../../../../core/services/location.service';
import { Observable, of, combineLatest, BehaviorSubject } from 'rxjs';
import { map, catchError, tap, shareReplay } from 'rxjs/operators';

/**
 * Estado de un componente del sistema (online/offline, activo/inactivo)
 * @interface StatusCard
 * @property {string} label - Nombre del componente
 * @property {string} icon - SVG como string
 * @property {'online' | 'offline' | 'active' | 'inactive'} status - Estado actual
 * @property {string} primary - Valor o estado principal
 * @property {string} [secondary] - Texto secundario opcional
 */
interface StatusCard {
  label: string;
  icon: string;
  status: 'online' | 'offline' | 'active' | 'inactive';
  primary: string;
  secondary?: string;
}

/**
 * Componente que muestra el estado del sistema, dispositivos y cámaras.
 * Presenta 3 tarjetas con indicadores visuales (online/offline) e información en tiempo real.
 * 
 * @selector app-system-status
 * @standalone true
 */
@Component({
  selector: 'app-system-status',
  standalone: true,
  imports: [CommonModule, SafeHtmlPipe],
  templateUrl: './system-status.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SystemStatusComponent {
  private isLoading$ = new BehaviorSubject<boolean>(true);

  /**
   * Observable que emite las tarjetas de estado del sistema
   */
  statusCards$!: Observable<StatusCard[]>;

  public icons = {
    systemIcon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor"/></svg>`,
    deviceIcon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C11.4477 2 11 2.44772 11 3V4H6C4.89543 4 4 4.89543 4 6V8H3C2.44772 8 2 8.44772 2 9C2 9.55228 2.44772 10 3 10H4V14H3C2.44772 14 2 14.4477 2 15C2 15.5523 2.44772 16 3 16H4V18C4 19.1046 4.89543 20 6 20H11V21C11 21.5523 11.4477 22 12 22C12.5523 22 13 21.5523 13 21V20H18C19.1046 20 20 19.1046 20 18V16H21C21.5523 16 22 15.5523 22 15C22 14.4477 21.5523 14 21 14H20V10H21C21.5523 10 22 9.55228 22 9C22 8.44772 21.5523 8 21 8H20V6C20 4.89543 19.1046 4 18 4H13V3C13 2.44772 12.5523 2 12 2ZM6 6H18V18H6V6Z" fill="currentColor"/></svg>`,
    cameraIcon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none"><rect x="3" y="7" width="13" height="10" rx="2" stroke="currentColor" stroke-width="2"/><path d="M17 9l4-2v10l-4-2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  };

  private readonly defaultStatusCards: StatusCard[] = [
    {
      label: 'Sistema',
      icon: this.icons.systemIcon,
      status: 'offline',
      primary: '● OFFLINE',
      secondary: 'Cargando datos...'
    },
    {
      label: 'Dispositivos',
      icon: this.icons.deviceIcon,
      status: 'offline',
      primary: '0 / 0',
      secondary: 'Activos'
    },
    {
      label: 'Ubicaciones',
      icon: this.icons.cameraIcon,
      status: 'active',
      primary: '0',
      secondary: 'Registradas'
    }
  ];

  constructor(
    private deviceService: DeviceService,
    private locationService: LocationService
  ) {
    this.statusCards$ = combineLatest([
      this.deviceService.getAll(),
      this.locationService.getAll()
    ]).pipe(
      map(([devices, locations]: [any[], any[]]) => {
        const activeDevices = (devices || []).filter((d: any) => d.state === 'ACTIVE').length;
        const totalDevices = (devices || []).length;
        const totalLocations = (locations || []).length;

        return [
          {
            label: 'Sistema',
            icon: this.icons.systemIcon,
            status: (totalDevices > 0 ? 'online' : 'offline') as 'online' | 'offline',
            primary: totalDevices > 0 ? '● ONLINE' : '● OFFLINE',
            secondary: totalDevices > 0 ? 'Todos los servicios activos' : 'Sin dispositivos'
          },
          {
            label: 'Dispositivos',
            icon: this.icons.deviceIcon,
            status: (activeDevices > 0 ? 'online' : 'offline') as 'online' | 'offline',
            primary: `${activeDevices} / ${totalDevices}`,
            secondary: 'Activos'
          },
          {
            label: 'Ubicaciones',
            icon: this.icons.cameraIcon,
            status: 'active' as const,
            primary: `${totalLocations}`,
            secondary: 'Registradas'
          },
        ];
      }),
      tap(() => this.isLoading$.next(false)),
      catchError((err) => {
        console.error('Error cargando estado del sistema:', err);
        this.isLoading$.next(false);
        return of([
          {
            label: 'Sistema',
            icon: this.icons.systemIcon,
            status: 'offline' as const,
            primary: '● OFFLINE',
            secondary: 'Error al cargar datos'
          },
          {
            label: 'Dispositivos',
            icon: this.icons.deviceIcon,
            status: 'offline' as const,
            primary: '0 / 0',
            secondary: 'Error'
          },
          {
            label: 'Ubicaciones',
            icon: this.icons.cameraIcon,
            status: 'inactive' as const,
            primary: '0',
            secondary: 'Error'
          },
        ]);
      }),
      shareReplay(1)
    );
  }

  /**
   * Retorna clases Tailwind para el fondo según estado
   * @param {string} status - Estado (online/offline/active/inactive)
   * @returns {string} Clases Tailwind CSS
   */
  getStatusColor(status: string): string {
    switch (status) {
      case 'online':
      case 'active':
        return 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800';
      case 'offline':
      case 'inactive':
        return 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800';
      default:
        return 'bg-gray-50 dark:bg-gray-900/10 border-gray-200 dark:border-gray-800';
    }
  }

  /**
   * Retorna clases Tailwind para el color del texto según estado
   * @param {string} status - Estado (online/offline/active/inactive)
   * @returns {string} Clases Tailwind CSS para color
   */
  getTextColor(status: string): string {
    switch (status) {
      case 'online':
      case 'active':
        return 'text-green-600 dark:text-green-400';
      case 'offline':
      case 'inactive':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  }
}
