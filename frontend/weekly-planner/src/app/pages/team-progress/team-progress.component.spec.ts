import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TeamProgressComponent } from './team-progress.component';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

/**
 * Unit tests for TeamProgressComponent.
 * Covers: init (loads plan + dashboard), totalTasks/tasksDone/tasksBlocked,
 * toggleCatDetail/toggleMemberDetail, completeWeek, formatDate, catLabel/catClass.
 */
describe('TeamProgressComponent', () => {
    let fixture: ComponentFixture<TeamProgressComponent>;
    let component: TeamProgressComponent;
    let httpMock: HttpTestingController;
    let authService: AuthService;
    let router: Router;
    const base = environment.apiUrl;

    const plan: any = { id: 'p1', status: 'Frozen', weekStartDate: '2025-03-05', weekEndDate: '2025-03-10', totalTeamHours: 60, clientPercent: 50, techDebtPercent: 30, rdPercent: 20 };
    const dashboard: any = {
        overallProgress: 65,
        totalPlannedHours: 60,
        totalCompletedHours: 39,
        categoryBreakdown: [],
        userBreakdown: [],
        tasks: [
            { id: 't1', status: 'Completed', category: 'Client', backlogItemTitle: 'A', plannedHours: 8, completedHours: 8 },
            { id: 't2', status: 'InProgress', category: 'TechDebt', backlogItemTitle: 'B', plannedHours: 6, completedHours: 3 },
            { id: 't3', status: 'Blocked', category: 'RnD', backlogItemTitle: 'C', plannedHours: 4, completedHours: 0 },
        ]
    };

    beforeEach(async () => {
        TestBed.resetTestingModule();
        vi.stubGlobal('localStorage', { getItem: () => 'dark', setItem: vi.fn() });
        vi.stubGlobal('matchMedia', () => ({ matches: false }));

        await TestBed.configureTestingModule({
            imports: [TeamProgressComponent],
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                provideRouter([])
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(TeamProgressComponent);
        component = fixture.componentInstance;
        httpMock = TestBed.inject(HttpTestingController);
        authService = TestBed.inject(AuthService);
        router = TestBed.inject(Router);
    });

    afterEach(() => {
        httpMock.verify();
        vi.unstubAllGlobals();
    });

    function init(withPlan: any = plan): void {
        authService.setCurrentUser({ id: 'u1', name: 'Alice', role: 'TeamLead' as 'TeamLead', isActive: true });
        fixture.detectChanges();
        httpMock.expectOne(`${base}/weeklyplan/active`).flush(withPlan);
        if (withPlan) {
            httpMock.expectOne(`${base}/weeklyplan/${withPlan.id}/dashboard`).flush(dashboard);
        }
        fixture.detectChanges();
    }

    // ── Creation ──────────────────────────────────────────────────────────────

    it('should create', () => {
        init();
        expect(component).toBeTruthy();
    });

    it('should load plan and dashboard on init', () => {
        init();
        expect(component.plan()?.id).toBe('p1');
        expect(component.dashboard()?.overallProgress).toBe(65);
        expect(component.loading()).toBe(false);
    });

    it('should handle no active plan gracefully', () => {
        init(null);
        expect(component.plan()).toBeNull();
        expect(component.loading()).toBe(false);
    });

    // ── Computed stats ────────────────────────────────────────────────────────

    it('totalTasks() should count all tasks', () => {
        init();
        expect(component.totalTasks()).toBe(3);
    });

    it('tasksDone() should count only Completed tasks', () => {
        init();
        expect(component.tasksDone()).toBe(1);
    });

    it('tasksBlocked() should count Blocked tasks', () => {
        init();
        expect(component.tasksBlocked()).toBe(1);
    });

    it('tasksByCategory() should filter tasks by category', () => {
        init();
        expect(component.tasksByCategory('Client')).toHaveLength(1);
        expect(component.tasksByCategory('TechDebt')).toHaveLength(1);
        expect(component.tasksByCategory('RnD')).toHaveLength(1);
    });

    // ── toggleCatDetail / toggleMemberDetail ──────────────────────────────────

    it('toggleCatDetail() should expand then collapse same category', () => {
        init();
        component.toggleCatDetail('Client');
        expect(component.expandedCat()).toBe('Client');
        component.toggleCatDetail('Client');
        expect(component.expandedCat()).toBeNull();
    });

    it('toggleMemberDetail() should expand then collapse same member', () => {
        init();
        component.toggleMemberDetail('u1');
        expect(component.expandedMember()).toBe('u1');
        component.toggleMemberDetail('u1');
        expect(component.expandedMember()).toBeNull();
    });

    // ── completeWeek() ────────────────────────────────────────────────────────

    it('completeWeek() should POST /weeklyplan/:id/complete and navigate home', () => {
        init();
        const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

        component.completeWeek();

        const req = httpMock.expectOne(`${base}/weeklyplan/${plan.id}/complete`);
        expect(req.request.method).toBe('POST');
        req.flush(null);

        expect(navSpy).toHaveBeenCalledWith(['/home']);
    });

    // ── formatDate() ──────────────────────────────────────────────────────────

    it('formatDate() should return YYYY-MM-DD', () => {
        init();
        expect(component.formatDate('2025-03-05')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('formatDate() should return empty string for empty input', () => {
        init();
        expect(component.formatDate('')).toBe('');
    });

    // ── catLabel / catClass ───────────────────────────────────────────────────

    it('catLabel() and catClass() should return non-empty strings for valid categories', () => {
        init();
        expect(component.catLabel('Client')).toBeTruthy();
        expect(component.catClass('TechDebt')).toBeTruthy();
    });
});
