import { Injectable, signal, effect } from '@angular/core';

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'wp-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
    readonly theme = signal<Theme>(this._loadSaved());

    constructor() {
        // React to signal changes: write to DOM + localStorage
        effect(() => {
            const t = this.theme();
            document.documentElement.setAttribute('data-theme', t);
            localStorage.setItem(STORAGE_KEY, t);
        });
    }

    get isDark(): boolean { return this.theme() === 'dark'; }

    toggle(): void {
        this.theme.set(this.theme() === 'dark' ? 'light' : 'dark');
    }

    private _loadSaved(): Theme {
        const saved = localStorage.getItem(STORAGE_KEY);
        // Also respect OS preference if no saved value
        if (!saved) {
            return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
        }
        return (saved === 'light') ? 'light' : 'dark';
    }
}
