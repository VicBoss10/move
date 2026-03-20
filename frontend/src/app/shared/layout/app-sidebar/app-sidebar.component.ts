import { CommonModule } from "@angular/common";
import {
  Component,
  ElementRef,
  OnInit,
  QueryList,
  ViewChildren,
  ChangeDetectorRef,
  OnDestroy,
} from "@angular/core";
import { SidebarService } from "../../services/sidebar.service";
import { NavigationEnd, Router, RouterModule } from "@angular/router";
import { SafeHtmlPipe } from "../../pipe/safe-html.pipe";
import { AuthService } from "../../../core/services/auth.service";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";

type NavItem = {
  name: string;
  icon: string;
  path?: string;
  new?: boolean;
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
};

@Component({
  selector: "app-sidebar",
  standalone: true,
  imports: [CommonModule, RouterModule, SafeHtmlPipe],
  templateUrl: "./app-sidebar.component.html",
})
export class AppSidebarComponent implements OnInit, OnDestroy {
  // Main nav items - Core del Sistema
  navItems: NavItem[] = [
    {
      icon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none"><path d="M4 21V10M9 21V3M15 21V14M20 21V7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
      name: "Inicio",
      path: "/dashboard/dashboard",
    },
    {
      icon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none"><path d="M12 2C12 2 7 7 7 12a5 5 0 0 0 10 0c0-5-5-10-5-10Z" stroke="currentColor" stroke-width="2" fill="none"/><path d="M12 22v-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
      name: "Ambiente",
      subItems: [
        { name: "CO₂", path: "/dashboard/environment/co2" },
        { name: "Gases", path: "/dashboard/environment/gases" },
        { name: "Partículas PM2.5 y PM10", path: "/dashboard/environment/particles" },
        { name: "Temperatura", path: "/dashboard/environment/temperature" },
        { name: "Humedad", path: "/dashboard/environment/humidity" },
        { name: "Histórico Ambiental", path: "/dashboard/environment/history" },
      ],
    },
    {
      icon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="6" rx="2" stroke="currentColor" stroke-width="2"/><path d="M5 17v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2" stroke="currentColor" stroke-width="2"/><circle cx="7.5" cy="17.5" r="1.5" fill="currentColor"/><circle cx="16.5" cy="17.5" r="1.5" fill="currentColor"/></svg>`,
      name: "Vehículos",
      subItems: [
        { name: "Vehículos Detectados", path: "/dashboard/vehicles/detected" },
        { name: "Estadísticas", path: "/dashboard/vehicles/stats" },
      ],
    },
    {
      icon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none"><rect x="3" y="7" width="13" height="10" rx="2" stroke="currentColor" stroke-width="2"/><path d="M17 9l4-2v10l-4-2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
      name: "Cámara",
      subItems: [
        { name: "Streaming", path: "/dashboard/cameras/streaming" },
        { name: "Estado del Modelo", path: "/dashboard/cameras/model-status" },
      ],
    },
  ];

  // Others nav items - Ubicación, Dispositivos, Datos y Análisis
  othersItems: NavItem[] = [
    {
      icon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none"><path d="M12 21s-6-5.686-6-10A6 6 0 0 1 18 11c0 4.314-6 10-6 10Z" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="11" r="2" stroke="currentColor" stroke-width="2"/></svg>`,
      name: "Ubicaciones",
      subItems: [
        { name: "Registrar Ubicación", path: "/dashboard/locations/register-location" },
        { name: "Puntos de Monitoreo", path: "/dashboard/locations/monitoring" },
        { name: "Historial por Ubicación", path: "/dashboard/locations/history" },
      ],
    },
    {
      icon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none"><rect x="7" y="7" width="10" height="10" rx="2" stroke="currentColor" stroke-width="2"/><path d="M3 7v10M21 7v10M7 3h10M7 21h10" stroke="currentColor" stroke-width="2"/></svg>`,
      name: "Dispositivos",
      subItems: [
        { name: "Registrar Dispositivo", path: "/dashboard/devices/register-device" },
        { name: "Dispositivos", path: "/dashboard/devices/device-status" },
        { name: "Logs del Dispositivo", path: "/dashboard/devices/device-logs" },
      ],
    },
    {
      icon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none"><polyline points="4 17 10 11 14 15 20 9" stroke="currentColor" stroke-width="2" fill="none"/></svg>`,
      name: "Análisis",
      subItems: [
        { name: "Series Temporales", path: "/dashboard/analysis/time-series" },
        { name: "Matriz de Correlación", path: "/dashboard/analysis/correlation" },
        { name: "Rezagos / Cross-correlation", path: "/dashboard/analysis/lag" },
        { name: "Análisis por Ubicación", path: "/dashboard/analysis/locations" },
        { name: "Exportar Datos", path: "/dashboard/analysis/export-data" },
      ],
    },
    {
      icon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.09a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.09a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" stroke-width="2" fill="none"/></svg>`,
      name: "Configuración",
      subItems: [
        { name: "Usuarios", path: "/dashboard/configuration/users" },
        { name: "Umbrales de Alerta", path: "/dashboard/configuration/alert-thresholds" },
        { name: "Parámetros del Sistema", path: "/dashboard/configuration/system-params" },
      ],
    },
    {
      icon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="2"/><path d="M7 9h10M7 13h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
      name: "Logs del Sistema",
      subItems: [
        { name: "Eventos", path: "/blank" },
        { name: "Errores", path: "/blank" },
      ],
    },
    {
      icon: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none"><path d="M2 19V5a2 2 0 0 1 2-2h7v16H4a2 2 0 0 1-2-2Zm20 0V5a2 2 0 0 0-2-2h-7v16h7a2 2 0 0 0 2-2Z" stroke="currentColor" stroke-width="2" fill="none"/></svg>`,
      name: "Ayuda y Documentación",
      subItems: [
        { name: "Cómo Funciona", path: "/blank" },
        { name: "Arquitectura del Sistema", path: "/blank" },
      ],
    },
  ];

