import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastrService } from 'ngx-toastr';
import { UserProfileService } from '../../../services/user-profile.service';
import { UserProfileToReturnDto } from '../../../models/user-profile';
import { DataTableComponent, TableColumn, TableAction } from '../../../components/shared/data-table/data-table.component';
import { UserRole } from '../../../enums/user-role';

@Component({
    selector: 'app-users',
    standalone: true,
    imports: [CommonModule, DataTableComponent],
    templateUrl: './users.component.html',
    styleUrl: './users.component.css'
})
export class UsersComponent implements OnInit {
    userProfileService = inject(UserProfileService);
    toastr = inject(ToastrService);

    users = signal<any[]>([]);
    isLoading = signal(false);
    showDeleteConfirm = signal(false);
    deletingUser = signal<UserProfileToReturnDto | null>(null);

    columns: TableColumn[] = [
        { key: 'fullName', label: 'Ime i prezime', sortable: true },
        { key: 'email', label: 'Email', sortable: true },
        { key: 'roleDisplay', label: 'Uloga', sortable: true },
        { key: 'statusDisplay', label: 'Status', sortable: false }
    ];

    actions: TableAction[] = [
        { label: 'Obriši', icon: '🗑️', type: 'delete' }
    ];

    ngOnInit() {
        this.loadUsers();
    }

    loadUsers() {
        this.isLoading.set(true);
        this.userProfileService.getProfiles().subscribe({
            next: (users) => {
                const transformedData = users.map(user => ({
                    ...user,
                    fullName: `${user.firstName} ${user.lastName}`,
                    roleDisplay: this.getRoleDisplay(user.role),
                    statusDisplay: user.isActive ? 'Aktivan' : 'Neaktivan'
                }));
                this.users.set(transformedData);
                this.isLoading.set(false);
            },
            error: (err) => {
                console.error('Error loading users:', err);
                this.toastr.error('Greška pri učitavanju korisnika', 'Greška');
                this.isLoading.set(false);
            }
        });
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
                console.error('Error deleting user:', err);
                const errorMessage = err.error?.message || 'Greška pri brisanju korisnika';
                this.toastr.error(errorMessage, 'Greška');
                this.closeDeleteConfirm();
            }
        });
    }

    getRoleDisplay(role: UserRole): string {
        switch (role) {
            case UserRole.Owner:
                return 'Vlasnik';
            case UserRole.Assistant:
                return 'Asistent';
            case UserRole.Admin:
                return 'Administrator';
            default:
                return 'Nepoznato';
        }
    }
}
