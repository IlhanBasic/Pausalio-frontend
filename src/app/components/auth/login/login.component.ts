import { Component, inject, signal } from '@angular/core';
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
export class LoginComponent {
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

  togglePasswordVisibility() {
    this.showPassword.set(!this.showPassword());
  }

  googleLogin() {
    (window as any).google.accounts.id.initialize({
      client_id: environment.googleClientId,
      callback: (response: any) => {
        const idToken = response.credential;
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
            }
            this.isLoading.set(false);
          },
          error: (err) => {
            this.toastr.error(
              err.error?.message || this.translate.instant('LOGIN.TOAST_GOOGLE_ERROR'),
              this.translate.instant('LOGIN.TOAST_ERROR_TITLE')
            );
            this.isLoading.set(false);
          },
        });
      },
    });

    (window as any).google.accounts.id.prompt();
  }

  onSubmit() {
    if (this.loginForm.invalid) return;

    this.isLoading.set(true);

    const { email, password } = this.loginForm.value;

    this.authService.login({ email: email!, password: password! }).subscribe({
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
          err.error?.message || this.translate.instant('LOGIN.TOAST_ERROR_GENERIC'),
          this.translate.instant('LOGIN.TOAST_ERROR_TITLE')
        );
        this.isLoading.set(false);
      },
    });
  }
}