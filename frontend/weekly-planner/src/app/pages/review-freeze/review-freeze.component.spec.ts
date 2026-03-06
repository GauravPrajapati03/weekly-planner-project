import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ReviewFreezeComponent } from './review-freeze.component';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

/**
 * Unit tests for ReviewFreezeComponent.
 * Covers: init, memberRows, categoryRows, unmetConditions, toggleExpanded/isExpanded,
 * freeze(), cancelPlan(), formatDate, absNum, catLabel/catClass.
 */
describe('ReviewFreezeComponent', () => {
    let fixture: ComponentFixture<ReviewFreezeComponent>;
    let component: ReviewFreezeComponent;
    let httpMock: HttpTestingController;
    let authService: AuthService;
    let router: Router;
    const base = environment.apiUrl;

    const alice = { id: 'u1', name: 'Alice', role: 'TeamLead' as 'TeamLead', isActive: true };
    const bob = { id: 'u2', name: 'Bob', role: 'TeamMember' as 'TeamMember', isActive: true };

    const plan: any = {
        id: 'p1', status: 'Planning',
        weekStartDate: '2025-03-05', weekEndDate: '2025-03-10',
        totalTeamHours: 60,
        clientPercent: 50, techDebtPercent: 30, rdPercent: 20,
        selectedMemberIds: ['u1', 'u2']
    };

    const dashboard: any = {
        overallProgress: 50,
        totalPlannedHours: 60, totalCompletedHours: 0,
        categoryBreakdown: [
            { category: 'Client', plannedHours: 30 },
            { category: 'TechDebt', plannedHours: 18 },
            { category: 'RnD', plannedHours: 12 },
        ],
        userBreakdown: [
            { userId: 'u1', plannedHours: 30, tasks: [] },
            { userId: 'u2', plannedHours: 30, tasks: [] },
        ],
        tasks: []
    };

    beforeEach(async () => {
        TestBed.resetTestingModule();
        // Stub localStorage (memberRows() reads localStorage for submit key)
        const store: Record<string, string> = {};
        vi.stubGlobal('localStorage', {
            getItem: (k: string) => store[k] ?? null,
            setItem: (k: string, v: string) => { store[k] = v; },
        });
        vi.stubGlobal('matchMedia', () => ({ matches: false }));

        await TestBed.configureTestingModule({
            imports: [ReviewFreezeComponent],
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                provideRouter([])
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(ReviewFreezeComponent);
        component = fixture.componentInstance;
        httpMock = TestBed.inject(HttpTestingController);
        authService = TestBed.inject(AuthService);
        router = TestBed.inject(Router);
    });

    afterEach(() => {
        httpMock.verify();
        vi.unstubAllGlobals();
    });

    /**
     * Initializes the component by setting the user, triggering detectChanges,
     * flushing all HTTP responses, and awaiting fixture.whenStable() so that
     * the component's Promise.all().then(() => loading.set(false)) resolves.
     */
    async function init(): Promise<void> {
        authService.setCurrentUser(alice);
        fixture.detectChanges();
        // Flush the first request: active plan
        httpMock.expectOne(`${base}/weeklyplan/active`).flush(plan);
        // Flush the two parallel requests started by Promise.all
        httpMock.expectOne(`${base}/weeklyplan/${plan.id}/dashboard`).flush(dashboard);
        httpMock.expectOne(`${base}/users`).flush([alice, bob]);
        // Wait for Promise.all to resolve so loading() becomes false
        await fixture.whenStable();
        fixture.detectChanges();
    }

    // ── Creation ──────────────────────────────────────────────────────────────

    it('should create', async () => {
        await init();
        expect(component).toBeTruthy();
    });

    it('should load plan, dashboard, and users on init', async () => {
        await init();
        expect(component.plan()?.id).toBe('p1');
        expect(component.dashboard()).toBeTruthy();
        expect(component.loading()).toBe(false);
    });

    // ── memberRows() ──────────────────────────────────────────────────────────

    it('memberRows() should return one row per selected member', async () => {
        await init();
        const rows = component.memberRows();
        expect(rows).toHaveLength(2);
        expect(rows[0].userName).toBe('Alice');
        expect(rows[1].userName).toBe('Bob');
    });

    it('memberRows() should show planned hours from dashboard data', async () => {
        await init();
        const rows = component.memberRows();
        expect(rows[0].hoursPlanned).toBe(30);
        expect(rows[1].hoursPlanned).toBe(30);
    });

    // ── categoryRows() ────────────────────────────────────────────────────────

    it('categoryRows() should return 3 categories', async () => {
        await init();
        expect(component.categoryRows()).toHaveLength(3);
    });

    it('categoryRows() should compute budget and planned hours correctly', async () => {
        await init();
        const clientRow = component.categoryRows().find(r => r.label === 'Client Focused')!;
        expect(clientRow.budget).toBe(30); // 50% of 60
        expect(clientRow.planned).toBe(30);
        expect(clientRow.ok).toBe(true);
    });

    // ── unmetConditions() ────────────────────────────────────────────────────

    it('unmetConditions() should be empty when all hours are 30 and categories match', async () => {
        await init();
        expect(component.unmetConditions()).toHaveLength(0);
    });

    it('unmetConditions() should report members with < 30h', async () => {
        await init();
        // Override memberRows with underplanned member
        component.dashboard.set({
            ...dashboard,
            userBreakdown: [
                { userId: 'u1', plannedHours: 20, tasks: [] },  // 10h short
                { userId: 'u2', plannedHours: 30, tasks: [] },
            ]
        });
        const msgs = component.unmetConditions();
        expect(msgs.some(m => m.includes('Alice'))).toBe(true);
    });

    // ── toggleExpanded / isExpanded ───────────────────────────────────────────

    it('toggleExpanded() should expand then collapse a user row', async () => {
        await init();
        component.toggleExpanded('u1');
        expect(component.isExpanded('u1')).toBe(true);
        component.toggleExpanded('u1');
        expect(component.isExpanded('u1')).toBe(false);
    });

    // ── freeze() ──────────────────────────────────────────────────────────────

    it('freeze() should POST /weeklyplan/:id/freeze and navigate home', async () => {
        await init();
        const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

        component.freeze();

        const req = httpMock.expectOne(`${base}/weeklyplan/${plan.id}/freeze`);
        expect(req.request.method).toBe('POST');
        req.flush(null);

        expect(navSpy).toHaveBeenCalledWith(['/home']);
    });

    // ── cancelPlan() ──────────────────────────────────────────────────────────

    it('cancelPlan() should DELETE /weeklyplan/:id/cancel and navigate home', async () => {
        await init();
        const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

        component.cancelPlan();

        const req = httpMock.expectOne(`${base}/weeklyplan/${plan.id}/cancel`);
        expect(req.request.method).toBe('DELETE');
        req.flush(null);

        expect(navSpy).toHaveBeenCalledWith(['/home']);
    });

    // ── formatDate / absNum / catLabel / catClass ─────────────────────────────

    it('formatDate() should return YYYY-MM-DD', async () => {
        await init();
        expect(component.formatDate('2025-03-05')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('formatDate() should return empty for empty input', async () => {
        await init();
        expect(component.formatDate('')).toBe('');
    });

    it('absNum() should return absolute value', async () => {
        await init();
        expect(component.absNum(-5)).toBe(5);
        expect(component.absNum(3)).toBe(3);
    });

    it('catLabel() and catClass() should return non-empty strings', async () => {
        await init();
        expect(component.catLabel('Client')).toBeTruthy();
        expect(component.catClass('RnD')).toBeTruthy();
    });
});
