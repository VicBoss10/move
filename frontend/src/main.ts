import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { register as registerSwiperElements } from 'swiper/element/bundle';

registerSwiperElements();
interface RuntimeConfig {
  GOOGLE_MAPS_API_KEY?: string;
  apiBaseUrl?: string;
  authBaseUrl?: string;
}

async function loadRuntimeConfig(): Promise<RuntimeConfig | null> {
  try {
    const resp = await fetch('/assets/config.json', { cache: 'no-store' });
    if (!resp.ok) {
      return null;
    }
    return await resp.json() as RuntimeConfig;
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const cfg = await loadRuntimeConfig();
  if (cfg && cfg.GOOGLE_MAPS_API_KEY) {
    (window as unknown as Record<string, unknown>)['__GOOGLE_MAPS_API_KEY__'] = cfg.GOOGLE_MAPS_API_KEY;
  }
  if (cfg && cfg.apiBaseUrl) {
    (window as unknown as Record<string, unknown>)['__API_BASE_URL__'] = cfg.apiBaseUrl;
  }
  if (cfg && cfg.authBaseUrl) {
    (window as unknown as Record<string, unknown>)['__AUTH_BASE_URL__'] = cfg.authBaseUrl;
  }

  bootstrapApplication(AppComponent, appConfig).catch((err) => console.error(err));
}

main();
