import { InjectionToken } from '@angular/core';

/**
 * Configuración de Google Maps para la aplicación MOVE.
 *
 * La API Key se carga desde:
 * - Desarrollo: Variable directa en este archivo
 * - Producción/Docker: Inyectada via script en index.html (window.__GOOGLE_MAPS_API_KEY__)
 *
 * Para obtener una API Key:
 * 1. Ir a https://console.cloud.google.com/
 * 2. Habilitar "Maps JavaScript API"
 * 3. Crear credenciales → API Key
 * 4. Restringir la key a "Maps JavaScript API" y al dominio de producción
 */

/** Token de inyección para la API Key de Google Maps */
export const GOOGLE_MAPS_API_KEY = new InjectionToken<string>('GOOGLE_MAPS_API_KEY');

/**
 * Obtiene la API Key de Google Maps desde la configuración runtime o el valor por defecto.
 * En Docker, el entrypoint de nginx inyecta window.__GOOGLE_MAPS_API_KEY__.
 * @returns La API Key de Google Maps
 */
export function getGoogleMapsApiKey(): string {
  // Primero intenta la config runtime (Docker/producción)
  const runtimeKey = (window as any).__GOOGLE_MAPS_API_KEY__;
  if (runtimeKey && runtimeKey !== '__GOOGLE_MAPS_KEY_PLACEHOLDER__') {
    return runtimeKey;
  }
  return '';
}

/**
 * Configuración por defecto del mapa centrado en Pasto, Nariño, Colombia
 */
export const DEFAULT_MAP_CONFIG = {
  /** Centro del mapa: Pasto, Nariño (fallback si no se obtiene geolocalización) */
  center: { lat: 1.2136, lng: -77.2811 } as google.maps.LatLngLiteral,
  /** Nivel de zoom por defecto */
  zoom: 14,
  /** Opciones del mapa */
  options: {
    mapId: 'MOVE_MAP_ID',
    streetViewControl: false,
    mapTypeControl: true,
    fullscreenControl: true,
    zoomControl: true,
    mapTypeId: 'roadmap',
  } as google.maps.MapOptions,
};
