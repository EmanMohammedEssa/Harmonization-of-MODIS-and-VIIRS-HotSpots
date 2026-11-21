import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';

export const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', data: { title: 'Dashboard' },
        loadComponent: () => import('./features/dashboard/dashboard-page.component').then(m => m.DashboardPageComponent) },
      { path: 'fire-analysis', data: { title: 'Fire Analysis' },
        loadComponent: () => import('./features/fire-analysis/fire-analysis-page.component').then(m => m.FireAnalysisPageComponent) },
      { path: 'instructions', data: { title: 'Instructions' },
        loadComponent: () => import('./features/instructions/instructions-page.component').then(m => m.InstructionsPageComponent) },
    ],
  },
  { path: '**', redirectTo: '' },
];
