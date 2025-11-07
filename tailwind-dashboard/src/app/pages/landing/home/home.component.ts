import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from '../../layout/header/header.component';
import { FooterComponent } from '../../layout/footer/footer.component';

// --- ¡PASO 1: DECLARAR LAS LIBRERÍAS GLOBALES! ---
// Esto le dice a TypeScript que espere encontrar estas variables en el objeto `window`.
declare var AOS: any;
declare var Swiper: any;
declare var GLightbox: any;
declare var Isotope: any;
declare var imagesLoaded: any;


@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, HeaderComponent, FooterComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'] // solo tu SCSS local
})
export class HomeComponent implements OnInit, OnDestroy {

  // Dejamos fuera 'main.js' porque ahora manejaremos su lógica aquí.
  private scripts: string[] = [
    '/assets/vendor/bootstrap/js/bootstrap.bundle.min.js',
    '/assets/vendor/aos/aos.js',
    '/assets/vendor/swiper/swiper-bundle.min.js',
    '/assets/vendor/glightbox/js/glightbox.min.js',
    '/assets/vendor/imagesloaded/imagesloaded.pkgd.min.js',
    '/assets/vendor/isotope-layout/isotope.pkgd.min.js',
    '/assets/js/main.js'
  ];

  private styles: string[] = [
    // Google Fonts
    'https://fonts.googleapis.com/css2?family=Nunito+Sans:ital,wght@0,200;0,300;0,400;0,600;0,700;0,800;0,900;1,200;1,300;1,400;1,600;1,700;1,800;1,900&family=Raleway:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap',
    // Resto de tus estilos
    '/assets/vendor/bootstrap/css/bootstrap.min.css',
    '/assets/vendor/bootstrap-icons/bootstrap-icons.css',
    '/assets/vendor/aos/aos.css',
    '/assets/vendor/swiper/swiper-bundle.min.css',
    '/assets/vendor/glightbox/css/glightbox.min.css',
    '/assets/css/main.css'
  ];

  private addedLinks: HTMLLinkElement[] = [];

  constructor() { }

  ngOnInit(): void {
    // Cargar estilos dinámicamente
    this.styles.forEach(stylePath => {
      const linkEl = document.createElement('link');
      linkEl.rel = 'stylesheet';
      linkEl.href = stylePath;
      linkEl.setAttribute('data-dynamic-style', 'true');
      document.head.appendChild(linkEl);
      this.addedLinks.push(linkEl);
    });

    // Cargar scripts dinámicamente
    this.scripts.forEach(scriptPath => {
      const scriptElement = document.createElement('script');
      scriptElement.src = scriptPath;
      scriptElement.type = 'text/javascript';
      scriptElement.async = true;
      scriptElement.setAttribute('data-dynamic-script', 'true');
      document.body.appendChild(scriptElement);
    });
  }

  ngOnDestroy(): void {
    // Eliminar estilos dinámicos
    this.addedLinks.forEach(link => {
      if (document.head.contains(link)) {
        document.head.removeChild(link);
      }
    });
    this.addedLinks = [];

    // Eliminar scripts dinámicos
    const dynamicScripts = document.querySelectorAll('script[data-dynamic-script="true"]');
    dynamicScripts.forEach(script => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    });
  }
}
