import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { DashboardComponent } from './pages/dashboard/move/dashboard.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { FormElementsComponent } from './pages/forms/form-elements/form-elements.component';
import { BasicTablesComponent } from './pages/tables/basic-tables/basic-tables.component';
import { BlankComponent } from './pages/blank/blank.component';
import { NotFoundComponent } from './pages/other-page/not-found/not-found.component';
import { AppLayoutComponent } from './shared/layout/app-layout/app-layout.component';
import { InvoicesComponent } from './pages/invoices/invoices.component';
import { LineChartComponent } from './pages/charts/line-chart/line-chart.component';
import { BarChartComponent } from './pages/charts/bar-chart/bar-chart.component';
import { AlertsComponent } from './pages/ui-elements/alerts/alerts.component';
import { AvatarElementComponent } from './pages/ui-elements/avatar-element/avatar-element.component';
import { BadgesComponent } from './pages/ui-elements/badges/badges.component';
import { ButtonsComponent } from './pages/ui-elements/buttons/buttons.component';
import { ImagesComponent } from './pages/ui-elements/images/images.component';
import { VideosComponent } from './pages/ui-elements/videos/videos.component';
import { SignInComponent } from './pages/auth-pages/sign-in/sign-in.component';
import { SignUpComponent } from './pages/auth-pages/sign-up/sign-up.component';
import { CalenderComponent } from './pages/calender/calender.component';
import { LandingComponent } from './pages/landing/landing.component';
import { Co2DetailComponent } from './pages/environment/co2-detail/co2-detail.component';
import { GasesDetailComponent } from './pages/environment/gases-detail/gases-detail.component';
import { ParticlesDetailComponent } from './pages/environment/particles-detail/particles-detail.component';
import { TemperatureDetailComponent } from './pages/environment/temperature-detail/temperature-detail.component';
import { HumidityDetailComponent } from './pages/environment/humidity-detail/humidity-detail.component';
import { EnvironmentalHistoryComponent } from './pages/environment/environmental-history/environmental-history.component';
import { VehiclesDetectedComponent } from './pages/vehicles/vehicles-detected/vehicles-detected.component';
import { VehiclesStatsComponent } from './pages/vehicles/vehicles-stats/vehicles-stats.component';
import { CameraStreamingComponent } from './pages/cameras/camera-streaming/camera-streaming.component';
import { CameraModelStatusComponent } from './pages/cameras/camera-model-status/camera-model-status.component';
import { LocationMonitoringComponent } from './pages/locations/location-monitoring/location-monitoring.component';
import { LocationHistoryComponent } from './pages/locations/location-history/location-history.component';
import { RegisterLocationComponent } from './pages/locations/register-location/register-location.component';
import { RegisterDeviceComponent } from './pages/devices/register-device/register-device.component';
import { ConnectedSensorsComponent } from './pages/devices/connected-sensors/connected-sensors.component';
import { DeviceStatusComponent } from './pages/devices/device-status/device-status.component';
import { DeviceLogsComponent } from './pages/devices/device-logs/device-logs.component';
import { UsersComponent } from './pages/configuration/users/users.component';
import { AlertThresholdsComponent } from './pages/configuration/alert-thresholds/alert-thresholds.component';
import { SystemParamsComponent } from './pages/configuration/system-params/system-params.component';
import { TimeSeriesPageComponent } from './pages/analysis/time-series/time-series-page.component';
import { CorrelationPageComponent } from './pages/analysis/correlation/correlation-page.component';
import { LagPageComponent } from './pages/analysis/lag/lag-page.component';
import { LocationsAnalysisPageComponent } from './pages/analysis/locations/locations-analysis-page.component';
import { DataExportPageComponent } from './pages/analysis/export-data/data-export-page.component';
import { HowItWorksPageComponent } from './pages/help/how-it-works/how-it-works.component';
import { ArchitecturePageComponent } from './pages/help/architecture/architecture.component';
import { FaqPageComponent } from './pages/help/faq/faq.component';


