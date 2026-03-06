import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { PastWeeksComponent } from './past-weeks.component';
import { environment } from '../../../environments/environment';

/**
 * Unit tests for PastWeeksComponent.
 * Covers: init (loads completed plans), selectPlan (loads dashboard details),
 * clearSelection, toggleCat/toggleMember, fmtDate, catLabel/catClass, totalTasks, tasksDone, overallPct.
 */
describe('PastWeeksComponent', () => {
    let fixture: ComponentFixture<PastWeeksComponent>;
    let component: PastWeeksComponent;
    let httpMock: HttpTestingController;
    const base = environment.apiUrl;

    const plans: any[] = [
        { id: 'p1', status: 'Completed', weekStartDate: '2025-02-26', weekEndDate: '2025-03-03', clientPercent: 50, techDebtPercent: 30, rdPercent: 20, totalTeamHours: 60 },
        { id: 'p2', status: 'Planning', weekStartDate: '2025-03-05', weekEndDate: '2025-03-10', clientPercent: 50, techDebtPercent: 30, rdPercent: 20, totalTeamHours: 60 },
    ];

    const mockDashboard: any = {
        overallProgress: 75,
        totalPlannedHours: 60,
        totalCompletedHours: 45,
        categoryBreakdown: [],
        userBreakdown: [],
        tasks: [
            { id: 't1', status: 'Completed', category: 'Client' },
            { id: 't2', status: 'NotStarted', category: 'TechDebt' },
            { id: 't3', status: 'Completed', category: 'RnD' },
        ]
    };

    beforeEach(async () => {
        TestBed.resetTestingModule();
        vi.stubGlobal('localStorage', { getItem: () => 'dark', setItem: vi.fn() });
        vi.stubGlobal('matchMedia', () => ({ matches: false }));

        await TestBed.configureTestingModule({
            imports: [PastWeeksComponent],
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                provideRouter([])
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(PastWeeksComponent);
        component = fixture.componentInstance;
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
        vi.unstubAllGlobals();
    });

    function init(): void {
        fixture.detectChanges();
        httpMock.expectOne(`${base}/weeklyplan`).flush(plans);
        fixture.detectChanges();
    }

    // ── Creation ──────────────────────────────────────────────────────────────

    it('should create', () => {
        init();
        expect(component).toBeTruthy();
    });

    it('should only show Completed plans', () => {
        init();
        expect(component.completedPlans()).toHaveLength(1);
        expect(component.completedPlans()[0].status).toBe('Completed');
        expect(component.loading()).toBe(false);
    });

    // ── selectPlan() ──────────────────────────────────────────────────────────

    it('selectPlan() should set selectedPlan and load dashboard', () => {
        init();
        component.selectPlan(plans[0]);

        const req = httpMock.expectOne(`${base}/weeklyplan/${plans[0].id}/dashboard`);
        req.flush(mockDashboard);

        expect(component.selectedPlan()).toEqual(plans[0]);
        expect(component.detail()).toEqual(mockDashboard);
        expect(component.detailLoading()).toBe(false);
    });

    // ── clearSelection() ──────────────────────────────────────────────────────

    it('clearSelection() should reset selectedPlan and detail', () => {
        init();
        component.selectedPlan.set(plans[0] as any);
        component.detail.set(mockDashboard);
        component.clearSelection();
        expect(component.selectedPlan()).toBeNull();
        expect(component.detail()).toBeNull();
    });

    // ── totalTasks / tasksDone / overallPct ───────────────────────────────────

    it('totalTasks() should count all tasks', () => {
        init();
        component.detail.set(mockDashboard);
        expect(component.totalTasks()).toBe(3);
    });

    it('tasksDone() should count only Completed tasks', () => {
        init();
        component.detail.set(mockDashboard);
        expect(component.tasksDone()).toBe(2);
    });

    it('tasksBlocked() should return 0 when none are blocked', () => {
        init();
        component.detail.set(mockDashboard);
        expect(component.tasksBlocked()).toBe(0);
    });

    it('overallPct() should return dashboard overall progress', () => {
        init();
        component.detail.set(mockDashboard);
        expect(component.overallPct()).toBe(75);
    });

    it('overallPct() should return 0 when no detail', () => {
        init();
        expect(component.overallPct()).toBe(0);
    });

    // ── toggleCat / toggleMember ──────────────────────────────────────────────

    it('toggleCat() should expand then collapse', () => {
        init();
        component.toggleCat('Client');
        expect(component.expandedCat()).toBe('Client');
        component.toggleCat('Client'); // toggle off
        expect(component.expandedCat()).toBeNull();
    });

    it('toggleMember() should expand then collapse', () => {
        init();
        component.toggleMember('u1');
        expect(component.expandedMember()).toBe('u1');
        component.toggleMember('u1');
        expect(component.expandedMember()).toBeNull();
    });

    // ── fmtDate() ─────────────────────────────────────────────────────────────

    it('fmtDate() should format a date string as YYYY-MM-DD', () => {
        init();
        expect(component.fmtDate('2025-03-05')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('fmtDate() should return empty string for empty input', () => {
        init();
        expect(component.fmtDate('')).toBe('');
    });

    // ── catLabel / catClass ───────────────────────────────────────────────────

    it('catLabel() should return readable category labels', () => {
        init();
        expect(component.catLabel('Client')).toBeTruthy();
        expect(component.catLabel('TechDebt')).toBeTruthy();
        expect(component.catLabel('RnD')).toBeTruthy();
    });

    it('catClass() should return badge class strings', () => {
        init();
        expect(component.catClass('Client')).toBeTruthy();
        expect(component.catClass('TechDebt')).toBeTruthy();
    });
});
