import { Routes } from '@angular/router';
import { EcommerceComponent } from './pages/dashboard/ecommerce/ecommerce.component';
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
import { LandingComponent } from './pages/landing/landing.component'; // ¡Importa el nuevo componente!

export const routes: Routes = [
  // La ruta raíz ahora carga nuestro componente proxy.
  {
    path: '',
    component: LandingComponent,
  },
  // Ruta para el Dashboard (con layout)
  {
    path: 'dashboard',
    component: AppLayoutComponent,
    children: [
      {
        path: '',
        redirectTo: 'ecommerce', // O la ruta que prefieras como default del dashboard
        pathMatch: 'full'
      },
      {
        path: 'ecommerce',
        component: EcommerceComponent,
        title: 'Dashboard | MOVE - Observatorio Móvil de Emisiones Vehiculares',
      },
      {
        path: 'calendar',
        component: CalenderComponent,
        title: 'Calendario | MOVE'
      },
      {
        path: 'profile',
        component: ProfileComponent,
        title: 'Perfil | MOVE'
      },
      {
        path: 'form-elements',
        component: FormElementsComponent,
        title: 'Elementos de Formulario | MOVE'
      },
      {
        path: 'basic-tables',
        component: BasicTablesComponent,
        title: 'Tablas Básicas | MOVE'
      },
      {
        path: 'blank',
        component: BlankComponent,
        title: 'Página en Blanco | MOVE'
      },
      {
        path: 'invoice',
        component: InvoicesComponent,
        title: 'Facturas | MOVE'
      },
      {
        path: 'line-chart',
        component: LineChartComponent,
        title: 'Gráfico de Líneas | MOVE'
      },
      {
        path: 'bar-chart',
        component: BarChartComponent,
        title: 'Gráfico de Barras | MOVE'
      },
      {
        path: 'alerts',
        component: AlertsComponent,
        title: 'Alertas | MOVE'
      },
      {
        path: 'avatars',
        component: AvatarElementComponent,
        title: 'Avatares | MOVE'
      },
      {
        path: 'badge',
        component: BadgesComponent,
        title: 'Insignias | MOVE'
      },
      {
        path: 'buttons',
        component: ButtonsComponent,
        title: 'Botones | MOVE'
      },
      {
        path: 'images',
        component: ImagesComponent,
        title: 'Imágenes | MOVE'
      },
      {
        path: 'videos',
        component: VideosComponent,
        title: 'Videos | MOVE'
      },
    ]
  },
  // Páginas de autenticación
  {
    path: 'signin',
    component: SignInComponent,
    title: 'Iniciar Sesión | MOVE'
  },
  {
    path: 'signup',
    component: SignUpComponent,
    title: 'Registrarse | MOVE'
  },
  // Página de error
  {
    path: '**',
    component: NotFoundComponent,
    title: 'Página No Encontrada | MOVE'
  },
];
