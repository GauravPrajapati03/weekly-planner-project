import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { authGuard } from './auth.guard';
import { User } from '../models/models';

/**
 * Unit tests for authGuard (CanActivateFn).
 * The guard returns `true` if a user is logged in, or a UrlTree to /login if not.
 */
describe('authGuard', () => {
    let authService: AuthService;
    let router: Router;

    const mockUser: User = {
        id: 'u1', name: 'Alice', role: 'TeamLead', isActive: true
    };

    /** Run the guard in an Angular injection context. */
    function runGuard(): boolean | UrlTree {
        return TestBed.runInInjectionContext(() =>
            authGuard({} as any, {} as any)
        ) as boolean | UrlTree;
    }

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                AuthService,
                { provide: Router, useValue: { createUrlTree: (path: string[]) => path, navigate: vi.fn() } }
            ]
        });
        authService = TestBed.inject(AuthService);
        router = TestBed.inject(Router);
    });

    it('should return true when a user is logged in', () => {
        authService.setCurrentUser(mockUser);
        const result = runGuard();
        expect(result).toBe(true);
    });

    it('should redirect to /login when no user is logged in', () => {
        // Ensure no user is set
        authService.clearUser();
        const result = runGuard();
        // router.createUrlTree returns the path array in our stub
        expect(result).toEqual(['/login']);
    });

    it('should create a UrlTree (not boolean false) when no user is logged in', () => {
        authService.clearUser();
        // We verify the guard calls router.createUrlTree, not just returns false
        const createUrlTreeSpy = vi.spyOn(router, 'createUrlTree');
        runGuard();
        expect(createUrlTreeSpy).toHaveBeenCalledWith(['/login']);
    });

    it('should allow access after setting a user', () => {
        authService.clearUser();
        expect(runGuard()).not.toBe(true);

        authService.setCurrentUser(mockUser);
        expect(runGuard()).toBe(true);
    });
});
