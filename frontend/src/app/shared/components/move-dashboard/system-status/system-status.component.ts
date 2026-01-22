import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SafeHtmlPipe } from '../../../pipe/safe-html.pipe';

interface StatusCard {
  label: string;
  icon: string;
  status: 'online' | 'offline' | 'active' | 'inactive';
  primary: string;      // El número o estado principal
  secondary?: string;   // Texto secundario (ej: "5 / 6 activos")
}

@Component({
  selector: 'app-system-status',
  standalone: true,
  imports: [CommonModule, SafeHtmlPipe],
  templateUrl: './system-status.component.html',
})
export class SystemStatusComponent implements OnInit {
  
  public icons = {
    systemIcon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor"/></svg>`,
    deviceIcon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C11.4477 2 11 2.44772 11 3V4H6C4.89543 4 4 4.89543 4 6V8H3C2.44772 8 2 8.44772 2 9C2 9.55228 2.44772 10 3 10H4V14H3C2.44772 14 2 14.4477 2 15C2 15.5523 2.44772 16 3 16H4V18C4 19.1046 4.89543 20 6 20H11V21C11 21.5523 11.4477 22 12 22C12.5523 22 13 21.5523 13 21V20H18C19.1046 20 20 19.1046 20 18V16H21C21.5523 16 22 15.5523 22 15C22 14.4477 21.5523 14 21 14H20V10H21C21.5523 10 22 9.55228 22 9C22 8.44772 21.5523 8 21 8H20V6C20 4.89543 19.1046 4 18 4H13V3C13 2.44772 12.5523 2 12 2ZM6 6H18V18H6V6Z" fill="currentColor"/></svg>`,
    cameraIcon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none"><rect x="3" y="7" width="13" height="10" rx="2" stroke="currentColor" stroke-width="2"/><path d="M17 9l4-2v10l-4-2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  };

  statusCards: StatusCard[] = [
    {
      label: 'Sistema',
      icon: this.icons.systemIcon,
      status: 'online',
      primary: '● ONLINE',
      secondary: 'Todos los servicios activos'
    },
    {
      label: 'Dispositivos',
      icon: this.icons.deviceIcon,
      status: 'online',
      primary: '5 / 6',
      secondary: 'Activos'
    },
    {
      label: 'Cámaras',
      icon: this.icons.cameraIcon,
      status: 'active',
      primary: '4/5',
      secondary: 'Activas'
    },
  ];

  ngOnInit() {
    // Aquí conectas con tu servicio backend
    // this.systemService.getStatus().subscribe(data => {
    //   this.statusCards = data;
    // });
  }

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
