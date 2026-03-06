import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { NavbarComponent } from './navbar.component';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { User } from '../../core/models/models';

/** Dummy component needed so we can register a '/home' route in tests */
@Component({ standalone: true, template: '' })
class DummyComponent { }

/**
 * Unit tests for NavbarComponent.
 * Covers: isOnHome() URL check, switchUser() clears auth + navigates, theme toggling.
 */
describe('NavbarComponent', () => {
    let fixture: ComponentFixture<NavbarComponent>;
    let component: NavbarComponent;
    let authService: AuthService;
    let themeService: ThemeService;
    let router: Router;

    const mockLead: User = { id: 'u1', name: 'Alice', role: 'TeamLead', isActive: true };

    beforeEach(async () => {
        TestBed.resetTestingModule();
        // Stub localStorage and matchMedia before ThemeService is injected
        vi.stubGlobal('localStorage', {
            getItem: () => 'dark',
            setItem: vi.fn(),
            removeItem: vi.fn(),
            clear: vi.fn(),
        });
        vi.stubGlobal('matchMedia', () => ({ matches: false }));

        await TestBed.configureTestingModule({
            imports: [
                NavbarComponent,
                RouterModule.forRoot([
                    { path: 'home', component: DummyComponent },
                    { path: '', component: DummyComponent }
                ])
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(NavbarComponent);
        component = fixture.componentInstance;
        authService = TestBed.inject(AuthService);
        themeService = TestBed.inject(ThemeService);
        router = TestBed.inject(Router);

        fixture.detectChanges();
    });

    afterEach(() => vi.unstubAllGlobals());

    // ── Creation ──────────────────────────────────────────────────────────────

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    // ── isOnHome() ────────────────────────────────────────────────────────────

    it('isOnHome() should return true when URL is /home', async () => {
        await router.navigate(['/home']);
        expect(component.isOnHome()).toBe(true);
    });

    it('isOnHome() should return false when URL is not /home', async () => {
        await router.navigate(['/']);
        expect(component.isOnHome()).toBe(false);
    });

    // ── switchUser() ──────────────────────────────────────────────────────────

    it('switchUser() should clear auth user and navigate to /login', () => {
        authService.setCurrentUser(mockLead);
        const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
        const clearSpy = vi.spyOn(authService, 'clearUser');

        component.switchUser();

        expect(clearSpy).toHaveBeenCalled();
        expect(navSpy).toHaveBeenCalledWith(['/login']);
    });

    // ── auth signals ──────────────────────────────────────────────────────────

    it('auth.currentUser() should reflect the logged-in user', () => {
        authService.setCurrentUser(mockLead);
        expect(component.auth.currentUser()?.name).toBe('Alice');
        expect(component.auth.isLead).toBe(true);
    });

    it('auth.currentUser() should be null when no user is set', () => {
        authService.clearUser();
        expect(component.auth.currentUser()).toBeNull();
    });

    // ── theme ─────────────────────────────────────────────────────────────────

    it('theme.isDark should be accessible from navbar', () => {
        expect(typeof component.theme.isDark).toBe('boolean');
    });

    it('theme.toggle() should change the theme', () => {
        const before = component.theme.isDark;
        component.theme.toggle();
        expect(component.theme.isDark).toBe(!before);
    });
});