const DASHBOARD_ROUTES: Routes = [
  {
    path: 'dashboard',
    component: DashboardComponent,
    title: 'Inicio',
  },
  {
    path: 'environment',
    children: [
      {
        path: 'co2',
        component: Co2DetailComponent,
        title: 'CO₂'
      },
      {
        path: 'gases',
        component: GasesDetailComponent,
        title: 'Gases'
      },
      {
        path: 'particles',
        component: ParticlesDetailComponent,
        title: 'Partículas'
      },
      {
        path: 'temperature',
        component: TemperatureDetailComponent,
        title: 'Temperatura'
      },
      {
        path: 'humidity',
        component: HumidityDetailComponent,
        title: 'Humedad'
      },
      {
        path: 'history',
        component: EnvironmentalHistoryComponent,
        title: 'Histórico Ambiental'
      }
    ]
  },
  {
    path: 'vehicles',
    children: [
      {
        path: 'detected',
        component: VehiclesDetectedComponent,
        title: 'Vehículos Detectados'
      },
      {
        path: 'stats',
        component: VehiclesStatsComponent,
        title: 'Estadísticas de Vehículos'
      }
    ]
  },
  {
    path: 'cameras',
    children: [
      {
        path: 'streaming',
        component: CameraStreamingComponent,
        title: 'Streaming de Cámaras'
      },
      {
        path: 'model-status',
        component: CameraModelStatusComponent,
        title: 'Estado del Modelo'
      }
    ]
  },
  {
    path: 'devices',
    children: [
      {
        path: 'register-device',
        component: RegisterDeviceComponent,
        title: 'Registrar Dispositivo'
      },
      {
        path: 'connected-sensors',
        component: ConnectedSensorsComponent,
        title: 'Sensores Conectados'
      },
      {
        path: 'device-status',
        component: DeviceStatusComponent,
        title: 'Estado de Dispositivos'
      },
      {
        path: 'device-logs',
        component: DeviceLogsComponent,
        title: 'Logs del Sistema'
      }
    ]
  },
  {
    path: 'configuration',
    children: [
      {
        path: 'users',
        component: UsersComponent,
        title: 'Usuarios'
      },
      {
        path: 'alert-thresholds',
        component: AlertThresholdsComponent,
        title: 'Umbrales de Alerta'
      },
      {
        path: 'system-params',
        component: SystemParamsComponent,
        title: 'Parámetros del Sistema'
      }
    ]
  },
  {
    path: 'analysis',
    children: [
      {
        path: 'time-series',
        component: TimeSeriesPageComponent,
        title: 'Series Temporales'
      },
      {
        path: 'correlation',
        component: CorrelationPageComponent,
        title: 'Matriz de Correlación'
      },
      {
        path: 'lag',
        component: LagPageComponent,
        title: 'Rezagos / Cross-correlation'
      },
      {
        path: 'locations',
        component: LocationsAnalysisPageComponent,
        title: 'Análisis por Ubicación'
      },
      {
        path: 'export-data',
        component: DataExportPageComponent,
        title: 'Exportar Datos'
      }
    ]
  },
  {
    path: 'help',
    children: [
      {
        path: 'how-it-works',
        component: HowItWorksPageComponent,
        title: 'Cómo Funciona'
      },
      {
        path: 'faq',
        component: FaqPageComponent,
        title: 'Preguntas Frecuentes'
      },
      {
        path: 'architecture',
        component: ArchitecturePageComponent,
        title: 'Arquitectura del Sistema'
      }
    ]
  },
  {
    path: 'locations',
    children: [
      {
        path: 'register-location',
        component: RegisterLocationComponent,
        title: 'Registrar Ubicación'
      },
      {
        path: 'monitoring',
        component: LocationMonitoringComponent,
        title: 'Puntos de Monitoreo'
      },
      {
        path: 'history',
        component: LocationHistoryComponent,
        title: 'Histórico de Ubicaciones'
      }
    ]
  },
  {
    path: 'calendar',
    component: CalenderComponent,
    title: 'Calendario'
  },
  {
    path: 'profile',
    component: ProfileComponent,
    title: 'Perfil'
  },
  {
    path: 'form-elements',
    component: FormElementsComponent,
    title: 'Elementos de Formulario'
  },
  {
    path: 'basic-tables',
    component: BasicTablesComponent,
    title: 'Tablas Básicas'
  },
  {
    path: 'blank',
    component: BlankComponent,
    title: 'Página en Blanco'
  },
  {
    path: 'invoice',
    component: InvoicesComponent,
    title: 'Facturas'
  },
  {
    path: 'line-chart',
    component: LineChartComponent,
    title: 'Gráfico de Líneas'
  },
  {
    path: 'bar-chart',
    component: BarChartComponent,
    title: 'Gráfico de Barras'
  },
  {
    path: 'alerts',
    component: AlertsComponent,
    title: 'Alertas'
  },
  {
    path: 'avatars',
    component: AvatarElementComponent,
    title: 'Avatares'
  },
  {
    path: 'badge',
    component: BadgesComponent,
    title: 'Insignias'
  },
  {
    path: 'buttons',
    component: ButtonsComponent,
    title: 'Botones'
  },
  {
    path: 'images',
    component: ImagesComponent,
    title: 'Imágenes'
  },
  {
    path: 'videos',
    component: VideosComponent,
    title: 'Videos'
  },
];

// Rutas limpias que redirigen al dashboard
const REDIRECT_ROUTES: Routes = DASHBOARD_ROUTES.map(route => ({
  path: route.path,
  redirectTo: `dashboard/${route.path}`,
  pathMatch: 'full'
}));

export const routes: Routes = [
  {
    path: '',
    component: LandingComponent,
  },
  ...REDIRECT_ROUTES,
  {
    path: 'dashboard',
    component: AppLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      ...DASHBOARD_ROUTES,
    ]
  },
  {
    path: 'signin',
    component: SignInComponent,
    title: 'Iniciar Sesión'
  },
  {
    path: 'signup',
    component: SignUpComponent,
    title: 'Registrarse'
  },
  {
    path: '**',
    component: NotFoundComponent,
    title: 'Página No Encontrada'
  },
];
