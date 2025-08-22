import { Routes } from '@angular/router';
import { HomeComponent } from './features/landing/home/home.component';

export const routes: Routes = [
  { path: '', redirectTo: '/landing', pathMatch: 'full' },
  { path: 'landing', component: HomeComponent },
  { path: '**', redirectTo: '' }
];

