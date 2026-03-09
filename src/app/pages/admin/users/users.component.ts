import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
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
  imports: [CommonModule, ReactiveFormsModule, DataTableComponent, TranslateModule],
  templateUrl: './users.component.html',
  styleUrl: './users.component.css',
})
export class UsersComponent implements OnInit {
  userProfileService = inject(UserProfileService);
  authService = inject(AuthService);
  fb = inject(FormBuilder);
  toastr = inject(ToastrService);
  translate = inject(TranslateService);
  
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
    { key: 'fullName', label: 'USERS.COLUMN_FULL_NAME', sortable: true },
    { key: 'email', label: 'USERS.COLUMN_EMAIL', sortable: true },
    { key: 'roleDisplay', label: 'USERS.COLUMN_ROLE', sortable: true },
    { key: 'statusDisplay', label: 'USERS.COLUMN_STATUS', sortable: false },
  ];

  actions: TableAction[] = [
    {
      label: this.translate.instant('USERS.ACTION_ACTIVATE'),
      icon: '✅',
      type: 'custom',
      showCondition: (user: UserProfileToReturnDto) => !user.isActive,
    },
    {
      label: this.translate.instant('USERS.ACTION_DEACTIVATE'),
      icon: '⛔',
      type: 'custom',
      showCondition: (user: UserProfileToReturnDto) => user.isActive,
    },
    { label: this.translate.instant('USERS.ACTION_DELETE'), icon: '🗑️', type: 'delete' },
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
          statusDisplay: user.isActive 
            ? this.translate.instant('USERS.STATUS_ACTIVE')
            : this.translate.instant('USERS.STATUS_INACTIVE'),
        }));
        this.users.set(transformedData);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading users:', err);
        this.toastr.error(
          err.error?.message || this.translate.instant('USERS.TOAST_LOAD_ERROR'),
          this.translate.instant('USERS.TOAST_ERROR_TITLE')
        );
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
        this.toastr.success(
          this.translate.instant('USERS.TOAST_CREATE_SUCCESS'),
          this.translate.instant('USERS.TOAST_SUCCESS_TITLE')
        );
        this.loadUsers();
        this.closeAddModal();
        this.isSubmitting.set(false);
      },
      error: (err) => {
        this.toastr.error(
          err.error?.message || this.translate.instant('USERS.TOAST_CREATE_ERROR'),
          this.translate.instant('USERS.TOAST_ERROR_TITLE')
        );
        this.isSubmitting.set(false);
      },
    });
  }

  handleActivate(user: UserProfileToReturnDto) {
    this.userProfileService.activateUser(user.id).subscribe({
      next: () => {
        this.toastr.success(
          this.translate.instant('USERS.TOAST_ACTIVATE_SUCCESS'),
          this.translate.instant('USERS.TOAST_SUCCESS_TITLE')
        );
        this.loadUsers();
      },
      error: (err) => {
        this.toastr.error(
          err.error?.message || this.translate.instant('USERS.TOAST_ACTIVATE_ERROR'),
          this.translate.instant('USERS.TOAST_ERROR_TITLE')
        );
      },
    });
  }

  handleDeactivate(user: UserProfileToReturnDto) {
    this.userProfileService.deactivateUser(user.id).subscribe({
      next: () => {
        this.toastr.success(
          this.translate.instant('USERS.TOAST_DEACTIVATE_SUCCESS'),
          this.translate.instant('USERS.TOAST_SUCCESS_TITLE')
        );
        this.loadUsers();
      },
      error: (err) => {
        this.toastr.error(
          err.error?.message || this.translate.instant('USERS.TOAST_DEACTIVATE_ERROR'),
          this.translate.instant('USERS.TOAST_ERROR_TITLE')
        );
      },
    });
  }

  onAction(event: { action: string; item: UserProfileToReturnDto }) {
    const actionMap: { [key: string]: () => void } = {
      [this.translate.instant('USERS.ACTION_ACTIVATE')]: () => this.handleActivate(event.item),
      [this.translate.instant('USERS.ACTION_DEACTIVATE')]: () => this.handleDeactivate(event.item),
      [this.translate.instant('USERS.ACTION_DELETE')]: () => this.openDeleteConfirm(event.item),
    };
    
    const action = actionMap[event.action];
    if (action) {
      action();
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
        this.toastr.success(
          this.translate.instant('USERS.TOAST_DELETE_SUCCESS'),
          this.translate.instant('USERS.TOAST_SUCCESS_TITLE')
        );
        this.loadUsers();
        this.closeDeleteConfirm();
      },
      error: (err) => {
        this.toastr.error(
          err.error?.message || this.translate.instant('USERS.TOAST_DELETE_ERROR'),
          this.translate.instant('USERS.TOAST_ERROR_TITLE')
        );
        this.closeDeleteConfirm();
      },
    });
  }

  getRoleDisplay(role: UserRole): string {
    switch (role) {
      case UserRole.RegularUser:
        return this.translate.instant('USERS.ROLE_USER');
      case UserRole.Admin:
        return this.translate.instant('USERS.ROLE_ADMIN');
      default:
        return this.translate.instant('USERS.ROLE_UNKNOWN');
    }
  }
}