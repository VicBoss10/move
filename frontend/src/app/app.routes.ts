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
import { HomeComponent } from './pages/landing/home/home.component';

export const routes: Routes = [
  // Ruta raíz: Landing Page
  {
    path: '',
    component: HomeComponent,
    title: 'Landing Page | MOVE - Sistema IoT de Monitoreo Ambiental'
  },
  // Ruta para el Dashboard (con layout)
  {
    path: 'dashboard',
    component: AppLayoutComponent,
    children: [
      {
        path: '',
        component: EcommerceComponent,
        pathMatch: 'full',
        title: 'Dashboard | TailAdmin - Angular Admin Dashboard Template',
      },
      {
        path: 'calendar',
        component: CalenderComponent,
        title: 'Calendario | TailAdmin - Angular Admin Dashboard Template'
      },
      {
        path: 'profile',
        component: ProfileComponent,
        title: 'Perfil | TailAdmin - Angular Admin Dashboard Template'
      },
      {
        path: 'form-elements',
        component: FormElementsComponent,
        title: 'Elementos de Formulario | TailAdmin - Angular Admin Dashboard Template'
      },
      {
        path: 'basic-tables',
        component: BasicTablesComponent,
        title: 'Tablas Básicas | TailAdmin - Angular Admin Dashboard Template'
      },
      {
        path: 'blank',
        component: BlankComponent,
        title: 'Página en Blanco | TailAdmin - Angular Admin Dashboard Template'
      },
      {
        path: 'invoice',
        component: InvoicesComponent,
        title: 'Facturas | TailAdmin - Angular Admin Dashboard Template'
      },
      {
        path: 'line-chart',
        component: LineChartComponent,
        title: 'Gráfico de Líneas | TailAdmin - Angular Admin Dashboard Template'
      },
      {
        path: 'bar-chart',
        component: BarChartComponent,
        title: 'Gráfico de Barras | TailAdmin - Angular Admin Dashboard Template'
      },
      {
        path: 'alerts',
        component: AlertsComponent,
        title: 'Alertas | TailAdmin - Angular Admin Dashboard Template'
      },
      {
        path: 'avatars',
        component: AvatarElementComponent,
        title: 'Avatares | TailAdmin - Angular Admin Dashboard Template'
      },
      {
        path: 'badge',
        component: BadgesComponent,
        title: 'Insignias | TailAdmin - Angular Admin Dashboard Template'
      },
      {
        path: 'buttons',
        component: ButtonsComponent,
        title: 'Botones | TailAdmin - Angular Admin Dashboard Template'
      },
      {
        path: 'images',
        component: ImagesComponent,
        title: 'Imágenes | TailAdmin - Angular Admin Dashboard Template'
      },
      {
        path: 'videos',
        component: VideosComponent,
        title: 'Videos | TailAdmin - Angular Admin Dashboard Template'
      },
    ]
  },
  // Páginas de autenticación
  {
    path: 'signin',
    component: SignInComponent,
    title: 'Iniciar Sesión | TailAdmin - Angular Admin Dashboard Template'
  },
  {
    path: 'signup',
    component: SignUpComponent,
    title: 'Registrarse | TailAdmin - Angular Admin Dashboard Template'
  },
  // Página de error
  {
    path: '**',
    component: NotFoundComponent,
    title: 'Página No Encontrada | TailAdmin - Angular Admin Dashboard Template'
  },
];
