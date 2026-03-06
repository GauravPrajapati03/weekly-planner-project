import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { WeekSetupComponent } from './week-setup.component';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

/**
 * Unit tests for WeekSetupComponent.
 * Tests: init, isTuesday(), workPeriod(), nearestTuesday(), member selection,
 * recalc(), canSubmit(), create() API call.
 */
describe('WeekSetupComponent', () => {
    let fixture: ComponentFixture<WeekSetupComponent>;
    let component: WeekSetupComponent;
    let httpMock: HttpTestingController;
    let authService: AuthService;
    let router: Router;
    const base = environment.apiUrl;

    const alice = { id: 'u1', name: 'Alice', role: 'TeamLead' as 'TeamLead', isActive: true };
    const bob = { id: 'u2', name: 'Bob', role: 'TeamMember' as 'TeamMember', isActive: true };

    beforeEach(async () => {
        TestBed.resetTestingModule();
        vi.stubGlobal('localStorage', { getItem: () => 'dark', setItem: vi.fn() });
        vi.stubGlobal('matchMedia', () => ({ matches: false }));

        await TestBed.configureTestingModule({
            imports: [WeekSetupComponent],
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                provideRouter([])
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(WeekSetupComponent);
        component = fixture.componentInstance;
        httpMock = TestBed.inject(HttpTestingController);
        authService = TestBed.inject(AuthService);
        router = TestBed.inject(Router);
    });

    afterEach(() => {
        httpMock.verify();
        vi.unstubAllGlobals();
    });

    function init(): void {
        fixture.detectChanges();
        httpMock.expectOne(`${base}/weeklyplan/active`).flush(null);
        httpMock.expectOne(`${base}/users`).flush([alice, bob]);
        fixture.detectChanges();
    }

    // ── Creation ──────────────────────────────────────────────────────────────

    it('should create', () => {
        init();
        expect(component).toBeTruthy();
    });

    it('should load active users on init', () => {
        init();
        expect(component.activeUsers()).toHaveLength(2);
        expect(component.loadingUsers()).toBe(false);
    });

    // ── isTuesday() ───────────────────────────────────────────────────────────

    it('isTuesday() should return true for a Tuesday date', () => {
        component.tuesdayDate = '2025-03-04'; // Tuesday
        expect(component.isTuesday()).toBe(true);
    });

    it('isTuesday() should return false for a Monday date', () => {
        component.tuesdayDate = '2025-03-03'; // Monday
        expect(component.isTuesday()).toBe(false);
    });

    it('isTuesday() should return false for empty string', () => {
        component.tuesdayDate = '';
        expect(component.isTuesday()).toBe(false);
    });

    // ── workPeriod() ──────────────────────────────────────────────────────────

    it('workPeriod() should return work period string for a Tuesday', () => {
        component.tuesdayDate = '2025-03-04';
        const period = component.workPeriod();
        expect(period).toContain('2025-03-05'); // Wednesday after
        expect(period).toContain('2025-03-10'); // Monday after
    });

    it('workPeriod() should return empty string for non-Tuesday', () => {
        component.tuesdayDate = '2025-03-03'; // Monday
        expect(component.workPeriod()).toBe('');
    });

    // ── nearestTuesday() ──────────────────────────────────────────────────────

    it('nearestTuesday() should return a Tuesday date string (YYYY-MM-DD)', () => {
        const date = component.nearestTuesday();
        const [y, m, d] = date.split('-').map(Number);
        expect(new Date(y, m - 1, d).getDay()).toBe(2); // 2 = Tuesday
    });

    // ── toggleMember() and isSelected() ──────────────────────────────────────

    it('toggleMember() should add a member ID when checked', () => {
        init();
        // Clear selections first
        component['_selectedIds'].set(new Set());
        const event = { target: { checked: true } } as unknown as Event;
        component.toggleMember('u1', event);
        expect(component.isSelected('u1')).toBe(true);
    });

    it('toggleMember() should remove a member ID when unchecked', () => {
        init();
        const event = { target: { checked: false } } as unknown as Event;
        component.toggleMember('u1', event);
        expect(component.isSelected('u1')).toBe(false);
    });

    // ── recalc() and total() ──────────────────────────────────────────────────

    it('recalc() should update total signal', () => {
        init();
        component.clientPct = 50;
        component.techPct = 30;
        component.rdPct = 20;
        component.recalc();
        expect(component.total()).toBe(100);
    });

    it('recalc() total should be 0 when all percents are 0', () => {
        init();
        component.clientPct = 0;
        component.techPct = 0;
        component.rdPct = 0;
        component.recalc();
        expect(component.total()).toBe(0);
    });

    // ── canSubmit() ───────────────────────────────────────────────────────────

    it('canSubmit() should be false if not Tuesday', () => {
        init();
        component.tuesdayDate = '2025-03-03'; // Monday
        component.clientPct = 50; component.techPct = 30; component.rdPct = 20;
        component.recalc();
        expect(component.canSubmit()).toBe(false);
    });

    it('canSubmit() should be false if total ≠ 100', () => {
        init();
        component.tuesdayDate = '2025-03-04';
        component.clientPct = 40; component.techPct = 30; component.rdPct = 20;
        component.recalc();
        expect(component.canSubmit()).toBe(false);
    });

    it('canSubmit() should be true when all conditions met', () => {
        init();
        component.tuesdayDate = '2025-03-04';
        component.clientPct = 50; component.techPct = 30; component.rdPct = 20;
        component.recalc();
        expect(component.canSubmit()).toBe(true);
    });

    // ── create() ─────────────────────────────────────────────────────────────

    it('create() should POST to /weeklyplan and navigate to /home', () => {
        init();
        component.tuesdayDate = '2025-03-04';
        component.clientPct = 50; component.techPct = 30; component.rdPct = 20;
        component.recalc();
        const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

        component.create();

        const req = httpMock.expectOne(`${base}/weeklyplan`);
        expect(req.request.method).toBe('POST');
        expect(req.request.body.clientPercent).toBe(50);
        req.flush({ id: 'plan-1' });

        expect(navSpy).toHaveBeenCalledWith(['/home']);
    });

    it('create() should not call API if canSubmit() is false', () => {
        init();
        component.tuesdayDate = '2025-03-03'; // not Tuesday
        component.create();
        httpMock.expectNone(`${base}/weeklyplan`);
    });
});
