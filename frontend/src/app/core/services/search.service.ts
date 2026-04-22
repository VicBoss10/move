import { Injectable } from '@angular/core';

export interface SearchEntry {
  title: string;
  path: string;
  section: string;
  keywords: string[];
  adminOnly?: boolean;
}

/**
 * Índice de rutas disponibles en el sistema.
 * adminOnly: true → solo visible para usuarios con rol admin.
 */
export const SEARCH_INDEX: SearchEntry[] = [
  // Menú principal
  {
    title: 'Inicio',
    path: '/dashboard/dashboard',
    section: 'Menú',
    keywords: ['home', 'inicio', 'dashboard'],
  },

  // Ambiente
  {
    title: 'CO₂',
    path: '/dashboard/environment/co2',
    section: 'Ambiente',
    keywords: ['co2', 'dioxido', 'carbono'],
  },
  {
    title: 'Gases',
    path: '/dashboard/environment/gases',
    section: 'Ambiente',
    keywords: ['gases', 'gas'],
  },
  {
    title: 'Partículas PM2.5 y PM10',
    path: '/dashboard/environment/particles',
    section: 'Ambiente',
    keywords: ['particulas', 'pm2.5', 'pm10', 'polvo'],
  },
  {
    title: 'Temperatura',
    path: '/dashboard/environment/temperature',
    section: 'Ambiente',
    keywords: ['temperatura', 'calor', 'frio'],
  },
  {
    title: 'Humedad',
    path: '/dashboard/environment/humidity',
    section: 'Ambiente',
    keywords: ['humedad', 'agua'],
  },
  {
    title: 'Histórico Ambiental',
    path: '/dashboard/environment/history',
    section: 'Ambiente',
    keywords: ['historico', 'historial', 'ambiental'],
  },

  // Vehículos
  {
    title: 'Vehículos Detectados',
    path: '/dashboard/vehicles/detected',
    section: 'Vehículos',
    keywords: ['vehiculos', 'detectados', 'deteccion', 'autos'],
  },
  {
    title: 'Estadísticas de Vehículos',
    path: '/dashboard/vehicles/stats',
    section: 'Vehículos',
    keywords: ['estadisticas', 'stats', 'conteo'],
  },

  // Cámara
  {
    title: 'Streaming',
    path: '/dashboard/cameras/streaming',
    section: 'Cámara',
    keywords: ['streaming', 'camara', 'video', 'rtsp', 'feed'],
  },
  {
    title: 'Estado del Modelo',
    path: '/dashboard/cameras/model-status',
    section: 'Cámara',
    keywords: ['modelo', 'estado', 'ia', 'deteccion', 'yolo'],
  },

  // Ubicaciones (admin only)
  {
    title: 'Registrar Ubicación',
    path: '/dashboard/locations/register-location',
    section: 'Ubicaciones',
    keywords: ['registrar', 'nueva', 'ubicacion', 'lugar'],
    adminOnly: true,
  },
  {
    title: 'Puntos de Monitoreo',
    path: '/dashboard/locations/monitoring',
    section: 'Ubicaciones',
    keywords: ['monitoreo', 'puntos', 'mapa'],
    adminOnly: true,
  },
  {
    title: 'Historial por Ubicación',
    path: '/dashboard/locations/history',
    section: 'Ubicaciones',
    keywords: ['historial', 'ubicacion'],
    adminOnly: true,
  },

  // Dispositivos (admin only)
  {
    title: 'Registrar Dispositivo',
    path: '/dashboard/devices/register-device',
    section: 'Dispositivos',
    keywords: ['registrar', 'dispositivo', 'sensor', 'camara', 'nuevo'],
    adminOnly: true,
  },
  {
    title: 'Dispositivos',
    path: '/dashboard/devices/device-status',
    section: 'Dispositivos',
    keywords: ['dispositivos', 'estado', 'status', 'lista'],
    adminOnly: true,
  },
  {
    title: 'Logs del Dispositivo',
    path: '/dashboard/devices/device-logs',
    section: 'Dispositivos',
    keywords: ['logs', 'registro', 'eventos', 'errores'],
    adminOnly: true,
  },

  // Análisis (admin only)
  {
    title: 'Series Temporales',
    path: '/dashboard/analysis/time-series',
    section: 'Análisis',
    keywords: ['series', 'temporales', 'tiempo', 'grafica', 'analisis'],
    adminOnly: true,
  },
  {
    title: 'Matriz de Correlación',
    path: '/dashboard/analysis/correlation',
    section: 'Análisis',
    keywords: ['correlacion', 'matriz', 'relacion'],
    adminOnly: true,
  },
  {
    title: 'Rezagos / Cross-correlation',
    path: '/dashboard/analysis/lag',
    section: 'Análisis',
    keywords: ['rezagos', 'lag', 'cross-correlation'],
    adminOnly: true,
  },
  {
    title: 'Análisis por Ubicación',
    path: '/dashboard/analysis/locations',
    section: 'Análisis',
    keywords: ['analisis', 'ubicacion', 'zona'],
    adminOnly: true,
  },
  {
    title: 'Exportar Datos',
    path: '/dashboard/analysis/export-data',
    section: 'Análisis',
    keywords: ['exportar', 'datos', 'csv', 'descargar', 'export'],
    adminOnly: true,
  },

  // Configuración (solo admin)
  {
    title: 'Usuarios',
    path: '/dashboard/configuration/users',
    section: 'Configuración',
    keywords: ['usuarios', 'admin', 'roles', 'keycloak'],
    adminOnly: true,
  },
  {
    title: 'Umbrales de Alerta',
    path: '/dashboard/configuration/alert-thresholds',
    section: 'Configuración',
    keywords: ['umbrales', 'alerta', 'thresholds', 'limites'],
    adminOnly: true,
  },
  {
    title: 'Parámetros del Sistema',
    path: '/dashboard/configuration/system-params',
    section: 'Configuración',
    keywords: ['parametros', 'sistema', 'config', 'ajustes'],
    adminOnly: true,
  },

  // Ayuda
  {
    title: 'Cómo Funciona',
    path: '/dashboard/help/how-it-works',
    section: 'Ayuda',
    keywords: ['como', 'funciona', 'ayuda', 'guia', 'documentacion'],
  },
  {
    title: 'Preguntas Frecuentes',
    path: '/dashboard/help/faq',
    section: 'Ayuda',
    keywords: ['faq', 'preguntas', 'frecuentes', 'dudas'],
  },
  {
    title: 'Arquitectura del Sistema',
    path: '/dashboard/help/architecture',
    section: 'Ayuda',
    keywords: ['arquitectura', 'sistema', 'diagrama', 'componentes'],
  },

  // Cuenta
  {
    title: 'Perfil',
    path: '/dashboard/profile',
    section: 'Cuenta',
    keywords: ['perfil', 'cuenta', 'usuario', 'mi perfil'],
  },
];

/**
 * SearchService — filtra el índice de rutas por query y permisos.
 * Normaliza acentos para que "análisis" matchee "analisis".
 */
@Injectable({ providedIn: 'root' })
export class SearchService {
  private normalize(str: string): string {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  search(query: string, isAdmin: boolean): SearchEntry[] {
    const q = this.normalize(query.trim());
    if (q.length < 2) return [];

    return SEARCH_INDEX.filter((e) => !e.adminOnly || isAdmin)
      .filter((e) => {
        const haystack = this.normalize([e.title, e.section, ...e.keywords].join(' '));
        return haystack.includes(q);
      })
      .slice(0, 8);
  }
}
