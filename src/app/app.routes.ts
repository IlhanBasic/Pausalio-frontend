import { Routes } from '@angular/router';
import { guestGuard, authGuard, adminGuard, nonAdminGuard } from './guards/auth.guard';
import { MainLayoutComponent } from './components/layout/main-layout/main-layout.component';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./components/auth/login/login.component').then((m) => m.LoginComponent),
    canActivate: [guestGuard],
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./components/auth/register/register.component').then((m) => m.RegisterComponent),
    canActivate: [guestGuard],
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./components/auth/forgot-password/forgot-password.component').then(
        (m) => m.ForgotPasswordComponent,
      ),
    canActivate: [guestGuard],
  },
  {
    path: 'verify-email',
    loadComponent: () =>
      import('./components/auth/verify-email/verify-email.component').then(
        (m) => m.VerifyEmailComponent,
      ),
    canActivate: [guestGuard],
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      {
        path: 'home',
        loadComponent: () => import('./pages/home/home.component').then((m) => m.HomeComponent),
        canActivate: [nonAdminGuard],
      },
      {
        path: 'services',
        loadComponent: () =>
          import('./pages/services/services.component').then((m) => m.ServicesComponent),
        canActivate: [nonAdminGuard],
      },
      {
        path: 'documents',
        loadComponent: () =>
          import('./pages/documents/documents.component').then((m) => m.DocumentsComponent),
        canActivate: [nonAdminGuard],
      },
      {
        path: 'clients',
        loadComponent: () =>
          import('./pages/clients/clients.component').then((m) => m.ClientsComponent),
        canActivate: [nonAdminGuard],
      },
      {
        path: 'invoices',
        loadComponent: () =>
          import('./pages/invoices/invoices.component').then((m) => m.InvoicesComponent),
        canActivate: [nonAdminGuard],
      },
      {
        path: 'invoices/:id',
        loadComponent: () =>
          import('./pages/invoice-details/invoice-detail.component').then(
            (m) => m.InvoiceDetailComponent,
          ),
        canActivate: [nonAdminGuard],
      },
      {
        path: 'expenses',
        loadComponent: () =>
          import('./pages/expenses/expenses.component').then((m) => m.ExpensesComponent),
        canActivate: [nonAdminGuard],
      },
      {
        path: 'tax-obligations',
        loadComponent: () =>
          import('./pages/tax-obligations/tax-obligations.component').then(
            (m) => m.TaxObligationsComponent,
          ),
        canActivate: [nonAdminGuard],
      },
      {
        path: 'bank-accounts',
        loadComponent: () =>
          import('./pages/bank-accounts/bank-accounts.component').then(
            (m) => m.BankAccountsComponent,
          ),
        canActivate: [nonAdminGuard],
      },
      {
        path: 'payments',
        loadComponent: () =>
          import('./pages/payments/payments.component').then((m) => m.PaymentsComponent),
        canActivate: [nonAdminGuard],
      },
      {
        path: 'reminders',
        loadComponent: () =>
          import('./pages/reminders/reminders.component').then((m) => m.RemindersComponent),
        canActivate: [nonAdminGuard],
      },
      {
        path: 'statistics',
        loadComponent: () =>
          import('./pages/statistics/statistics.component').then((m) => m.StatisticsComponent),
        canActivate: [nonAdminGuard],
      },
      {
        path: 'admin',
        loadComponent: () => import('./pages/admin/admin.component').then((m) => m.AdminComponent),
        canActivate: [adminGuard],
        children: [
          { path: '', redirectTo: 'activity-codes', pathMatch: 'full' },
          {
            path: 'activity-codes',
            loadComponent: () =>
              import('./pages/admin/activity-codes/activity-codes.component').then(
                (m) => m.ActivityCodesComponent,
              ),
          },
          {
            path: 'countries',
            loadComponent: () =>
              import('./pages/admin/countries/countries.component').then(
                (m) => m.CountriesComponent,
              ),
          },
          {
            path: 'cities',
            loadComponent: () =>
              import('./pages/admin/cities/cities.component').then((m) => m.CitiesComponent),
          },
          {
            path: 'users',
            loadComponent: () =>
              import('./pages/admin/users/users.component').then((m) => m.UsersComponent),
          },
          {
            path: 'companies',
            loadComponent: () =>
              import('./pages/admin/companies/companies.component').then(
                (m) => m.CompaniesComponent,
              ),
          },
        ],
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./pages/profile/profile.component').then((m) => m.ProfileComponent),
      },
      {
        path: 'ai-assistant',
        loadComponent: () =>
          import('./pages/ai-assistant/ai-assistant.component').then((m) => m.AiAssistantComponent),
        canActivate: [nonAdminGuard],
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
