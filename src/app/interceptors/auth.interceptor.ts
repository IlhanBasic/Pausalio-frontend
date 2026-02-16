import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthStore } from '../stores/auth.store';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const authStore = inject(AuthStore);
    const token = authStore.token();
    const currentBusinessId = authStore.currentBusinessId();

    let headers = req.headers;

    if (token) {
        headers = headers.set('Authorization', `Bearer ${token}`);
    }

    if (currentBusinessId) {
        headers = headers.set('X-Business-Context', currentBusinessId);
    }

    const authReq = req.clone({
        headers: headers,
        withCredentials: true
    });

    const router = inject(Router);
    const authService = inject(AuthService);

    return next(authReq).pipe(
        catchError((error: HttpErrorResponse) => {
            if (error.status === 401) {
                // Token expired or invalid
                authService.logout().subscribe(); // diverse backend logout if needed
                authStore.logout();
                router.navigate(['/login']);
            }
            return throwError(() => error);
        })
    );
};
