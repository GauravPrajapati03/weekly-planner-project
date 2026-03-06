import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { HomeComponent } from './home.component';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

/**
 * Unit tests for HomeComponent.
 * Tests: ngOnInit (loads active plan, redirect if no user), visibleCards() for all plan states,
 * handleCardAction, finishWeek, cancelPlan, formatDate, confirmSeed, confirmReset, resetApp guard.
 */
describe('HomeComponent', () => {
    let fixture: ComponentFixture<HomeComponent>;
    let component: HomeComponent;
    let httpMock: HttpTestingController;
    let authService: AuthService;
    let router: Router;
    const base = environment.apiUrl;

    const alice: any = { id: 'u1', name: 'Alice', role: 'TeamLead', isActive: true };
    const bob: any = { id: 'u2', name: 'Bob', role: 'TeamMember', isActive: true };

    const planPlanning: any = { id: 'p1', status: 'Planning', weekStartDate: '2025-03-05', weekEndDate: '2025-03-10', clientPercent: 50, techDebtPercent: 30, rdPercent: 20 };
    const planFrozen: any = { id: 'p1', status: 'Frozen', weekStartDate: '2025-03-05', weekEndDate: '2025-03-10', clientPercent: 50, techDebtPercent: 30, rdPercent: 20 };
    const planDone: any = { id: 'p1', status: 'Completed', weekStartDate: '2025-03-05', weekEndDate: '2025-03-10', clientPercent: 50, techDebtPercent: 30, rdPercent: 20 };

    beforeEach(async () => {
        TestBed.resetTestingModule();
        vi.stubGlobal('localStorage', { getItem: () => 'dark', setItem: vi.fn() });
        vi.stubGlobal('matchMedia', () => ({ matches: false }));

        await TestBed.configureTestingModule({
            imports: [HomeComponent],
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                provideRouter([])
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(HomeComponent);
        component = fixture.componentInstance;
        httpMock = TestBed.inject(HttpTestingController);
        authService = TestBed.inject(AuthService);
        router = TestBed.inject(Router);
    });

    afterEach(() => {
        httpMock.verify();
        vi.unstubAllGlobals();
    });

    function init(user = alice, plan: any = null): void {
        authService.setCurrentUser(user);
        fixture.detectChanges();
        httpMock.expectOne(`${base}/weeklyplan/active`).flush(plan);
        fixture.detectChanges();
    }

    // ── Creation ──────────────────────────────────────────────────────────────

    it('should create', () => {
        init();
        expect(component).toBeTruthy();
    });

    it('should redirect to /login if no user is logged in', () => {
        const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
        // Do NOT set a user
        fixture.detectChanges();
        expect(navSpy).toHaveBeenCalledWith(['/login']);
        httpMock.expectNone(`${base}/weeklyplan/active`);
    });

    it('should set activePlan from API and set loading to false', () => {
        init(alice, planPlanning);
        expect(component.activePlan()?.status).toBe('Planning');
        expect(component.loading()).toBe(false);
    });

    // ── visibleCards() ────────────────────────────────────────────────────────

    it('visibleCards() with no plan + Lead should include week-setup and backlog', () => {
        init(alice, null);
        const cards = component.visibleCards();
        const titles = cards.map(c => c.title);
        expect(titles.some(t => t.includes('Set Up'))).toBe(true);
        expect(titles.some(t => t.includes('Backlog'))).toBe(true);
    });

    it('visibleCards() with Planning + Lead should include freeze plan card', () => {
        init(alice, planPlanning);
        const cards = component.visibleCards();
        expect(cards.some(c => c.title?.includes('Freeze'))).toBe(true);
    });

    it('visibleCards() with Planning + Member should NOT include freeze plan card', () => {
        init(bob, planPlanning);
        const cards = component.visibleCards();
        expect(cards.some(c => c.title?.includes('Freeze'))).toBe(false);
    });

    it('visibleCards() with Frozen + Lead should include Finish This Week', () => {
        init(alice, planFrozen);
        const cards = component.visibleCards();
        expect(cards.some(c => c.action === 'finish')).toBe(true);
    });

    it('visibleCards() with Frozen + Member should NOT include Finish This Week', () => {
        init(bob, planFrozen);
        const cards = component.visibleCards();
        expect(cards.some(c => c.action === 'finish')).toBe(false);
    });

    it('visibleCards() with Completed + Lead should include Set Up Next Week', () => {
        init(alice, planDone);
        const cards = component.visibleCards();
        expect(cards.some(c => c.title?.includes('Next Week'))).toBe(true);
    });

    // ── handleCardAction() ────────────────────────────────────────────────────

    it('handleCardAction("finish") should show finish modal', () => {
        init(alice, null);
        component.handleCardAction('finish');
        expect(component.showFinishModal()).toBe(true);
    });

    it('handleCardAction("unknown") should not change state', () => {
        init(alice, null);
        component.handleCardAction('blah');
        expect(component.showFinishModal()).toBe(false);
        expect(component.showCancelModal()).toBe(false);
    });

    // ── finishWeek() ──────────────────────────────────────────────────────────

    it('finishWeek() should POST to complete plan and update status', () => {
        init(alice, planFrozen);
        component.finishWeek();

        const req = httpMock.expectOne(`${base}/weeklyplan/${planFrozen.id}/complete`);
        expect(req.request.method).toBe('POST');
        req.flush(null);

        expect(component.activePlan()?.status).toBe('Completed');
        expect(component.showFinishModal()).toBe(false);
    });

    it('finishWeek() should do nothing when no activePlan', () => {
        init(alice, null);
        component.finishWeek();
        httpMock.expectNone(`${base}/weeklyplan/undefined/complete`);
    });

    // ── cancelPlan() ──────────────────────────────────────────────────────────

    it('cancelPlan() should DELETE plan and clear activePlan', () => {
        init(alice, planPlanning);
        component.cancelPlan();

        const req = httpMock.expectOne(`${base}/weeklyplan/${planPlanning.id}/cancel`);
        expect(req.request.method).toBe('DELETE');
        req.flush(null);

        expect(component.activePlan()).toBeNull();
    });

    // ── formatDate() ──────────────────────────────────────────────────────────

    it('formatDate() should return short month+day string', () => {
        init(alice, null);
        const result = component.formatDate('2025-03-05');
        expect(result).toContain('Mar');
        expect(result).toContain('5');
    });

    // ── confirmSeed / confirmReset / resetApp ─────────────────────────────────

    it('confirmSeed() should show seed modal', () => {
        init(alice, null);
        component.confirmSeed();
        expect(component.showSeedModal()).toBe(true);
    });

    it('confirmReset() should show reset modal', () => {
        init(alice, null);
        component.confirmReset();
        expect(component.showResetModal()).toBe(true);
    });

    it('resetApp() should not call API if confirmText !== RESET', () => {
        init(alice, null);
        component.resetConfirmText = 'wrong';
        component.resetApp();
        httpMock.expectNone(`${base}/admin/reset`);
    });

    it('resetApp() should call /admin/reset when confirmText is RESET', () => {
        init(alice, null);
        component.resetConfirmText = 'RESET';
        component.resetApp();
        const req = httpMock.expectOne(`${base}/admin/reset`);
        expect(req.request.method).toBe('DELETE');
        req.flush({ message: 'reset' });
    });

    it('seedData() should call /admin/seed', () => {
        init(alice, null);
        component.seedData();
        const req = httpMock.expectOne(`${base}/admin/seed`);
        expect(req.request.method).toBe('POST');
        req.flush({ message: 'seeded' });
    });
});
