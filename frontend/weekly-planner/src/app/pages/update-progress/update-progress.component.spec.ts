import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { UpdateProgressComponent } from './update-progress.component';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

/**
 * Unit tests for UpdateProgressComponent.
 * Covers: init (loads plan + my tasks), computed totals, openModal/closeModal/saveModal,
 * allowedStatuses, formatDate, statusLabel, catLabel/catClass.
 */
describe('UpdateProgressComponent', () => {
    let fixture: ComponentFixture<UpdateProgressComponent>;
    let component: UpdateProgressComponent;
    let httpMock: HttpTestingController;
    let authService: AuthService;
    const base = environment.apiUrl;

    const alice = { id: 'u1', name: 'Alice', role: 'TeamLead' as 'TeamLead', isActive: true };
    const plan: any = { id: 'p1', status: 'Frozen', weekStartDate: '2025-03-05', weekEndDate: '2025-03-10', totalTeamHours: 30 };
    const tasks: any[] = [
        { id: 't1', backlogItemTitle: 'Build feature', category: 'Client', plannedHours: 16, completedHours: 8, status: 'InProgress' },
        { id: 't2', backlogItemTitle: 'Fix tech debt', category: 'TechDebt', plannedHours: 8, completedHours: 0, status: 'NotStarted' },
        { id: 't3', backlogItemTitle: 'Research AI', category: 'RnD', plannedHours: 6, completedHours: 6, status: 'Completed' },
    ];

    beforeEach(async () => {
        TestBed.resetTestingModule();
        vi.stubGlobal('localStorage', { getItem: () => 'dark', setItem: vi.fn() });
        vi.stubGlobal('matchMedia', () => ({ matches: false }));

        await TestBed.configureTestingModule({
            imports: [UpdateProgressComponent],
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                provideRouter([])
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(UpdateProgressComponent);
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
        httpMock.expectOne(`${base}/weeklyplan/active`).flush(plan);
        httpMock.expectOne(`${base}/weeklyplan/${plan.id}/tasks/user/${alice.id}`).flush(tasks);
        fixture.detectChanges();
    }

    // ── Creation ──────────────────────────────────────────────────────────────

    it('should create', () => {
        init();
        expect(component).toBeTruthy();
    });

    it('should load tasks on init', () => {
        init();
        expect(component.tasks()).toHaveLength(3);
        expect(component.loading()).toBe(false);
    });

    it('should handle no active plan gracefully', () => {
        authService.setCurrentUser(alice);
        fixture.detectChanges();
        httpMock.expectOne(`${base}/weeklyplan/active`).flush(null);
        expect(component.loading()).toBe(false);
        expect(component.tasks()).toHaveLength(0);
    });

    // ── Computed totals ───────────────────────────────────────────────────────

    it('totalCommitted() should sum plannedHours', () => {
        init();
        expect(component.totalCommitted()).toBe(30); // 16+8+6
    });

    it('totalCompleted() should sum completedHours', () => {
        init();
        expect(component.totalCompleted()).toBe(14); // 8+0+6
    });

    it('overallProgress() should compute correct percentage', () => {
        init();
        expect(component.overallProgress()).toBe(Math.round(14 / 30 * 100)); // 47%
    });

    // ── openModal / closeModal ────────────────────────────────────────────────

    it('openModal() should set editingTask and populate fields', () => {
        init();
        component.openModal(tasks[0]);
        expect(component.editingTask()).toEqual(tasks[0]);
        expect(component.editHours).toBe(8);
        expect(component.editStatus).toBe('InProgress');
    });

    it('closeModal() should clear editingTask', () => {
        init();
        component.openModal(tasks[0]);
        component.closeModal();
        expect(component.editingTask()).toBeNull();
    });

    // ── saveModal() ───────────────────────────────────────────────────────────

    it('saveModal() should PUT /weeklyplan/:id/update-progress and update local task', () => {
        init();
        component.openModal(tasks[0]);
        component.editHours = 12;
        component.editStatus = 'Completed';

        component.saveModal();

        const req = httpMock.expectOne(`${base}/weeklyplan/${plan.id}/update-progress`);
        expect(req.request.method).toBe('PUT');
        expect(req.request.body.completedHours).toBe(12);
        expect(req.request.body.status).toBe('Completed');
        req.flush(null);

        const updated = component.tasks().find(t => t.id === 't1');
        expect(updated?.completedHours).toBe(12);
        expect(updated?.status).toBe('Completed');
        expect(component.editingTask()).toBeNull();
    });

    it('saveModal() should reject negative hours', () => {
        init();
        component.openModal(tasks[0]);
        component.editHours = -1;
        component.saveModal();
        httpMock.expectNone(`${base}/weeklyplan/${plan.id}/update-progress`);
    });

    it('saveModal() should do nothing if no editingTask', () => {
        init();
        component.saveModal();
        httpMock.expectNone(`${base}/weeklyplan/${plan.id}/update-progress`);
    });

    // ── allowedStatuses() ────────────────────────────────────────────────────

    it('allowedStatuses() for NotStarted should include InProgress', () => {
        init();
        expect(component.allowedStatuses('NotStarted')).toContain('InProgress');
    });

    it('allowedStatuses() for Completed should include InProgress (go back)', () => {
        init();
        expect(component.allowedStatuses('Completed')).toContain('InProgress');
        expect(component.allowedStatuses('Completed')).not.toContain('NotStarted');
    });

    it('allowedStatuses() for Blocked should include InProgress', () => {
        init();
        expect(component.allowedStatuses('Blocked')).toContain('InProgress');
    });

    // ── Helpers ───────────────────────────────────────────────────────────────

    it('formatDate() should return YYYY-MM-DD', () => {
        init();
        expect(component.formatDate('2025-03-10')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('formatDate() should return empty string for undefined', () => {
        init();
        expect(component.formatDate(undefined)).toBe('');
    });

    it('statusLabel() should return readable labels', () => {
        init();
        expect(component.statusLabel('NotStarted')).toBe('Not Started');
        expect(component.statusLabel('InProgress')).toBe('In Progress');
        expect(component.statusLabel('Completed')).toBe('Completed');
        expect(component.statusLabel('Blocked')).toBe('Blocked');
    });

    it('catLabel() and catClass() should return non-empty strings', () => {
        init();
        expect(component.catLabel('Client')).toBeTruthy();
        expect(component.catClass('TechDebt')).toBeTruthy();
    });
});
