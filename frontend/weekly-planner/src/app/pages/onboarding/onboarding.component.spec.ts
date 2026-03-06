import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { OnboardingComponent } from './onboarding.component';
import { environment } from '../../../environments/environment';

/**
 * Unit tests for OnboardingComponent.
 * Covers: init redirect for existing users, addMember (lead/member role), makeLead, removeMember, goToLogin.
 */
describe('OnboardingComponent', () => {
    let fixture: ComponentFixture<OnboardingComponent>;
    let component: OnboardingComponent;
    let httpMock: HttpTestingController;
    let router: Router;
    const base = environment.apiUrl;

    beforeEach(async () => {
        TestBed.resetTestingModule();
        await TestBed.configureTestingModule({
            imports: [OnboardingComponent],
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                provideRouter([])
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(OnboardingComponent);
        component = fixture.componentInstance;
        httpMock = TestBed.inject(HttpTestingController);
        router = TestBed.inject(Router);
    });

    afterEach(() => httpMock.verify());

    // ── Creation ──────────────────────────────────────────────────────────────

    it('should create', () => {
        fixture.detectChanges();
        httpMock.expectOne(`${base}/users`).flush([]);
        expect(component).toBeTruthy();
    });

    // ── ngOnInit: redirect if users already exist ─────────────────────────────

    it('should redirect to /login if users already exist', () => {
        const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
        fixture.detectChanges();
        httpMock.expectOne(`${base}/users`).flush([
            { id: 'u1', name: 'Alice', role: 'TeamLead', isActive: true }
        ]);
        expect(navSpy).toHaveBeenCalledWith(['/login'], { replaceUrl: true });
    });

    it('should NOT redirect when user list is empty', () => {
        const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
        fixture.detectChanges();
        httpMock.expectOne(`${base}/users`).flush([]);
        expect(navSpy).not.toHaveBeenCalled();
    });

    // ── addMember() ───────────────────────────────────────────────────────────

    it('addMember() should not call API when name is empty', () => {
        fixture.detectChanges();
        httpMock.expectOne(`${base}/users`).flush([]);
        component.newName = '  ';
        component.addMember();
        httpMock.expectNone(`${base}/users`);
    });

    it('addMember() should create first user as TeamLead', () => {
        fixture.detectChanges();
        httpMock.expectOne(`${base}/users`).flush([]);

        component.newName = 'Alice';
        component.addMember();

        const req = httpMock.expectOne(r => r.method === 'POST' && r.url === `${base}/users`);
        expect(req.request.body.role).toBe('TeamLead');
        req.flush({ id: 'u1', name: 'Alice', role: 'TeamLead', isActive: true });

        expect(component.members()).toHaveLength(1);
        expect(component.newName).toBe('');
    });

    it('addMember() should create subsequent users as TeamMember', () => {
        fixture.detectChanges();
        httpMock.expectOne(`${base}/users`).flush([]);

        // Seed one existing member (the lead)
        component.members.set([{ id: 'u1', name: 'Alice', role: 'TeamLead', isActive: true }]);

        component.newName = 'Bob';
        component.addMember();

        const req = httpMock.expectOne(r => r.method === 'POST' && r.url === `${base}/users`);
        expect(req.request.body.role).toBe('TeamMember');
        req.flush({ id: 'u2', name: 'Bob', role: 'TeamMember', isActive: true });
        expect(component.members()).toHaveLength(2);
    });

    // ── makeLead() ────────────────────────────────────────────────────────────

    it('makeLead() should promote member to TeamLead via API', () => {
        fixture.detectChanges();
        httpMock.expectOne(`${base}/users`).flush([]);

        const alice = { id: 'u1', name: 'Alice', role: 'TeamLead' as 'TeamLead', isActive: true };
        const bob = { id: 'u2', name: 'Bob', role: 'TeamMember' as 'TeamMember', isActive: true };
        component.members.set([alice, bob]);

        component.makeLead(bob);

        const req = httpMock.expectOne(`${base}/users/${bob.id}`);
        expect(req.request.method).toBe('PUT');
        expect(req.request.body.role).toBe('TeamLead');
        req.flush({ ...bob, role: 'TeamLead' });

        // Alice should be demoted in local state
        expect(component.members().find(m => m.id === 'u1')?.role).toBe('TeamMember');
        expect(component.members().find(m => m.id === 'u2')?.role).toBe('TeamLead');
    });

    // ── removeMember() ────────────────────────────────────────────────────────

    it('removeMember() should delete member and remove from local list', () => {
        fixture.detectChanges();
        httpMock.expectOne(`${base}/users`).flush([]);

        const bob = { id: 'u2', name: 'Bob', role: 'TeamMember' as 'TeamMember', isActive: true };
        component.members.set([
            { id: 'u1', name: 'Alice', role: 'TeamLead' as 'TeamLead', isActive: true },
            bob
        ]);

        component.removeMember(bob);

        const req = httpMock.expectOne(`${base}/users/${bob.id}`);
        expect(req.request.method).toBe('DELETE');
        req.flush(null);

        expect(component.members()).toHaveLength(1);
        expect(component.members().find(m => m.id === 'u2')).toBeUndefined();
    });

    // ── goToLogin() ───────────────────────────────────────────────────────────

    it('goToLogin() should redirect to /login', () => {
        const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
        fixture.detectChanges();
        httpMock.expectOne(`${base}/users`).flush([]);

        component.goToLogin();
        expect(navSpy).toHaveBeenCalledWith(['/login'], { replaceUrl: true });
    });
});
