import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-forgot-password',
    standalone: true,
    imports: [ReactiveFormsModule, CommonModule, RouterLink],
    templateUrl: './forgot-password.component.html',
    styleUrl: './forgot-password.component.css'
})
export class ForgotPasswordComponent {
    fb = inject(FormBuilder);
    authService = inject(AuthService);
    router = inject(Router);

    step = signal<1 | 2>(1);
    isLoading = signal(false);
    errorMessage = signal<string | null>(null);
    successMessage = signal<string | null>(null);
    showPassword = signal(false);
    showConfirmPassword = signal(false);

    emailForm = this.fb.group({
        email: ['', [Validators.required, Validators.email]]
    });

    resetForm = this.fb.group({
        email: [''], // Hidden, carries over from step 1
        pin: ['', Validators.required],
        newPassword: ['', [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)]],
        confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });

    passwordMatchValidator(g: any) {
        return g.get('newPassword')?.value === g.get('confirmPassword')?.value
            ? null : { mismatch: true };
    }

    togglePasswordVisibility() {
        this.showPassword.set(!this.showPassword());
    }

    toggleConfirmPasswordVisibility() {
        this.showConfirmPassword.set(!this.showConfirmPassword());
    }

    onSendPin() {
        if (this.emailForm.invalid) return;

        this.isLoading.set(true);
        this.errorMessage.set(null);
        const email = this.emailForm.get('email')?.value!;

        this.authService.forgotPassword({ email }).subscribe({
            next: () => {
                this.step.set(2);
                this.resetForm.patchValue({ email });
                this.successMessage.set('PIN je poslat na vašu email adresu.');
                this.isLoading.set(false);
            },
            error: (err) => {
                this.errorMessage.set(err.error?.message || 'Došlo je do greške prilikom slanja PIN-a.');
                this.isLoading.set(false);
            }
        });
    }

    onResetPassword() {
        if (this.resetForm.invalid) return;

        this.isLoading.set(true);
        this.errorMessage.set(null);
        const val = this.resetForm.value;

        this.authService.resetPassword({
            email: val.email!,
            pin: val.pin!,
            newPassword: val.newPassword!
        }).subscribe({
            next: () => {
                this.successMessage.set('Lozinka uspešno promenjena! Preusmeravanje na prijavu...');
                setTimeout(() => this.router.navigate(['/login']), 2000);
            },
            error: (err) => {
                this.errorMessage.set(err.error?.message || 'Došlo je do greške prilikom resetovanja lozinke.');
                this.isLoading.set(false);
            }
        });
    }
}
