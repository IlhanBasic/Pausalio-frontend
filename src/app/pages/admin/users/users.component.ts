import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { UserProfileService } from '../../../services/user-profile.service';
import { AuthService } from '../../../services/auth.service';
import { UserProfileToReturnDto } from '../../../models/user-profile';
import {
  DataTableComponent,
  TableColumn,
  TableAction,
} from '../../../components/shared/data-table/data-table.component';
import { UserRole } from '../../../enums/user-role';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DataTableComponent],
  templateUrl: './users.component.html',
  styleUrl: './users.component.css',
})
export class UsersComponent implements OnInit {
  userProfileService = inject(UserProfileService);
  authService = inject(AuthService);
  fb = inject(FormBuilder);
  toastr = inject(ToastrService);
  isSubmitting = signal(false);
  showPassword = signal(false);

  togglePasswordVisibility() {
    this.showPassword.set(!this.showPassword());
  }
  users = signal<any[]>([]);
  isLoading = signal(false);
  showDeleteConfirm = signal(false);
  showAddModal = signal(false);
  deletingUser = signal<UserProfileToReturnDto | null>(null);

  columns: TableColumn[] = [
    { key: 'fullName', label: 'Ime i prezime', sortable: true },
    { key: 'email', label: 'Email', sortable: true },
    { key: 'roleDisplay', label: 'Uloga', sortable: true },
    { key: 'statusDisplay', label: 'Status', sortable: false },
  ];

  actions: TableAction[] = [
    {
      label: 'Aktiviraj',
      icon: '✅',
      type: 'custom',
      showCondition: (user: UserProfileToReturnDto) => !user.isActive,
    },
    {
      label: 'Deaktiviraj',
      icon: '⛔',
      type: 'custom',
      showCondition: (user: UserProfileToReturnDto) => user.isActive,
    },
    { label: 'Obriši', icon: '🗑️', type: 'delete' },
  ];

  addAdminForm: FormGroup = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    phone: [''],
    address: [''],
  });

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.isLoading.set(true);
    this.userProfileService.getProfiles().subscribe({
      next: (users) => {
        const transformedData = users.map((user) => ({
          ...user,
          fullName: `${user.firstName} ${user.lastName}`,
          roleDisplay: this.getRoleDisplay(user.role),
          statusDisplay: user.isActive ? 'Aktivan' : 'Neaktivan',
        }));
        this.users.set(transformedData);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading users:', err);
        this.toastr.error(err.error?.message || 'Greška pri učitavanju korisnika', 'Greška');
        this.isLoading.set(false);
      },
    });
  }

  openAddModal() {
    this.addAdminForm.reset();
    this.showAddModal.set(true);
  }

  closeAddModal() {
    this.showAddModal.set(false);
    this.addAdminForm.reset();
  }

  onSubmitAdmin() {
    if (this.addAdminForm.invalid) {
      this.addAdminForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const formValue = this.addAdminForm.value;
    const dto = {
      firstName: formValue.firstName,
      lastName: formValue.lastName,
      email: formValue.email,
      password: formValue.password,
      phone: formValue.phone || null,
      address: formValue.address || null,
    };

    this.authService.registerAdmin(dto).subscribe({
      next: () => {
        this.toastr.success('Administrator uspešno dodat', 'Uspeh');
        this.loadUsers();
        this.closeAddModal();
        this.isSubmitting.set(false);
      },
      error: (err) => {
        this.toastr.error(err.error?.message || 'Greška pri dodavanju administratora', 'Greška');
        this.isSubmitting.set(false);
      },
    });
  }

  handleActivate(user: UserProfileToReturnDto) {
    this.userProfileService.activateUser(user.id).subscribe({
      next: () => {
        this.toastr.success('Korisnik aktiviran', 'Uspeh');
        this.loadUsers();
      },
      error: (err) => {
        this.toastr.error(err.error?.message || 'Greška pri aktivaciji', 'Greška');
      },
    });
  }

  handleDeactivate(user: UserProfileToReturnDto) {
    this.userProfileService.deactivateUser(user.id).subscribe({
      next: () => {
        this.toastr.success('Korisnik deaktiviran', 'Uspeh');
        this.loadUsers();
      },
      error: (err) => {
        this.toastr.error(err.error?.message || 'Greška pri deaktivaciji', 'Greška');
      },
    });
  }

  onAction(event: { action: string; item: UserProfileToReturnDto }) {
    switch (event.action) {
      case 'Aktiviraj':
        this.handleActivate(event.item);
        break;
      case 'Deaktiviraj':
        this.handleDeactivate(event.item);
        break;
      case 'Obriši':
        this.openDeleteConfirm(event.item);
        break;
    }
  }

  openDeleteConfirm(user: UserProfileToReturnDto) {
    this.deletingUser.set(user);
    this.showDeleteConfirm.set(true);
  }

  closeDeleteConfirm() {
    this.showDeleteConfirm.set(false);
    this.deletingUser.set(null);
  }

  confirmDelete() {
    const user = this.deletingUser();
    if (!user) return;

    this.userProfileService.deleteProfile(user.id).subscribe({
      next: () => {
        this.toastr.success('Korisnik uspešno obrisan', 'Uspeh');
        this.loadUsers();
        this.closeDeleteConfirm();
      },
      error: (err) => {
        this.toastr.error(err.error?.message || 'Greška pri brisanju korisnika', 'Greška');
        this.closeDeleteConfirm();
      },
    });
  }

  getRoleDisplay(role: UserRole): string {
    switch (role) {
      case UserRole.RegularUser:
        return 'Korisnik';
      case UserRole.Admin:
        return 'Administrator';
      default:
        return 'Nepoznato';
    }
  }
}
