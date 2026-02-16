import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthStore } from '../../../stores/auth.store';
import { AuthService } from '../../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent {
  store = inject(AuthStore);
  authService = inject(AuthService);
  router = inject(Router);

  onBusinessChange(event: any) {
    this.store.setBusinessContext(event.target.value);
    window.location.reload();
  }

  logout() {
    this.authService.logout().subscribe(() => {
      this.store.logout();
      this.router.navigate(['/login']);
    });
  }
}
