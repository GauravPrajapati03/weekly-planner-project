import { Injectable, signal } from '@angular/core';
import { User } from '../models/models';

const STORAGE_KEY = 'wpt_current_user';

/**
 * AuthService — manages the currently logged-in user.
 * Uses localStorage for persistence (simple role-selection, no JWT needed per specs).
 * Uses Angular signals for reactive state propagation.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly _currentUser = signal<User | null>(this.loadFromStorage());

    /** Reactive signal — components use currentUser() to get the logged-in user. */
    readonly currentUser = this._currentUser.asReadonly();

    /** Returns true if the current user is a Team Lead. */
    get isLead(): boolean {
        return this._currentUser()?.role === 'TeamLead';
    }

    /** Sets the active user and persists to localStorage. */
    setCurrentUser(user: User): void {
        this._currentUser.set(user);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    }

    /** Clears the session — user must re-login. */
    clearUser(): void {
        this._currentUser.set(null);
        localStorage.removeItem(STORAGE_KEY);
    }

    private loadFromStorage(): User | null {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? (JSON.parse(raw) as User) : null;
        } catch {
            return null;
        }
    }
}