  openSubmenu: string | null = null;
  subMenuHeights: { [key: string]: number } = {};
  @ViewChildren("subMenu") subMenuRefs!: QueryList<ElementRef>;

  readonly isExpanded$;
  readonly isMobileOpen$;
  readonly isHovered$;

  private destroy$ = new Subject<void>();

  get isAdmin(): boolean {
    return this.authService.getUserInfo().roles
      .some((r: string) => r.toLowerCase() === 'admin');
  }

  constructor(
    public sidebarService: SidebarService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private authService: AuthService,
  ) {
    this.isExpanded$ = this.sidebarService.isExpanded$;
    this.isMobileOpen$ = this.sidebarService.isMobileOpen$;
    this.isHovered$ = this.sidebarService.isHovered$;
  }

  ngOnInit() {
    // Subscribe to router events
    this.router.events
      .pipe(takeUntil(this.destroy$))
      .subscribe((event) => {
        if (event instanceof NavigationEnd) {
          this.setActiveMenuFromRoute(this.router.url);
        }
      });

    // Initial load
    this.setActiveMenuFromRoute(this.router.url);
  }

  ngOnDestroy() {
    // Clean up subscriptions
    this.destroy$.next();
    this.destroy$.complete();
  }

  isActive(path: string): boolean {
    return this.router.url === path;
  }

  toggleSubmenu(section: string, index: number) {
    const key = `${section}-${index}`;

    if (this.openSubmenu === key) {
      this.openSubmenu = null;
      this.subMenuHeights[key] = 0;
    } else {
      this.openSubmenu = key;

      setTimeout(() => {
        const el = document.getElementById(key);
        if (el) {
          this.subMenuHeights[key] = el.scrollHeight;
          this.cdr.detectChanges(); // Ensure UI updates
        }
      });
    }
  }

  onSidebarMouseEnter() {
    if (!this.sidebarService.isExpandedSnapshot) {
      this.sidebarService.setHovered(true);
    }
  }

  private setActiveMenuFromRoute(currentUrl: string) {
    const menuGroups = [
      { items: this.navItems, prefix: "main" },
      { items: this.othersItems, prefix: "others" },
    ];

    menuGroups.forEach((group) => {
      group.items.forEach((nav, i) => {
        if (nav.subItems) {
          nav.subItems.forEach((subItem) => {
            if (currentUrl === subItem.path) {
              const key = `${group.prefix}-${i}`;
              this.openSubmenu = key;

              setTimeout(() => {
                const el = document.getElementById(key);
                if (el) {
                  this.subMenuHeights[key] = el.scrollHeight;
                  this.cdr.detectChanges(); // Ensure UI updates
                }
              });
            }
          });
        }
      });
    });
  }

  onSubmenuClick() {
    if (this.sidebarService.isMobileOpenSnapshot) {
      this.sidebarService.setMobileOpen(false);
    }
  }
}
