import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthStore } from '../stores/auth.store';

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

    return next(authReq);
};
