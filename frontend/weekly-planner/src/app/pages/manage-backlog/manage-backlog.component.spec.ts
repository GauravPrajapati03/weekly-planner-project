import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ManageBacklogComponent } from './manage-backlog.component';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

/**
 * Unit tests for ManageBacklogComponent.
 * Covers: init load, filters (category, availability, search), CRUD form, archive/unarchive, delete.
 */
describe('ManageBacklogComponent', () => {
    let fixture: ComponentFixture<ManageBacklogComponent>;
    let component: ManageBacklogComponent;
    let httpMock: HttpTestingController;
    let authService: AuthService;
    const base = environment.apiUrl;

    const mockItems = [
        { id: 'b1', title: 'Fix login bug', category: 'Client', status: 'Available', isActive: true, estimatedHours: 4 },
        { id: 'b2', title: 'Refactor auth', category: 'TechDebt', status: 'Available', isActive: true, estimatedHours: 8 },
        { id: 'b3', title: 'AI research', category: 'RnD', status: 'Archived', isActive: false, estimatedHours: null },
        { id: 'b4', title: 'Bug investigation', category: 'Client', status: 'InProgress', isActive: true, estimatedHours: 2 },
    ];

    beforeEach(async () => {
        vi.stubGlobal('localStorage', { getItem: () => 'dark', setItem: vi.fn() });
        vi.stubGlobal('matchMedia', () => ({ matches: false }));

        await TestBed.configureTestingModule({
            imports: [ManageBacklogComponent],
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                provideRouter([])
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(ManageBacklogComponent);
        component = fixture.componentInstance;
        httpMock = TestBed.inject(HttpTestingController);
        authService = TestBed.inject(AuthService);
    });

    afterEach(() => {
        httpMock.verify();
        vi.unstubAllGlobals();
    });

    function init(items = mockItems): void {
        fixture.detectChanges();
        httpMock.expectOne(`${base}/backlog/all`).flush(items);
        fixture.detectChanges();
    }

    // ── Creation & load ───────────────────────────────────────────────────────

    it('should create', () => {
        init();
        expect(component).toBeTruthy();
    });

    it('should load all backlog items on init', () => {
        init();
        expect(component.allItems()).toHaveLength(4);
        expect(component.loading()).toBe(false);
    });

    // ── applyFilters() ────────────────────────────────────────────────────────

    it('should filter by category', () => {
        init();
        component.filterCategory = 'Client';
        component.applyFilters();
        expect(component.filtered().every(i => i.category === 'Client')).toBe(true);
    });

    it('should filter by availability: available only', () => {
        init();
        component.filterAvailability = 'available';
        component.applyFilters();
        expect(component.filtered().every(i => i.status === 'Available')).toBe(true);
    });

    it('should filter by availability: in progress', () => {
        init();
        component.filterAvailability = 'inprogress';
        component.applyFilters();
        expect(component.filtered().every(i => i.status === 'InProgress')).toBe(true);
    });

    it('should filter by availability: archived', () => {
        init();
        component.filterAvailability = 'archived';
        component.applyFilters();
        expect(component.filtered().every(i => i.status === 'Archived')).toBe(true);
    });

    it('should filter by search text (case-insensitive)', () => {
        init();
        component.searchText = 'login';
        component.applyFilters();
        expect(component.filtered()).toHaveLength(1);
        expect(component.filtered()[0].title).toBe('Fix login bug');
    });

    it('should show all items when no filters are set', () => {
        init();
        expect(component.filtered()).toHaveLength(4);
    });

    // ── setCategory() ─────────────────────────────────────────────────────────

    it('setCategory() should toggle: selecting same category clears it', () => {
        init();
        component.filterCategory = 'Client';
        component.setCategory('Client'); // same — toggle off
        expect(component.filterCategory).toBe('');
    });

    it('setCategory() should set a new category', () => {
        init();
        component.filterCategory = '';
        component.setCategory('TechDebt');
        expect(component.filterCategory).toBe('TechDebt');
    });

    // ── Form open/close ───────────────────────────────────────────────────────

    it('openAddForm() should reset form fields and show form', () => {
        init();
        component.editTitle = 'old';
        component.openAddForm();
        expect(component.showForm()).toBe(true);
        expect(component.editTitle).toBe('');
        expect(component.editTarget()).toBeNull();
    });

    it('openEdit() should populate form fields with item data', () => {
        init();
        component.openEdit(mockItems[0] as any);
        expect(component.showForm()).toBe(true);
        expect(component.editTitle).toBe('Fix login bug');
        expect(component.editCategory).toBe('Client');
        expect(component.editHours).toBe(4);
    });

    it('closeForm() should hide form and clear editTarget', () => {
        init();
        component.showForm.set(true);
        component.closeForm();
        expect(component.showForm()).toBe(false);
        expect(component.editTarget()).toBeNull();
    });

    // ── saveForm() — create ───────────────────────────────────────────────────

    it('saveForm() should show error if title is empty', () => {
        init();
        component.editTitle = '';
        component.saveForm();
        httpMock.expectNone(`${base}/backlog`);
    });

    it('saveForm() should create a new item when no editTarget', () => {
        init();
        component.openAddForm();
        component.editTitle = 'New Feature';
        component.editCategory = 'RnD';
        component.saveForm();

        const req = httpMock.expectOne(r => r.method === 'POST' && r.url === `${base}/backlog`);
        expect(req.request.body.title).toBe('New Feature');
        req.flush({ id: 'b5', title: 'New Feature', category: 'RnD', status: 'Available', isActive: true });

        expect(component.allItems()).toHaveLength(5);
        expect(component.showForm()).toBe(false);
    });

    // ── saveForm() — update ───────────────────────────────────────────────────

    it('saveForm() should update an existing item when editTarget is set', () => {
        init();
        component.openEdit(mockItems[0] as any);
        component.editTitle = 'Renamed';
        component.saveForm();

        const req = httpMock.expectOne(r => r.method === 'PUT' && r.url === `${base}/backlog/${mockItems[0].id}`);
        req.flush({ ...mockItems[0], title: 'Renamed' });

        const updated = component.allItems().find(i => i.id === 'b1');
        expect(updated?.title).toBe('Renamed');
    });

    // ── archiveItem() ─────────────────────────────────────────────────────────

    it('archiveItem() should call PUT /backlog/:id with status=Archived', () => {
        init();
        component.archiveItem(mockItems[0] as any);
        const req = httpMock.expectOne(r => r.method === 'PUT' && r.url === `${base}/backlog/${mockItems[0].id}`);
        expect(req.request.body.status).toBe('Archived');
        req.flush({ ...mockItems[0], status: 'Archived' });
        expect(component.busyId()).toBeNull();
    });

    // ── unarchiveItem() ───────────────────────────────────────────────────────

    it('unarchiveItem() should call PUT /backlog/:id with status=Available', () => {
        init();
        component.unarchiveItem(mockItems[2] as any);
        const req = httpMock.expectOne(r => r.method === 'PUT' && r.url === `${base}/backlog/${mockItems[2].id}`);
        expect(req.request.body.status).toBe('Available');
        req.flush({ ...mockItems[2], status: 'Available' });
    });

    // ── confirmDelete() and deleteItem() ─────────────────────────────────────

    it('confirmDelete() should set deleteTarget', () => {
        init();
        component.confirmDelete(mockItems[0] as any);
        expect(component.deleteTarget()).toEqual(mockItems[0]);
    });

    it('deleteItem() should call hardDelete and remove from local list', () => {
        init();
        component.confirmDelete(mockItems[0] as any);
        component.deleteItem();

        const req = httpMock.expectOne(`${base}/backlog/${mockItems[0].id}/permanent`);
        expect(req.request.method).toBe('DELETE');
        req.flush(null);

        expect(component.allItems().find(i => i.id === 'b1')).toBeUndefined();
        expect(component.deleteTarget()).toBeNull();
    });

    // ── Helper methods ────────────────────────────────────────────────────────

    it('catLabel() should return correct category labels', () => {
        expect(component.catLabel('Client')).toBe('CLIENT FOCUSED');
        expect(component.catLabel('TechDebt')).toBe('TECH DEBT');
        expect(component.catLabel('RnD')).toBe('R&D');
    });

    it('badgeClass() should return correct badge class names', () => {
        expect(component.badgeClass('Client')).toBe('client');
        expect(component.badgeClass('TechDebt')).toBe('techdebt');
        expect(component.badgeClass('RnD')).toBe('rnd');
    });
});
