/**
* Template Name: Strategy
* Template URL: https://bootstrapmade.com/strategy-bootstrap-agency-template/
* Updated: Jun 06 2025 with Bootstrap v5.3.6
* Author: BootstrapMade.com
* License: https://bootstrapmade.com/license/
*/

(function() {
  "use strict";

  /**
   * Apply .scrolled class to the body as the page is scrolled down
   */
  function toggleScrolled() {
    const selectBody = document.querySelector('body');
    const selectHeader = document.querySelector('#header');
    // proteger contra selectHeader null.
    if (!selectHeader) return;
    const hasSticky = selectHeader.classList.contains('scroll-up-sticky') ||
                      selectHeader.classList.contains('sticky-top') ||
                      selectHeader.classList.contains('fixed-top');
    if (!hasSticky) return;
    if (!selectBody) return;
    window.scrollY > 100 ? selectBody.classList.add('scrolled') : selectBody.classList.remove('scrolled');
  }

  document.addEventListener('scroll', toggleScrolled);
  window.addEventListener('load', toggleScrolled);

  /**
   * Mobile nav toggle
   */
  const mobileNavToggleBtn = document.querySelector('.mobile-nav-toggle');

  function mobileNavToogle() {
    document.querySelector('body')?.classList.toggle('mobile-nav-active');
    if (mobileNavToggleBtn) {
      mobileNavToggleBtn.classList.toggle('bi-list');
      mobileNavToggleBtn.classList.toggle('bi-x');
    }
  }
  if (mobileNavToggleBtn) {
    mobileNavToggleBtn.addEventListener('click', mobileNavToogle);
  }

  // Hide mobile nav on same-page/hash links
  document.querySelectorAll('#navmenu a').forEach(navmenu => {
    navmenu.addEventListener('click', () => {
      if (document.querySelector('.mobile-nav-active')) {
        if (mobileNavToggleBtn) mobileNavToogle();
      }
    });
  });

  /**
   * Toggle mobile nav dropdowns
   */
  document.querySelectorAll('.navmenu .toggle-dropdown').forEach(navmenu => {
    navmenu.addEventListener('click', function(e) {
      e.preventDefault();
      this.parentNode.classList.toggle('active');
      this.parentNode.nextElementSibling.classList.toggle('dropdown-active');
      e.stopImmediatePropagation();
    });
  });

  /**
   * Preloader
   */
  const preloader = document.querySelector('#preloader');
  if (preloader) {
    window.addEventListener('load', () => {
      preloader.remove();
    });
  }

  /**
   * Scroll top button
   */
  let scrollTop = document.querySelector('.scroll-top');

  function toggleScrollTop() {
    if (scrollTop) {
      window.scrollY > 100 ? scrollTop.classList.add('active') : scrollTop.classList.remove('active');
    }
  }
  if (scrollTop) {
    scrollTop.addEventListener('click', (e) => {
      e.preventDefault();
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }

  window.addEventListener('load', toggleScrollTop);
  document.addEventListener('scroll', toggleScrollTop);

  /**
   * Animation on scroll function and init
   */
  function aosInit() {
    AOS.init({
      duration: 600,
      easing: 'ease-in-out',
      once: true,
      mirror: false
    });
  }
  window.addEventListener('load', aosInit);

  /**
   * Init swiper sliders
   */
  function initSwiper() {
    document.querySelectorAll(".init-swiper").forEach(function(swiperElement) {
      const configEl = swiperElement.querySelector(".swiper-config");
      let config = {};
      if (configEl && configEl.innerHTML.trim()) {
        try {
          config = JSON.parse(configEl.innerHTML.trim());
        } catch (err) {
          console.warn('Swiper config JSON parse error:', err);
          config = {};
        }
      }

      if (typeof Swiper !== 'function') {
        console.warn('Swiper library not loaded.');
        return;
      }

      if (swiperElement.classList.contains("swiper-tab")) {
        if (typeof initSwiperWithCustomPagination === 'function') {
          initSwiperWithCustomPagination(swiperElement, config);
        } else {
          new Swiper(swiperElement, config);
        }
      } else {
        new Swiper(swiperElement, config);
      }
    });
  }

  window.addEventListener("load", initSwiper);

  /**
   * Initiate glightbox with full config
   */
  function initGLightbox() {
    const glightbox = GLightbox({
      selector: '.glightbox',
      touchNavigation: true,
      loop: true,
      autoplayVideos: true,
      closeButton: true, // mostrar botón cerrar
      closeOnOutsideClick: true,
      preload: false,
      zoomable: true,
      draggable: true,
      // Personalizar elementos UI
      elements: null,
      // Configurar aspecto
      skin: 'clean',
      // Habilitar descripción y título
      descPosition: 'bottom',
      moreLength: 60,
      slideEffect: 'fade',
      // Configurar controles
      controls: {
        close: true,
        zoom: true,
        download: false // quitar botón descarga
      },
      // Personalizar botones prev/next
      prevImg: 'Previous image',
      nextImg: 'Next image',
      closeLabel: 'Close'
    });
  }

  // Inicializar en carga y exponer para re-init en SPA
  window.addEventListener('load', initGLightbox);
  window.initGLightbox = initGLightbox;

  /**
   * Init isotope layout and filters
   */
  function initIsotope() {
    if (typeof Isotope !== 'function') {
      console.warn('Isotope not loaded, skipping isotope init.');
      return;
    }
    if (typeof imagesLoaded !== 'function') {
      console.warn('imagesLoaded not loaded, Isotope init may run before images are ready.');
    }

    document.querySelectorAll('.isotope-layout').forEach(function(isotopeItem) {
      const container = isotopeItem.querySelector('.isotope-container');
      if (!container) return;

      const doInit = function() {
        // avoid double-init
        if (container._isotopeInitialized) return;
        const layout = isotopeItem.getAttribute('data-layout') ?? 'masonry';
        const filter = isotopeItem.getAttribute('data-default-filter') ?? '*';
        const sort = isotopeItem.getAttribute('data-sort') ?? 'original-order';

        const iso = new Isotope(container, {
          itemSelector: '.isotope-item',
          layoutMode: layout,
          filter: filter,
          sortBy: sort
        });
        container._isotopeInitialized = true;
        container._isotopeInstance = iso;

        // listeners de filtro
        const filters = isotopeItem.querySelectorAll('.isotope-filters li, .portfolio-filters li');
        filters.forEach(function(filterBtn) {
          filterBtn.addEventListener('click', function(e) {
            e.preventDefault();
            const active = isotopeItem.querySelector('.isotope-filters .filter-active, .portfolio-filters .filter-active');
            if (active) active.classList.remove('filter-active');
            this.classList.add('filter-active');

            const f = this.getAttribute('data-filter') || '*';
            if (container._isotopeInstance) container._isotopeInstance.arrange({ filter: f });

            if (typeof aosInit === 'function') aosInit();
          }, false);
        });
      };

      // use imagesLoaded if available, otherwise init immediately
      if (typeof imagesLoaded === 'function') {
        imagesLoaded(container, doInit);
      } else {
        doInit();
      }
    });
  }

  // run on full page load and expose to window for SPA re-init
  window.addEventListener('load', initIsotope);
  window.initIsotope = initIsotope;

  /**
   * Frequently Asked Questions Toggle
   */
  document.querySelectorAll('.faq-item h3, .faq-item .faq-toggle, .faq-item .faq-header').forEach((faqItem) => {
    faqItem.addEventListener('click', () => {
      faqItem.parentNode.classList.toggle('faq-active');
    });
  });

  /**
   * Correct scrolling position upon page load for URLs containing hash links.
   */
  window.addEventListener('load', function(e) {
    if (window.location.hash) {
      if (document.querySelector(window.location.hash)) {
        setTimeout(() => {
          let section = document.querySelector(window.location.hash);
          let scrollMarginTop = getComputedStyle(section).scrollMarginTop;
          window.scrollTo({
            top: section.offsetTop - parseInt(scrollMarginTop),
            behavior: 'smooth'
          });
        }, 100);
      }
    }
  });

  /**
   * Navmenu Scrollspy
   */
  let navmenulinks = document.querySelectorAll('.navmenu a');

  function navmenuScrollspy() {
    navmenulinks.forEach(navmenulink => {
      if (!navmenulink.hash) return;
      let section = document.querySelector(navmenulink.hash);
      if (!section) return;
      let position = window.scrollY + 200;
      if (position >= section.offsetTop && position <= (section.offsetTop + section.offsetHeight)) {
        document.querySelectorAll('.navmenu a.active').forEach(link => link.classList.remove('active'));
        navmenulink.classList.add('active');
      } else {
        navmenulink.classList.remove('active');
      }
    })
  }
  window.addEventListener('load', navmenuScrollspy);
  document.addEventListener('scroll', navmenuScrollspy);

  // Delegated handler para links del nav (funciona aunque Angular re-renderice)
  // Reemplaza el handler anterior por este más robusto:
  document.addEventListener('click', function (e) {
    const a = e.target.closest('.navmenu a, a[href^="#"]');
    if (!a) return;

    const href = a.getAttribute('href') || '';

    // Ignore external links or links that open in new tab
    if (/^(https?:)?\/\//.test(href) || a.target === '_blank') return;

    // If href is just "#" or empty, prevent default and do nothing
    if (href === '#' || href === '') {
      e.preventDefault();
      return;
    }

    // Normalize fragment: handle "#section", "index.html#section", "/#section"
    let fragment = null;
    if (href.startsWith('#')) {
      fragment = href;
    } else {
      const hashIndex = href.indexOf('#');
      if (hashIndex !== -1) fragment = href.slice(hashIndex);
    }

    if (fragment) {
      const target = document.querySelector(fragment);
      if (target) {
        e.preventDefault();

        // Close mobile nav if open
        if (document.querySelector('.mobile-nav-active') && typeof mobileNavToogle === 'function') {
          mobileNavToogle();
        }

        // Compute offset with scrollMarginTop if available
        const scrollMarginTop = parseInt(getComputedStyle(target).scrollMarginTop) || 0;
        const top = target.offsetTop - scrollMarginTop;

        // Smooth scroll and update URL hash without reloading
        window.history.pushState(null, '', fragment);
        window.scrollTo({ top: top, behavior: 'smooth' });

        // Update active classes (run scrollspy)
        if (typeof navmenuScrollspy === 'function') {
          setTimeout(navmenuScrollspy, 350);
        }
      }
    }
  });

})();