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
                path: 'expenses',
                loadComponent: () => import('./pages/expenses/expenses.component').then(m => m.ExpensesComponent)
            },
            {
                path: 'tax-obligations',
                loadComponent: () => import('./pages/tax-obligations/tax-obligations.component').then(m => m.TaxObligationsComponent)
            },
            {
                path: 'bank-accounts',
                loadComponent: () => import('./pages/bank-accounts/bank-accounts.component').then(m => m.BankAccountsComponent)
            },
            {
                path: 'payments',
                loadComponent: () => import('./pages/payments/payments.component').then(m => m.PaymentsComponent)
            },
            {
                path: 'reminders',
                loadComponent: () => import('./pages/reminders/reminders.component').then(m => m.RemindersComponent)
            },
            {
                path: 'statistics',
                loadComponent: () => import('./pages/statistics/statistics.component').then(m => m.StatisticsComponent)
            },
            {
                path: 'admin',
                loadComponent: () => import('./pages/admin/admin.component').then(m => m.AdminComponent),
                children: [
                    { path: '', redirectTo: 'activity-codes', pathMatch: 'full' },
                    {
                        path: 'activity-codes',
                        loadComponent: () => import('./pages/admin/activity-codes/activity-codes.component').then(m => m.ActivityCodesComponent)
                    },
                    {
                        path: 'countries',
                        loadComponent: () => import('./pages/admin/countries/countries.component').then(m => m.CountriesComponent)
                    },
                    {
                        path: 'cities',
                        loadComponent: () => import('./pages/admin/cities/cities.component').then(m => m.CitiesComponent)
                    }
                ]
            }
        ]
    },
    { path: '**', redirectTo: '' }
];
