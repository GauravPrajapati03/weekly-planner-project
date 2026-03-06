import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

/**
 * Unit tests for ThemeService.
 *
 * IMPORTANT: ThemeService uses Angular's effect() in its constructor,
 * which requires an Angular injection context. We must:
 *   1. Mock globals (localStorage, window.matchMedia) with vi.stubGlobal()
 *      BEFORE calling TestBed.configureTestingModule() so that the stubs
 *      are in place when the service is instantiated by the DI container.
 *   2. Call vi.unstubAllGlobals() in afterEach to reset between tests.
 *
 * Angular 21 test runner: Vitest (vi.* APIs).
 */
describe('ThemeService', () => {
    const STORAGE_KEY = 'wp-theme';

    /** Create a fresh localStorage stub backed by an in-memory map. */
    function stubLocalStorage(initial: Record<string, string> = {}): Record<string, string> {
        const store = { ...initial };
        vi.stubGlobal('localStorage', {
            getItem: (k: string) => store[k] ?? null,
            setItem: (k: string, v: string) => { store[k] = v; },
            removeItem: (k: string) => { delete store[k]; },
            clear: () => { for (const k in store) delete store[k]; },
            key: (i: number) => Object.keys(store)[i] ?? null,
            get length() { return Object.keys(store).length; },
        } as Storage);
        return store;
    }

    /** Stub window.matchMedia to simulate OS colour preference. */
    function stubMatchMedia(prefersLight: boolean): void {
        vi.stubGlobal('matchMedia', (_query: string) => ({ matches: prefersLight }));
    }

    afterEach(() => {
        vi.unstubAllGlobals();
        TestBed.resetTestingModule();
    });

    /** Helper: build a fresh service instance with given localStorage state and OS preference. */
    function buildService(savedTheme: string | null, osPreferLight = false): ThemeService {
        const initial: Record<string, string> = {};
        if (savedTheme !== null) initial[STORAGE_KEY] = savedTheme;
        stubLocalStorage(initial);
        stubMatchMedia(osPreferLight);

        TestBed.configureTestingModule({});
        return TestBed.inject(ThemeService);
    }

    // ── Default theme resolution ──────────────────────────────────────────────

    it('defaults to dark when no saved theme and OS prefers dark', () => {
        const svc = buildService(null, false);
        expect(svc.theme()).toBe('dark');
        expect(svc.isDark).toBe(true);
    });

    it('defaults to light when no saved theme and OS prefers light', () => {
        const svc = buildService(null, true);
        expect(svc.theme()).toBe('light');
        expect(svc.isDark).toBe(false);
    });

    // ── Saved theme restoration ───────────────────────────────────────────────

    it('restores saved dark theme from localStorage', () => {
        const svc = buildService('dark');
        expect(svc.theme()).toBe('dark');
    });

    it('restores saved light theme from localStorage', () => {
        const svc = buildService('light');
        expect(svc.theme()).toBe('light');
    });

    it('treats invalid saved value as dark', () => {
        const svc = buildService('invalid_value');
        expect(svc.theme()).toBe('dark');
    });

    // ── toggle() ──────────────────────────────────────────────────────────────

    it('toggle() switches dark → light', () => {
        const svc = buildService('dark');
        svc.toggle();
        expect(svc.theme()).toBe('light');
        expect(svc.isDark).toBe(false);
    });

    it('toggle() switches light → dark', () => {
        const svc = buildService('light');
        svc.toggle();
        expect(svc.theme()).toBe('dark');
        expect(svc.isDark).toBe(true);
    });

    it('toggle() twice returns to original theme', () => {
        const svc = buildService('dark');
        svc.toggle();
        svc.toggle();
        expect(svc.theme()).toBe('dark');
    });

    // ── isDark getter ─────────────────────────────────────────────────────────

    it('isDark is true when theme is dark', () => {
        const svc = buildService('dark');
        expect(svc.isDark).toBe(true);
    });

    it('isDark is false when theme is light', () => {
        const svc = buildService('light');
        expect(svc.isDark).toBe(false);
    });

    it('isDark updates after toggle()', () => {
        const svc = buildService('dark');
        expect(svc.isDark).toBe(true);
        svc.toggle();
        expect(svc.isDark).toBe(false);
    });
});
