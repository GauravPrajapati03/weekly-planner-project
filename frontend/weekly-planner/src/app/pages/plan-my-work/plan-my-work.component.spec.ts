import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { PlanMyWorkComponent } from './plan-my-work.component';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

/**
 * Unit tests for PlanMyWorkComponent.
 * Covers: init, claimedHours, openPickModal/closePickModal, addToMyPlan, removeTask,
 * startInlineEdit/cancelInlineEdit/saveInlineHours, markDone/undoDone,
 * formatHours, isPickedByTeam, pickValidationError, catLabel/catClass.
 */
describe('PlanMyWorkComponent', () => {
    let fixture: ComponentFixture<PlanMyWorkComponent>;
    let component: PlanMyWorkComponent;
    let httpMock: HttpTestingController;
    let authService: AuthService;
    const base = environment.apiUrl;

    const alice = { id: 'u1', name: 'Alice', role: 'TeamLead' as 'TeamLead', isActive: true };
    const plan: any = {
        id: 'p1', status: 'Planning',
        weekStartDate: '2025-03-05', weekEndDate: '2025-03-10',
        totalTeamHours: 60,
        clientPercent: 50, techDebtPercent: 30, rdPercent: 20,
        selectedMemberIds: ['u1', 'u2']
    };

    const myTasks: any[] = [
        { id: 't1', backlogItemId: 'b1', backlogItemTitle: 'Feature A', category: 'Client', plannedHours: 8, completedHours: 0, status: 'NotStarted' },
        { id: 't2', backlogItemId: 'b2', backlogItemTitle: 'Tech Debt', category: 'TechDebt', plannedHours: 6, completedHours: 0, status: 'NotStarted' },
    ];

    const backlogItems: any[] = [
        { id: 'b3', title: 'New Item', category: 'RnD', status: 'Available', isActive: true, estimatedHours: 4 },
    ];

    const dashboard: any = {
        overallProgress: 0, totalPlannedHours: 0, totalCompletedHours: 0,
        categoryBreakdown: [
            { category: 'Client', plannedHours: 8 },
            { category: 'TechDebt', plannedHours: 6 },
            { category: 'RnD', plannedHours: 0 },
        ],
        userBreakdown: [{ userId: 'u1', plannedHours: 14, tasks: myTasks }],
        tasks: myTasks
    };

    // localStorage store (tracks markDone state)
    let store: Record<string, string> = {};

    beforeEach(async () => {
        store = {};
        vi.stubGlobal('localStorage', {
            getItem: (k: string) => store[k] ?? null,
            setItem: (k: string, v: string) => { store[k] = v; },
            removeItem: (k: string) => { delete store[k]; },
        });
        vi.stubGlobal('matchMedia', () => ({ matches: false }));

        await TestBed.configureTestingModule({
            imports: [PlanMyWorkComponent],
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                provideRouter([])
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(PlanMyWorkComponent);
        component = fixture.componentInstance;
        httpMock = TestBed.inject(HttpTestingController);
        authService = TestBed.inject(AuthService);
    });

    afterEach(() => {
        httpMock.verify();
        vi.unstubAllGlobals();
    });

    function init(): void {
        authService.setCurrentUser(alice);
        fixture.detectChanges();
        // ngOnInit triggers: getActivePlan, then getTasksByUser + getDashboard + getBacklog
        httpMock.expectOne(`${base}/weeklyplan/active`).flush(plan);
        httpMock.expectOne(`${base}/weeklyplan/${plan.id}/tasks/user/${alice.id}`).flush(myTasks);
        httpMock.expectOne(`${base}/weeklyplan/${plan.id}/dashboard`).flush(dashboard);
        httpMock.expectOne(`${base}/backlog`).flush(backlogItems);
        fixture.detectChanges();
    }

    // ── Creation ──────────────────────────────────────────────────────────────

    it('should create', () => {
        init();
        expect(component).toBeTruthy();
    });

    it('should load plan, tasks, backlog and dashboard on init', () => {
        init();
        expect(component.activePlan()?.id).toBe('p1');
        expect(component.myTasks()).toHaveLength(2);
        expect(component.backlogItems()).toHaveLength(1);
    });

    // ── claimedHours() ────────────────────────────────────────────────────────

    it('claimedHours() should sum plannedHours of myTasks', () => {
        init();
        expect(component.claimedHours()).toBe(14); // 8 + 6
    });

    // ── openPickModal / closePickModal ────────────────────────────────────────

    it('openPickModal() should set pickingItem and pre-fill hours from estimatedHours', () => {
        init();
        component.openPickModal(backlogItems[0]);
        expect(component.pickingItem()).toEqual(backlogItems[0]);
        expect(component.pickHours).toBe(4); // estimatedHours from item
    });

    it('closePickModal() should clear pickingItem and reset hours', () => {
        init();
        component.openPickModal(backlogItems[0]);
        component.closePickModal();
        expect(component.pickingItem()).toBeNull();
        expect(component.pickHours).toBe(0);
    });

    // ── addToMyPlan() ─────────────────────────────────────────────────────────

    it('addToMyPlan() should POST /assign-task and add to myTasks', () => {
        init();
        component.openPickModal(backlogItems[0]);
        component.pickHours = 4;
        component.addToMyPlan();

        const req = httpMock.expectOne(`${base}/weeklyplan/${plan.id}/assign-task`);
        expect(req.request.method).toBe('POST');
        expect(req.request.body.backlogItemId).toBe('b3');
        expect(req.request.body.plannedHours).toBe(4);
        const newTask: any = { id: 't3', backlogItemId: 'b3', backlogItemTitle: 'New Item', category: 'RnD', plannedHours: 4, completedHours: 0, status: 'NotStarted' };
        req.flush(newTask);

        // Dashboard reload after adding
        httpMock.expectOne(`${base}/weeklyplan/${plan.id}/dashboard`).flush(dashboard);

        expect(component.myTasks()).toHaveLength(3);
        expect(component.view()).toBe('plan');
    });

    // ── removeTask() ──────────────────────────────────────────────────────────

    it('removeTask() should DELETE /weeklyplan/:id/tasks/:taskId and remove from myTasks', () => {
        init();
        component.removeTask(myTasks[0]);

        const req = httpMock.expectOne(`${base}/weeklyplan/${plan.id}/tasks/${myTasks[0].id}`);
        expect(req.request.method).toBe('DELETE');
        req.flush(null);

        // Dashboard reload after removal
        httpMock.expectOne(`${base}/weeklyplan/${plan.id}/dashboard`).flush(dashboard);

        expect(component.myTasks()).toHaveLength(1);
        expect(component.myTasks()[0].id).toBe('t2');
    });

    // ── startInlineEdit / cancelInlineEdit ────────────────────────────────────

    it('startInlineEdit() should set editingTaskId and inlineHoursVal', () => {
        init();
        component.startInlineEdit(myTasks[0]);
        expect(component.editingTaskId()).toBe('t1');
        expect(component.inlineHoursVal).toBe(8);
    });

    it('cancelInlineEdit() should clear editingTaskId and error', () => {
        init();
        component.startInlineEdit(myTasks[0]);
        component.cancelInlineEdit();
        expect(component.editingTaskId()).toBeNull();
        expect(component.inlineEditError()).toBe('');
    });

    // ── markDone / undoDone ───────────────────────────────────────────────────

    it('markDone() should set donePlanning to true and write to localStorage', () => {
        init();
        component.markDone();
        expect(component.donePlanning()).toBe(true);
        const planId = component.activePlan()!.id;
        expect(store[`plan-submit-${planId}-${alice.id}`]).toBe('true');
    });

    it('undoDone() should set donePlanning to false and remove from localStorage', () => {
        init();
        component.markDone();
        component.undoDone();
        expect(component.donePlanning()).toBe(false);
        const planId = component.activePlan()!.id;
        expect(store[`plan-submit-${planId}-${alice.id}`]).toBeUndefined();
    });

    // ── formatHours() ────────────────────────────────────────────────────────

    it('formatHours() should format integers without decimal', () => {
        init();
        expect(component.formatHours(15)).toBe('15');
        expect(component.formatHours(0)).toBe('0');
    });

    it('formatHours() should format decimals with one place', () => {
        init();
        expect(component.formatHours(7.5)).toBe('7.5');
    });

    it('formatHours() should return "0" for null/undefined', () => {
        init();
        expect(component.formatHours(null)).toBe('0');
        expect(component.formatHours(undefined)).toBe('0');
    });

    // ── isPickedByTeam() ──────────────────────────────────────────────────────

    it('isPickedByTeam() should return true for items already in teamDashboard tasks', () => {
        init();
        expect(component.isPickedByTeam('b1')).toBe(true);
    });

    it('isPickedByTeam() should return false for unknown backlog item', () => {
        init();
        expect(component.isPickedByTeam('b999')).toBe(false);
    });

    // ── pickValidationError() ─────────────────────────────────────────────────

    it('pickValidationError() should return empty string if hours are within limit', () => {
        init();
        component.pickHours = 5; // well within 30-14=16 remaining
        expect(component.pickValidationError()).toBe('');
    });

    it('pickValidationError() should return error if hours exceed remaining', () => {
        init();
        component.pickHours = 20; // exceeds 30-14=16 remaining
        expect(component.pickValidationError()).toContain('exceed');
    });

    it('pickValidationError() should return empty if hours is 0', () => {
        init();
        component.pickHours = 0;
        expect(component.pickValidationError()).toBe('');
    });

    // ── catLabel / catClass ───────────────────────────────────────────────────

    it('catLabel() and catClass() should return non-empty strings', () => {
        init();
        expect(component.catLabel('Client')).toBeTruthy();
        expect(component.catClass('TechDebt')).toBeTruthy();
    });
});
