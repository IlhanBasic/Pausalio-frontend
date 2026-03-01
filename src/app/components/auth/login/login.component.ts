import { Component, inject, signal } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { AuthStore } from '../../../stores/auth.store';
import { CommonModule } from '@angular/common';
import { PASSWORD_REGEX } from '../../shared/constants/password-regex';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  fb = inject(FormBuilder);
  authService = inject(AuthService);
  authStore = inject(AuthStore);
  router = inject(Router);
  toastr = inject(ToastrService);

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.pattern(PASSWORD_REGEX)]]
  });

  isLoading = signal(false);
  showPassword = signal(false);

  togglePasswordVisibility() {
    this.showPassword.set(!this.showPassword());
  }

  onSubmit() {
    if (this.loginForm.invalid) return;

    this.isLoading.set(true);

    const { email, password } = this.loginForm.value;

    this.authService.login({ email: email!, password: password! }).subscribe({
      next: (response) => {
        if (response.token) {
          this.authStore.login(response.token);
          this.toastr.success('Uspešna prijava!', 'Dobrodošli');
          this.router.navigate(['/home']);
        } else {
          this.toastr.error('Neuspešna prijava: Token nije primljen.', 'Greška');
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.toastr.error(err.error?.message || 'Došlo je do greške prilikom prijave.', 'Greška');
        this.isLoading.set(false);
      }
    });
  }
}
