import { Routes } from '@angular/router';
import { guestGuard, authGuard } from './guards/auth.guard';
import { MainLayoutComponent } from './components/layout/main-layout/main-layout.component';

export const routes: Routes = [
    {
        path: 'login',
        loadComponent: () => import('./components/auth/login/login.component').then(m => m.LoginComponent),
        canActivate: [guestGuard]
    },
    {
        path: 'register',
        loadComponent: () => import('./components/auth/register/register.component').then(m => m.RegisterComponent),
        canActivate: [guestGuard]
    },
    {
        path: '',
        component: MainLayoutComponent,
        canActivate: [authGuard],
        children: [
            { path: '', redirectTo: 'home', pathMatch: 'full' },
            {
                path: 'home',
                loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent)
            },
            {
                path: 'services',
                loadComponent: () => import('./pages/services/services.component').then(m => m.ServicesComponent)
            },
            {
                path: 'clients',
                loadComponent: () => import('./pages/clients/clients.component').then(m => m.ClientsComponent)
            },
            {
                path: 'invoices',
                loadComponent: () => import('./pages/invoices/invoices.component').then(m => m.InvoicesComponent)
            },
            {
                path: 'tax-obligations',
                loadComponent: () => import('./pages/tax-obligations/tax-obligations.component').then(m => m.TaxObligationsComponent)
            },
            {
                path: 'bank-accounts',
                loadComponent: () => import('./pages/bank-accounts/bank-accounts.component').then(m => m.BankAccountsComponent)
            }
        ]
    },
    { path: '**', redirectTo: '' }
];
