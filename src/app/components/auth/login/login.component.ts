
import { Component, inject, signal, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../../services/auth.service';
import { AuthStore } from '../../../stores/auth.store';
import { CommonModule } from '@angular/common';
import { PASSWORD_REGEX } from '../../shared/constants/password-regex';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink, TranslateModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent implements OnInit {
  fb = inject(FormBuilder);
  authService = inject(AuthService);
  authStore = inject(AuthStore);
  router = inject(Router);
  toastr = inject(ToastrService);
  translate = inject(TranslateService);

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.pattern(PASSWORD_REGEX)]],
  });

  isLoading = signal(false);
  showPassword = signal(false);

  ngOnInit(): void {
    this.initializeGoogleLogin();
  }

  private initializeGoogleLogin(): void {
    const google = (window as any).google;

    if (!google?.accounts?.id) {
      console.error(
        'Google Identity Services nije učitan. Proveri gsi/client skriptu.'
      );
      return;
    }

    google.accounts.id.initialize({
      client_id: environment.googleClientId,
      callback: (response: any) => {
        if (response?.credential) {
          this.handleGoogleLogin(response.credential);
        } else {
          console.error('Google nije vratio ID token.');
        }
      },
    });

    const buttonContainer = document.getElementById('google-signin-button');

    if (!buttonContainer) {
      console.error('Nije pronađen #google-signin-button element.');
      return;
    }

    google.accounts.id.renderButton(buttonContainer, {
      theme: 'outline',
      size: 'large',
      text: 'signin_with',
      shape: 'rectangular',
      width: 300,
    });
  }

  private handleGoogleLogin(idToken: string): void {
    this.isLoading.set(true);

    this.authService.googleLogin(idToken).subscribe({
      next: (res) => {
        if (res.token) {
          this.authStore.login(res.token);
          this.toastr.success(
            this.translate.instant('LOGIN.TOAST_SUCCESS_MSG'),
            this.translate.instant('LOGIN.TOAST_SUCCESS_TITLE')
          );
          this.router.navigate(['/home']);
        } else {
          this.toastr.error(
            this.translate.instant('LOGIN.TOAST_ERROR_NO_TOKEN'),
            this.translate.instant('LOGIN.TOAST_ERROR_TITLE')
          );
        }

        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Google login error:', err);

        this.toastr.error(
          err.error?.message ||
            this.translate.instant('LOGIN.TOAST_GOOGLE_ERROR'),
          this.translate.instant('LOGIN.TOAST_ERROR_TITLE')
        );

        this.isLoading.set(false);
      },
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword.set(!this.showPassword());
  }

  onSubmit(): void {
    if (this.loginForm.invalid) return;

    this.isLoading.set(true);

    const { email, password } = this.loginForm.value;

    this.authService.login({
      email: email!,
      password: password!,
    }).subscribe({
      next: (response) => {
        if (response.token) {
          this.authStore.login(response.token);
          this.toastr.success(
            this.translate.instant('LOGIN.TOAST_SUCCESS_MSG'),
            this.translate.instant('LOGIN.TOAST_SUCCESS_TITLE')
          );
          this.router.navigate(['/home']);
        } else {
          this.toastr.error(
            this.translate.instant('LOGIN.TOAST_ERROR_NO_TOKEN'),
            this.translate.instant('LOGIN.TOAST_ERROR_TITLE')
          );
        }

        this.isLoading.set(false);
      },
      error: (err) => {
        console.error(err);

        this.toastr.error(
          err.error?.message ||
            this.translate.instant('LOGIN.TOAST_ERROR_GENERIC'),
          this.translate.instant('LOGIN.TOAST_ERROR_TITLE')
        );

        this.isLoading.set(false);
      },
    });
  }
}
