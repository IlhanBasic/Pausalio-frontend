import { Component, inject, signal } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { AuthStore } from '../../stores/auth.store';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-profile',
    standalone: true,
    imports: [ReactiveFormsModule, CommonModule],
    templateUrl: './profile.component.html',
    styleUrl: './profile.component.css'
})
export class ProfileComponent {
    fb = inject(FormBuilder);
    authService = inject(AuthService);
    store = inject(AuthStore);
    toastr = inject(ToastrService);

    isLoading = signal(false);

    showOldPassword = signal(false);
    showNewPassword = signal(false);
    showConfirmPassword = signal(false);

    changePasswordForm = this.fb.group({
        oldPassword: ['', Validators.required],
        newPassword: ['', [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)]],
        confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });

    passwordMatchValidator(g: any) {
        return g.get('newPassword')?.value === g.get('confirmPassword')?.value
            ? null : { mismatch: true };
    }

    toggleVisibility(field: 'old' | 'new' | 'confirm') {
        if (field === 'old') this.showOldPassword.set(!this.showOldPassword());
        if (field === 'new') this.showNewPassword.set(!this.showNewPassword());
        if (field === 'confirm') this.showConfirmPassword.set(!this.showConfirmPassword());
    }

    onSubmit() {
        if (this.changePasswordForm.invalid) return;

        this.isLoading.set(true);

        const val = this.changePasswordForm.value;

        this.authService.changePassword({
            oldPassword: val.oldPassword!,
            newPassword: val.newPassword!
        }).subscribe({
            next: () => {
                this.toastr.success('Lozinka uspešno promenjena.', 'Uspeh');
                this.changePasswordForm.reset();
                this.isLoading.set(false);
            },
            error: (err) => {
                this.toastr.error(err.error?.message || 'Došlo je do greške prilikom promene lozinke.', 'Greška');
                this.isLoading.set(false);
            }
        });
    }

    getUserFullName(): string {
        const user = this.store.user();
        return user ? `${user.firstName} ${user.lastName}` : '';
    }

    getUserEmail(): string {
        return this.store.user()?.email || '';
    }

    getUserRole(): string {
        return this.store.isOwner() ? 'Vlasnik' : 'Asistent';
    }
}
