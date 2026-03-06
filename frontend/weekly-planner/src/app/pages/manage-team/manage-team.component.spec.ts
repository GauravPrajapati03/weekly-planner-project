import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ManageTeamComponent } from './manage-team.component';
import { environment } from '../../../environments/environment';

/**
 * Unit tests for ManageTeamComponent.
 * Covers: init load, save (new member), startEdit/saveEdit, makeLead, toggleActive, initials().
 */
describe('ManageTeamComponent', () => {
    let fixture: ComponentFixture<ManageTeamComponent>;
    let component: ManageTeamComponent;
    let httpMock: HttpTestingController;
    const base = environment.apiUrl;

    const alice = { id: 'u1', name: 'Alice', role: 'TeamLead', isActive: true };
    const bob = { id: 'u2', name: 'Bob', role: 'TeamMember', isActive: true };

    beforeEach(async () => {
        TestBed.resetTestingModule();
        vi.stubGlobal('localStorage', { getItem: () => 'dark', setItem: vi.fn() });
        vi.stubGlobal('matchMedia', () => ({ matches: false }));

        await TestBed.configureTestingModule({
            imports: [ManageTeamComponent],
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                provideRouter([])
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(ManageTeamComponent);
        component = fixture.componentInstance;
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
        vi.unstubAllGlobals();
    });

    function init(): void {
        fixture.detectChanges();
        httpMock.expectOne(`${base}/users/all`).flush([alice, bob]);
        fixture.detectChanges();
    }

    // ── Creation ──────────────────────────────────────────────────────────────

    it('should create', () => {
        init();
        expect(component).toBeTruthy();
    });

    it('should load all users on init (including inactive)', () => {
        init();
        expect(component.allUsers()).toHaveLength(2);
        expect(component.loading()).toBe(false);
    });

    // ── save() ────────────────────────────────────────────────────────────────

    it('save() should NOT call API if newName is empty', () => {
        init();
        component.newName = '   ';
        component.save();
        httpMock.expectNone(req => req.method === 'POST');
    });

    it('save() should POST to /users with role=TeamMember', () => {
        init();
        component.newName = 'Charlie';
        component.save();

        const req = httpMock.expectOne(r => r.method === 'POST' && r.url === `${base}/users`);
        expect(req.request.body.name).toBe('Charlie');
        expect(req.request.body.role).toBe('TeamMember');
        req.flush({ id: 'u3', name: 'Charlie', role: 'TeamMember', isActive: true });

        expect(component.allUsers()).toHaveLength(3);
        expect(component.newName).toBe('');
    });

    // ── startEdit() / saveEdit() ───────────────────────────────────────────────

    it('startEdit() should set editingId and editName', () => {
        init();
        component.startEdit(alice as any);
        expect(component.editingId()).toBe('u1');
        expect(component.editName).toBe('Alice');
    });

    it('saveEdit() should PUT /users/:id with new name', () => {
        init();
        component.startEdit(alice as any);
        component.editName = 'Alice Smith';
        component.saveEdit(alice as any);

        const req = httpMock.expectOne(`${base}/users/${alice.id}`);
        expect(req.request.method).toBe('PUT');
        expect(req.request.body.name).toBe('Alice Smith');
        req.flush({ ...alice, name: 'Alice Smith' });

        expect(component.editingId()).toBeNull();
        expect(component.allUsers().find(u => u.id === 'u1')?.name).toBe('Alice Smith');
    });

    it('saveEdit() should not call API if editName is empty', () => {
        init();
        component.startEdit(alice as any);
        component.editName = '';
        component.saveEdit(alice as any);
        httpMock.expectNone(req => req.method === 'PUT');
    });

    // ── makeLead() ────────────────────────────────────────────────────────────

    it('makeLead() should PUT user with role=TeamLead then reload', () => {
        init();
        component.makeLead(bob as any);

        const req = httpMock.expectOne(`${base}/users/${bob.id}`);
        expect(req.request.body.role).toBe('TeamLead');
        req.flush({ ...bob, role: 'TeamLead' });

        // Then it reloads all users
        const req2 = httpMock.expectOne(`${base}/users/all`);
        req2.flush([
            { ...alice, role: 'TeamMember' },
            { ...bob, role: 'TeamLead' }
        ]);
        expect(component.allUsers().find(u => u.id === 'u2')?.role).toBe('TeamLead');
    });

    // ── toggleActive() ────────────────────────────────────────────────────────

    it('toggleActive() should PUT user with isActive=false to deactivate', () => {
        init();
        component.toggleActive(alice as any);

        const req = httpMock.expectOne(`${base}/users/${alice.id}`);
        expect(req.request.body.isActive).toBe(false);
        req.flush({ ...alice, isActive: false });

        expect(component.allUsers().find(u => u.id === 'u1')?.isActive).toBe(false);
    });

    it('toggleActive() should PUT user with isActive=true to reactivate', () => {
        init();
        const inactive = { ...bob, isActive: false };
        component.allUsers.set([alice as any, inactive as any]);
        component.toggleActive(inactive as any);

        const req = httpMock.expectOne(`${base}/users/${bob.id}`);
        expect(req.request.body.isActive).toBe(true);
        req.flush({ ...bob, isActive: true });
    });

    // ── initials() ────────────────────────────────────────────────────────────

    it('initials() should return up to 2 uppercase initials', () => {
        init();
        expect(component.initials('Alice Smith')).toBe('AS');
        expect(component.initials('Bob')).toBe('B');
        expect(component.initials('Charlie Dave Evan')).toBe('CD');
    });
});
