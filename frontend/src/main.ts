import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { register as registerSwiperElements } from 'swiper/element/bundle';

registerSwiperElements();
async function loadRuntimeConfig() {
  try {
    const resp = await fetch('/assets/config.json', { cache: 'no-store' });
    if (!resp.ok) {
      return null;
    }
    return await resp.json();
  } catch (e) {
    return null;
  }
}

async function main() {
  const cfg = await loadRuntimeConfig();
  if (cfg && cfg.GOOGLE_MAPS_API_KEY) {
    (window as any).__GOOGLE_MAPS_API_KEY__ = cfg.GOOGLE_MAPS_API_KEY;
  }

  bootstrapApplication(AppComponent, appConfig)
    .catch((err) => console.error(err));
}

main();
