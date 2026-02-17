import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../stores/auth.store';

export const authGuard: CanActivateFn = (route, state) => {
    const authStore = inject(AuthStore);
    const router = inject(Router);

    if (authStore.isAuthenticated()) {
        return true;
    }

    return router.createUrlTree(['/login']);
};

export const guestGuard: CanActivateFn = (route, state) => {
    const authStore = inject(AuthStore);
    const router = inject(Router);

    if (!authStore.isAuthenticated()) {
        return true;
    }

    return router.createUrlTree(['/home']);
};
export const adminGuard: CanActivateFn = (route, state) => {
    const authStore = inject(AuthStore);
    const router = inject(Router);

    if (authStore.isAdmin()) {
        return true;
    }

    return router.createUrlTree(['/home']);
};

export const nonAdminGuard: CanActivateFn = (route, state) => {
    const authStore = inject(AuthStore);
    const router = inject(Router);

    if (!authStore.isAdmin()) {
        return true;
    }

    return router.createUrlTree(['/admin']);
};