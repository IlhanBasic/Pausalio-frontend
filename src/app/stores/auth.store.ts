import { computed, effect, Injectable, signal } from '@angular/core';
import { jwtDecode } from 'jwt-decode';
import { UserRole } from '../enums/user-role';

export interface DecodedToken {
  sub: string;
  email: string;
  FirstName: string;
  LastName: string;
  role: string | string[];
  AvailableBusinesses?: string;
  exp: number;
  iat: number;
}

export interface UserState {
  id: string | null;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  roles: string[];
  availableBusinesses: string[];
}

@Injectable({
  providedIn: 'root'
})
export class AuthStore {
  // State Signals
  private _token = signal<string | null>(localStorage.getItem('token'));
  private _currentBusinessId = signal<string | null>(localStorage.getItem('currentBusinessId'));

  // Computed State
  readonly token = computed(() => this._token());
  readonly isAuthenticated = computed(() => !!this._token());
  readonly currentBusinessId = computed(() => this._currentBusinessId());
  
  readonly user = computed<UserState | null>(() => {
    const token = this._token();
    if (!token) return null;

    try {
      const decoded = jwtDecode<DecodedToken>(token);
      
      // Handle Role (string or array)
      let roles: string[] = [];
      if (Array.isArray(decoded.role)) {
        roles = decoded.role;
      } else if (decoded.role) {
        roles = [decoded.role];
      }

      // Handle AvailableBusinesses (comma separated string)
      let availableBusinesses: string[] = [];
      if (decoded.AvailableBusinesses) {
        availableBusinesses = decoded.AvailableBusinesses.split(',');
      }

      return {
        id: decoded.sub,
        email: decoded.email,
        firstName: decoded.FirstName,
        lastName: decoded.LastName,
        roles: roles,
        availableBusinesses: availableBusinesses
      };
    } catch (error) {
      console.error('Error decoding token', error);
      return null;
    }
  });

  readonly isAssistant = computed(() => this.user()?.roles.includes(UserRole.Assistant.toString()) ?? false);
  readonly isOwner = computed(() => this.user()?.roles.includes(UserRole.Owner.toString()) ?? false);

  constructor() {
    // Effect to sync token with local storage
    effect(() => {
      const token = this._token();
      if (token) {
        localStorage.setItem('token', token);
      } else {
        localStorage.removeItem('token');
      }
    });

    // Effect to sync currentBusinessId with local storage
    effect(() => {
      const businessId = this._currentBusinessId();
      if (businessId) {
        localStorage.setItem('currentBusinessId', businessId);
      } else {
        localStorage.removeItem('currentBusinessId');
      }
    });
  }

  login(token: string) {
    this._token.set(token);
    // Auto-select first business if available and none selected
    const user = this.user();
    if (user && user.availableBusinesses.length > 0 && !this._currentBusinessId()) {
      this.setBusinessContext(user.availableBusinesses[0]);
    }
  }

  logout() {
    this._token.set(null);
    this._currentBusinessId.set(null);
  }

  setBusinessContext(businessId: string) {
    if (this.user()?.availableBusinesses.includes(businessId)) {
      this._currentBusinessId.set(businessId);
    }
  }
}
