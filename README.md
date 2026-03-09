# Paušalio – Frontend

> An Angular application for managing the business operations of flat-rate (paušal) entrepreneurs in Serbia.

---

## Table of Contents

- [About the Project](#about-the-project)
- [Technologies](#technologies)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Configuration](#environment-configuration)
- [Routing & Pages](#routing--pages)
- [Authentication](#authentication)
- [State Management (Stores)](#state-management-stores)
- [Services](#services)
- [SignalR Chat Widget](#signalr-chat-widget)
- [AI Assistant](#ai-assistant)
- [Internationalization (i18n)](#internationalization-i18n)
- [Shared Components](#shared-components)
- [Models](#models)
- [Enums](#enums)

---

## About the Project

The Paušalio frontend is an **Angular 20** SPA (Single Page Application) that communicates with the .NET backend API. It is designed for flat-rate entrepreneurs in Serbia and provides: invoice management, tax obligation tracking, client records, real-time chat between company members, and an AI assistant with financial insights.

---

## Technologies

| Category | Technology |
|---|---|
| Framework | Angular 20 |
| Language | TypeScript |
| Styling | CSS (per-component) |
| Real-time | SignalR (`@microsoft/signalr`) |
| Internationalization | ngx-translate |
| State Management | Lightweight stores (custom signals/services) |
| HTTP | Angular HttpClient + Interceptors |
| Routing | Angular Router with Auth Guards |
| Build Tool | Angular CLI |

---

## Project Structure

```
src/
├── index.html
├── main.ts
├── styles.css
│
└── app/
    ├── app.config.ts          → Global application configuration
    ├── app.routes.ts          → Route definitions
    ├── app.ts                 → Root component
    │
    ├── components/            → Presentational / layout components
    ├── enums/                 → TypeScript enums
    ├── guards/                → Route guards
    ├── interceptors/          → HTTP interceptors
    ├── models/                → TypeScript interfaces / models
    ├── pages/                 → Application pages (feature components)
    ├── pipes/                 → Custom Angular pipes
    ├── services/              → Angular services (HTTP + SignalR)
    ├── shared/                → Shared services
    └── stores/                → State management
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Angular CLI: `npm install -g @angular/cli`

### Steps

```bash
# 1. Clone the repository and navigate to the frontend folder
cd Pausalio

# 2. Install dependencies
npm install

# 3. Set up the environment file
cp src/environments/environment.example.ts src/environments/environment.ts
# Fill in apiUrl and other required values

# 4. Start the development server
ng serve

# Application is available at: http://localhost:4200
```

### Production Build

```bash
ng build --configuration production
# Output: dist/
```

---

## Environment Configuration

Files are located in `src/environments/`:

```typescript
// environment.example.ts
export const environment = {
  production: false,
  apiUrl: 'https://your-api-url',
  hubUrl: 'https://your-hub-url',
  googleClientId: 'your-google-client-id'
};
```

## Routing & Pages

Routes are defined in `app.routes.ts`. Protected routes use `AuthGuard`.

### Public Routes (no authentication required)

| Route | Component | Description |
|---|---|---|
| `/login` | `LoginComponent` | User login |
| `/register` | `RegisterComponent` | Owner registration |
| `/forgot-password` | `ForgotPasswordComponent` | Forgot password |
| `/verify-email` | `VerifyEmailComponent` | Email verification |

### Protected Routes (login required)

| Route | Component | Description |
|---|---|---|
| `/home` | `HomeComponent` | Dashboard / home page |
| `/invoices` | `InvoicesComponent` | Invoice list |
| `/invoices/:id` | `InvoiceDetailComponent` | Invoice details |
| `/clients` | `ClientsComponent` | Client management |
| `/payments` | `PaymentsComponent` | Payment records |
| `/tax-obligations` | `TaxObligationsComponent` | Tax obligations |
| `/expenses` | `ExpensesComponent` | Expenses |
| `/reminders` | `RemindersComponent` | Reminders and calendar |
| `/documents` | `DocumentsComponent` | Document archive |
| `/bank-accounts` | `BankAccountsComponent` | Bank accounts |
| `/services` | `ServicesComponent` | Service / item catalog |
| `/statistics` | `StatisticsComponent` | Reports and statistics |
| `/ai-assistant` | `AiAssistantComponent` | AI assistant |
| `/profile` | `ProfileComponent` | User profile |

### Admin Routes

| Route | Component | Description |
|---|---|---|
| `/admin` | `AdminComponent` | Admin panel |
| `/admin/users` | `UsersComponent` | User management |
| `/admin/companies` | `CompaniesComponent` | Company overview |
| `/admin/activity-codes` | `ActivityCodesComponent` | Business activity codes |
| `/admin/cities` | `CitiesComponent` | Cities / municipalities |
| `/admin/countries` | `CountriesComponent` | Countries |

---

## Authentication

Authentication relies on JWT tokens returned by the backend.

**`AuthGuard`** (`guards/auth.guard.ts`) protects all private routes — unauthorized users are redirected to `/login`.

**`AuthInterceptor`** (`interceptors/auth.interceptor.ts`) automatically attaches the JWT token to the `Authorization` header of every HTTP request:

```
Authorization: Bearer <token>
```

**`AuthService`** (`services/auth.service.ts`) handles:
- Login / Logout
- Owner and assistant registration
- Google OAuth2 sign-in
- Password reset and email verification
- Token persistence in local storage

---

## State Management (Stores)

The application uses a lightweight store pattern instead of NgRx.

### `AuthStore` (`stores/auth.store.ts`)
Holds authentication state: whether the user is logged in, the JWT token, and the user's role.

### `UserProfileStore` (`stores/user-profile.store.ts`)
Holds data about the currently logged-in user and their business profile. Used across multiple parts of the application without repeated HTTP calls.

---

## Services

All Angular services communicate with the backend API via `HttpClient`.

| Service | Description |
|---|---|
| `AuthService` | Authentication and session management |
| `UserProfileService` | User profile |
| `BusinessProfileService` | Business profile |
| `BusinessInviteService` | Assistant invitations |
| `ClientService` | Client CRUD operations |
| `InvoiceService` | Invoice management and PDF generation |
| `ItemService` | Service and item catalog |
| `PaymentService` | Payment records |
| `TaxObligationService` | Tax obligations |
| `ExpenseService` | Expenses |
| `ReminderService` | Reminders |
| `DocumentService` | Document archive |
| `BankAccountService` | Bank accounts |
| `ChatService` | HTTP portion of chat functionality |
| `ChatSignalrService` | SignalR connection and real-time messages |
| `AiAssistantService` | Communication with the AI assistant |
| `ExchangeRateService` | Currency conversion |
| `FileService` | File upload and download |
| `ActivityCodeService` | Business activity codes (admin) |
| `CityService` | Cities (admin) |
| `CountryService` | Countries (admin) |
| `LanguageService` | Active language management (ngx-translate) |

---

## SignalR Chat Widget

Real-time chat between the business owner and assistants is implemented as a **floating widget** available on every page of the application.

**`ChatWidgetComponent`** (`components/chat-widget/`) – UI for displaying and sending messages.

**`ChatSignalrService`** (`services/chat-signalr.service.ts`) – Manages the SignalR connection:
- Establishing a connection to `/hubs/chat`
- Sending and receiving messages in real time
- Tracking message status (Sent / Delivered / Read)
- Automatic reconnect on disconnection

> Messages are encrypted on the backend — the frontend displays decrypted messages delivered through the hub.

---

## AI Assistant

**`AiAssistantComponent`** (`pages/ai-assistant/`) provides a chat interface for interacting with the AI assistant, which has access to the company's financial data.

**`AiAssistantService`** (`services/ai-assistant.service.ts`) sends user queries to the backend, which forwards them to the OpenRouter API with tool calling enabled.

**Example queries:**
- _"Which client brought me the most revenue this year?"_
- _"How much tax have I paid in total over the last 6 months?"_
- _"Which country do my best clients come from?"_

---

## Internationalization (i18n)

The application uses **ngx-translate** for multi-language support.

**`LanguageService`** (`services/language.service.ts`) manages the active language and switching between:
- Serbian Latin script (`sr-Latn`)
- Serbian Cyrillic script (`sr-Cyrl`)

Translation files are located in `src/assets/i18n/` (JSON format).

---

## Shared Components

### `DataTableComponent` (`components/shared/data-table/`)
A generic data table with support for sorting, pagination, and filtering. Used on most pages (invoices, clients, payments, etc.).

### Layout Components (`components/layout/`)
- **`MainLayoutComponent`** – Wrapper for all protected pages (sidebar + navbar + content area)
- **`NavbarComponent`** – Top navigation bar with user menu and language selector
- **`SidebarComponent`** – Side navigation with links to all pages

### `SidebarService` (`shared/sidebar.service.ts`)
Manages the open/closed state of the sidebar across components.

### Constants (`components/shared/constants/`)
- `password-regex.ts` – Password validation regex used in registration and password change forms.

---

## Models

TypeScript interfaces corresponding to backend DTOs:

`activity-code`, `api-response`, `bank-account`, `business-invite`, `business-profile`, `chat`, `city`, `client`, `country`, `document`, `expense`, `invoice`, `invoice-item`, `item`, `payment`, `reminder`, `tax-obligation`, `user-business-profile`, `user-chat-message`, `user-profile`

---

## Enums

Enums are aligned with their backend counterparts:

`ClientType`, `Currency`, `DocumentType`, `ExpenseStatus`, `InvoiceStatus`, `ItemType`, `PaymentStatus`, `PaymentType`, `ReminderType`, `TaxObligationStatus`, `TaxObligationType`, `UserBusinessRole`, `UserRole`

---

*Paušalio © 2026 – All rights reserved*