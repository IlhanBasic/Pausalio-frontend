import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthStore } from '../../../stores/auth.store';
import { SidebarService } from '../../../shared/sidebar.service';


@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {
  store = inject(AuthStore);
  sidebarService = inject(SidebarService);

  get isSidebarOpen() {
    return this.sidebarService.isOpen();
  }

  toggleSidebar() {
    this.sidebarService.toggle();
  }

  closeSidebar() {
    this.sidebarService.close();
  }

  closeSidebarOnMobile() {
    if (window.innerWidth <= 768) {
      this.sidebarService.close();
    }
  }
}