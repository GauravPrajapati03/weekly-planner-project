import { Injectable, signal } from '@angular/core';
import { User } from '../models/models';

/**
 * AuthService — manages the currently logged-in user.
 * Session is in-memory only — refreshing the browser returns to the "Who are you?" screen
 * (same behaviour as the demo app).
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly _currentUser = signal<User | null>(null);

    /** Reactive signal — components use currentUser() to get the logged-in user. */
    readonly currentUser = this._currentUser.asReadonly();

    /** Returns true if the current user is a Team Lead. */
    get isLead(): boolean {
        return this._currentUser()?.role === 'TeamLead';
    }

    /** Sets the active user (session-only, not persisted). */
    setCurrentUser(user: User): void {
        this._currentUser.set(user);
    }

    /** Clears the session — user must re-login. */
    clearUser(): void {
        this._currentUser.set(null);
    }
}
