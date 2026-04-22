import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { authRedirectGuard } from './core/guards/auth-redirect.guard';
import { roleGuard } from './core/guards/role.guard';

const DASHBOARD_ROUTES: Routes = [
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./pages/dashboard/move/dashboard.component').then((m) => m.DashboardComponent),
    title: 'Inicio',
  },
  {
    path: 'environment',
    children: [
      {
        path: 'co2',
        loadComponent: () =>
          import('./pages/environment/co2-detail/co2-detail.component').then(
            (m) => m.Co2DetailComponent,
          ),
        title: 'CO₂',
      },
      {
        path: 'gases',
        loadComponent: () =>
          import('./pages/environment/gases-detail/gases-detail.component').then(
            (m) => m.GasesDetailComponent,
          ),
        title: 'Gases',
      },
      {
        path: 'particles',
        loadComponent: () =>
          import('./pages/environment/particles-detail/particles-detail.component').then(
            (m) => m.ParticlesDetailComponent,
          ),
        title: 'Partículas',
      },
      {
        path: 'temperature',
        loadComponent: () =>
          import('./pages/environment/temperature-detail/temperature-detail.component').then(
            (m) => m.TemperatureDetailComponent,
          ),
        title: 'Temperatura',
      },
      {
        path: 'humidity',
        loadComponent: () =>
          import('./pages/environment/humidity-detail/humidity-detail.component').then(
            (m) => m.HumidityDetailComponent,
          ),
        title: 'Humedad',
      },
      {
        path: 'history',
        loadComponent: () =>
          import('./pages/environment/environmental-history/environmental-history.component').then(
            (m) => m.EnvironmentalHistoryComponent,
          ),
        title: 'Histórico Ambiental',
      },
    ],
  },
  {
    path: 'vehicles',
    children: [
      {
        path: 'detected',
        loadComponent: () =>
          import('./pages/vehicles/vehicles-detected/vehicles-detected.component').then(
            (m) => m.VehiclesDetectedComponent,
          ),
        title: 'Vehículos Detectados',
      },
      {
        path: 'stats',
        loadComponent: () =>
          import('./pages/vehicles/vehicles-stats/vehicles-stats.component').then(
            (m) => m.VehiclesStatsComponent,
          ),
        title: 'Estadísticas de Vehículos',
      },
    ],
  },
  {
    path: 'cameras',
    children: [
      {
        path: 'streaming',
        loadComponent: () =>
          import('./pages/cameras/camera-streaming/camera-streaming.component').then(
            (m) => m.CameraStreamingComponent,
          ),
        title: 'Streaming de Cámaras',
      },
      {
        path: 'model-status',
        loadComponent: () =>
          import('./pages/cameras/camera-model-status/camera-model-status.component').then(
            (m) => m.CameraModelStatusComponent,
          ),
        title: 'Estado del Modelo',
      },
    ],
  },
  {
    path: 'devices',
    children: [
      {
        path: 'register-device',
        loadComponent: () =>
          import('./pages/devices/register-device/register-device.component').then(
            (m) => m.RegisterDeviceComponent,
          ),
        title: 'Registrar Dispositivo',
        canActivate: [roleGuard],
        data: { roles: ['admin'] },
      },
      {
        path: 'connected-sensors',
        loadComponent: () =>
          import('./pages/devices/connected-sensors/connected-sensors.component').then(
            (m) => m.ConnectedSensorsComponent,
          ),
        title: 'Sensores Conectados',
        canActivate: [roleGuard],
        data: { roles: ['admin'] },
      },
      {
        path: 'device-status',
        loadComponent: () =>
          import('./pages/devices/device-status/device-status.component').then(
            (m) => m.DeviceStatusComponent,
          ),
        title: 'Estado de Dispositivos',
        canActivate: [roleGuard],
        data: { roles: ['admin'] },
      },
    ],
  },
  {
    path: 'configuration',
    children: [
      {
        path: 'users',
        loadComponent: () =>
          import('./pages/configuration/users/users.component').then((m) => m.UsersComponent),
        title: 'Usuarios',
        canActivate: [roleGuard],
        data: { roles: ['admin'] },
      },
      {
        path: 'alert-thresholds',
        loadComponent: () =>
          import('./pages/configuration/alert-thresholds/alert-thresholds.component').then(
            (m) => m.AlertThresholdsComponent,
          ),
        title: 'Umbrales de Alerta',
        canActivate: [roleGuard],
        data: { roles: ['admin'] },
      },
      {
        path: 'delete-data',
        loadComponent: () =>
          import('./pages/configuration/delete-data/delete-data.component').then(
            (m) => m.DeleteDataComponent,
          ),
        title: 'Eliminar Datos',
        canActivate: [roleGuard],
        data: { roles: ['admin'] },
      },
    ],
  },
  {
    path: 'analysis',
    children: [
      {
        path: 'time-series',
        loadComponent: () =>
          import('./pages/analysis/time-series/time-series-page.component').then(
            (m) => m.TimeSeriesPageComponent,
          ),
        title: 'Series Temporales',
        canActivate: [roleGuard],
        data: { roles: ['admin'] },
      },
      {
        path: 'correlation',
        loadComponent: () =>
          import('./pages/analysis/correlation/correlation-page.component').then(
            (m) => m.CorrelationPageComponent,
          ),
        title: 'Matriz de Correlación',
        canActivate: [roleGuard],
        data: { roles: ['admin'] },
      },
      {
        path: 'lag',
        loadComponent: () =>
          import('./pages/analysis/lag/lag-page.component').then((m) => m.LagPageComponent),
        title: 'Rezagos / Cross-correlation',
        canActivate: [roleGuard],
        data: { roles: ['admin'] },
      },
      {
        path: 'locations',
        loadComponent: () =>
          import('./pages/analysis/locations/locations-analysis-page.component').then(
            (m) => m.LocationsAnalysisPageComponent,
          ),
        title: 'Análisis por Ubicación',
        canActivate: [roleGuard],
        data: { roles: ['admin'] },
      },
      {
        path: 'export-data',
        loadComponent: () =>
          import('./pages/analysis/export-data/data-export-page.component').then(
            (m) => m.DataExportPageComponent,
          ),
        title: 'Exportar Datos',
        canActivate: [roleGuard],
        data: { roles: ['admin'] },
      },
    ],
  },
  {
    path: 'help',
    children: [
      {
        path: 'how-it-works',
        loadComponent: () =>
          import('./pages/help/how-it-works/how-it-works.component').then(
            (m) => m.HowItWorksPageComponent,
          ),
        title: 'Cómo Funciona',
        canActivate: [roleGuard],
        data: { roles: ['admin'] },
      },
      {
        path: 'faq',
        loadComponent: () =>
          import('./pages/help/faq/faq.component').then((m) => m.FaqPageComponent),
        title: 'Preguntas Frecuentes',
        canActivate: [roleGuard],
        data: { roles: ['admin'] },
      },
      {
        path: 'architecture',
        loadComponent: () =>
          import('./pages/help/architecture/architecture.component').then(
            (m) => m.ArchitecturePageComponent,
          ),
        title: 'Arquitectura del Sistema',
        canActivate: [roleGuard],
        data: { roles: ['admin'] },
      },
    ],
  },
  {
    path: 'locations',
    children: [
      {
        path: 'register-location',
        loadComponent: () =>
          import('./pages/locations/register-location/register-location.component').then(
            (m) => m.RegisterLocationComponent,
          ),
        title: 'Registrar Ubicación',
        canActivate: [roleGuard],
        data: { roles: ['admin'] },
      },
      {
        path: 'monitoring',
        loadComponent: () =>
          import('./pages/locations/location-monitoring/location-monitoring.component').then(
            (m) => m.LocationMonitoringComponent,
          ),
        title: 'Puntos de Monitoreo',
        canActivate: [roleGuard],
        data: { roles: ['admin'] },
      },
      {
        path: 'history',
        loadComponent: () =>
          import('./pages/locations/location-history/location-history.component').then(
            (m) => m.LocationHistoryComponent,
          ),
        title: 'Histórico de Ubicaciones',
        canActivate: [roleGuard],
        data: { roles: ['admin'] },
      },
    ],
  },
  {
    path: 'profile',
    loadComponent: () =>
      import('./pages/profile/profile.component').then((m) => m.ProfileComponent),
    title: 'Perfil',
  },
  {
    path: 'form-elements',
    loadComponent: () =>
      import('./pages/forms/form-elements/form-elements.component').then(
        (m) => m.FormElementsComponent,
      ),
    title: 'Elementos de Formulario',
  },
  {
    path: 'basic-tables',
    loadComponent: () =>
      import('./pages/tables/basic-tables/basic-tables.component').then(
        (m) => m.BasicTablesComponent,
      ),
    title: 'Tablas Básicas',
  },
  {
    path: 'blank',
    loadComponent: () => import('./pages/blank/blank.component').then((m) => m.BlankComponent),
    title: 'Página en Blanco',
  },
  {
    path: 'invoice',
    loadComponent: () =>
      import('./pages/invoices/invoices.component').then((m) => m.InvoicesComponent),
    title: 'Facturas',
  },
  {
    path: 'line-chart',
    loadComponent: () =>
      import('./pages/charts/line-chart/line-chart.component').then((m) => m.LineChartComponent),
    title: 'Gráfico de Líneas',
  },
  {
    path: 'bar-chart',
    loadComponent: () =>
      import('./pages/charts/bar-chart/bar-chart.component').then((m) => m.BarChartComponent),
    title: 'Gráfico de Barras',
  },
  {
    path: 'alerts',
    loadComponent: () =>
      import('./pages/ui-elements/alerts/alerts.component').then((m) => m.AlertsComponent),
    title: 'Alertas',
  },
  {
    path: 'avatars',
    loadComponent: () =>
      import('./pages/ui-elements/avatar-element/avatar-element.component').then(
        (m) => m.AvatarElementComponent,
      ),
    title: 'Avatares',
  },
  {
    path: 'badge',
    loadComponent: () =>
      import('./pages/ui-elements/badges/badges.component').then((m) => m.BadgesComponent),
    title: 'Insignias',
  },
  {
    path: 'buttons',
    loadComponent: () =>
      import('./pages/ui-elements/buttons/buttons.component').then((m) => m.ButtonsComponent),
    title: 'Botones',
  },
  {
    path: 'images',
    loadComponent: () =>
      import('./pages/ui-elements/images/images.component').then((m) => m.ImagesComponent),
    title: 'Imágenes',
  },
  {
    path: 'videos',
    loadComponent: () =>
      import('./pages/ui-elements/videos/videos.component').then((m) => m.VideosComponent),
    title: 'Videos',
  },
];

// Rutas limpias que redirigen al dashboard
const REDIRECT_ROUTES: Routes = DASHBOARD_ROUTES.map((route) => ({
  path: route.path,
  redirectTo: `dashboard/${route.path}`,
  pathMatch: 'full',
}));

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/landing/landing.component').then((m) => m.LandingComponent),
  },
  ...REDIRECT_ROUTES,
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./shared/layout/app-layout/app-layout.component').then((m) => m.AppLayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      ...DASHBOARD_ROUTES,
    ],
  },
  {
    path: 'signin',
    loadComponent: () =>
      import('./pages/auth-pages/sign-in/sign-in.component').then((m) => m.SignInComponent),
    canActivate: [authRedirectGuard],
    title: 'Iniciar Sesión',
  },
  {
    path: 'signup',
    loadComponent: () =>
      import('./pages/auth-pages/sign-up/sign-up.component').then((m) => m.SignUpComponent),
    title: 'Registrarse',
  },
  {
    path: '**',
    loadComponent: () =>
      import('./pages/other-page/not-found/not-found.component').then((m) => m.NotFoundComponent),
    title: 'Página No Encontrada',
  },
];
