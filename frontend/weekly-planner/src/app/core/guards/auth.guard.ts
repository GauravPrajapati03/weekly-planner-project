import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Auth Guard — protects all routes except login and onboarding.
 * If no user is logged in (session is in-memory only), redirects to /login.
 * This ensures refreshing any page always goes back to "Who are you?".
 */
export const authGuard: CanActivateFn = () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (auth.currentUser()) {
        return true;
    }

    return router.createUrlTree(['/login']);
};
