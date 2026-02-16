import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthStore } from '../../../stores/auth.store';
import { AuthService } from '../../../services/auth.service';
import { BusinessProfileService } from '../../../services/business-profile.service';
import { Router } from '@angular/router';

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
  businessService = inject(BusinessProfileService);
  router = inject(Router);

  businessName = signal<string>('');
  showUserDropdown = signal(false);

  ngOnInit() {
    this.loadBusinessProfile();
  }

  loadBusinessProfile() {
    if (this.store.isOwner()) {
      this.businessService.getUserCompany().subscribe({
        next: (response) => {
          if (response.data) {
            this.businessName.set(response.data.businessName);
          }
        },
        error: (err) => {
          console.error('Error loading business profile:', err);
        }
      });
    }
  }

  onBusinessChange(event: any) {
    this.store.setBusinessContext(event.target.value);
    window.location.reload();
  }

  toggleUserDropdown() {
    this.showUserDropdown.set(!this.showUserDropdown());
  }

  navigateToSettings() {
    this.showUserDropdown.set(false);
    this.router.navigate(['/settings']);
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
}
