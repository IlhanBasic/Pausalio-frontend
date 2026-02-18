import { Component, inject, OnInit, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthStore } from '../../../stores/auth.store';
import { AuthService } from '../../../services/auth.service';
import { BusinessProfileService } from '../../../services/business-profile.service';
import { Router } from '@angular/router';
import { BusinessProfileToReturnDto } from '../../../models/business-profile';
import { UserProfileStore } from '../../../stores/user-profile.store';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent implements OnInit {
  store = inject(AuthStore);
  authService = inject(AuthService);
  userProfileStore = inject(UserProfileStore);
  businessService = inject(BusinessProfileService);
  router = inject(Router);

  currentBusiness = signal<BusinessProfileToReturnDto | null | undefined>(null);
  availableBusinesses = signal<BusinessProfileToReturnDto[]>([]);
  showUserDropdown = signal(false);
  showBusinessDropdown = signal(false);

  constructor() {
    // Reaktivno sluša store - automatski se poziva kad se store promeni
    effect(() => {
      const profile = this.userProfileStore.Profile();
      if (profile && this.store.isOwner()) {
        this.currentBusiness.set(profile.businessProfile);
      }
    });
  }

  ngOnInit() {
    // Samo za asistente jer oni ne koriste userProfileStore za businesses
    if (this.store.isAssistant()) {
      this.loadAssistantBusinesses();
    } else if (this.store.isAdmin()) {
      this.currentBusiness.set(null);
      this.availableBusinesses.set([]);
    }
  }

  private loadAssistantBusinesses() {
    this.businessService.getUserCompanies().subscribe({
      next: (response) => {
        if (response.data && response.data.length > 0) {
          this.availableBusinesses.set(response.data);
          const currentId = this.store.currentBusinessId();
          const current = response.data.find(b => b.id === currentId) || response.data[0];
          this.currentBusiness.set(current);
        }
      },
      error: (err) => {
        console.error('Error loading businesses:', err);
      }
    });
  }

  selectBusiness(businessId: string) {
    const business = this.availableBusinesses().find(b => b.id === businessId);
    if (business) {
      this.currentBusiness.set(business);
      this.store.setBusinessContext(businessId);
      this.showBusinessDropdown.set(false);
      window.location.reload();
    }
  }

  toggleBusinessDropdown() {
    this.showBusinessDropdown.set(!this.showBusinessDropdown());
    if (this.showBusinessDropdown()) {
      this.showUserDropdown.set(false);
    }
  }

  toggleUserDropdown() {
    this.showUserDropdown.set(!this.showUserDropdown());
    if (this.showUserDropdown()) {
      this.showBusinessDropdown.set(false);
    }
  }

  navigateToProfile() {
    this.showUserDropdown.set(false);
    this.router.navigate(['/profile']);
  }

  logout() {
    this.showUserDropdown.set(false);
    this.authService.logout().subscribe(() => {
      this.store.logout();
      this.router.navigate(['/login']);
    });
  }

  getInitials(name: string): string {
    if (!name) return '';
    const words = name.split(' ');
    if (words.length >= 2) {
      return `${words[0].charAt(0)}${words[1].charAt(0)}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  getUserFullName(): string {
    const user = this.userProfileStore.Profile()?.userProfile;
    return user ? `${user.firstName} ${user.lastName}` : '';
  }

  getUserInitials(): string {
    const user = this.userProfileStore.Profile()?.userProfile;
    if (!user) return '';
    return `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`.toUpperCase();
  }

  getUserRole(): string {
    return this.store.isOwner() ? 'Vlasnik' : this.store.isAssistant() ? 'Asistent' : 'Administrator';
  }

  getUserProfilePicture(): string | null {
    return this.userProfileStore.Profile()?.userProfile.profilePicture ?? null;
  }
}