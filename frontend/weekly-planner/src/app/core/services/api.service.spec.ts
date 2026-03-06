import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApiService } from './api.service';
import { environment } from '../../../environments/environment';

/**
 * Unit tests for ApiService.
 * Verifies every endpoint uses the correct HTTP method, URL, and body.
 * Uses Angular's HttpTestingController to intercept requests (no real network calls).
 */
describe('ApiService', () => {
    let service: ApiService;
    let httpMock: HttpTestingController;
    const base = environment.apiUrl;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                ApiService,
                provideHttpClient(),
                provideHttpClientTesting()
            ]
        });
        service = TestBed.inject(ApiService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify(); // fails if any expected request was not flushed
    });

    // ── Users ──────────────────────────────────────────────────────────────────

    it('getUsers() → GET /users', () => {
        service.getUsers().subscribe();
        const req = httpMock.expectOne(`${base}/users`);
        expect(req.request.method).toBe('GET');
        req.flush([]);
    });

    it('getAllUsers() → GET /users/all', () => {
        service.getAllUsers().subscribe();
        const req = httpMock.expectOne(`${base}/users/all`);
        expect(req.request.method).toBe('GET');
        req.flush([]);
    });

    it('createUser() → POST /users with body', () => {
        const body = { name: 'Alice', role: 'TeamLead' };
        service.createUser(body as any).subscribe();
        const req = httpMock.expectOne(`${base}/users`);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual(body);
        req.flush({ id: '1', ...body, isActive: true });
    });

    it('updateUser() → PUT /users/:id with body', () => {
        const id = 'u1';
        const body = { name: 'Bob' };
        service.updateUser(id, body as any).subscribe();
        const req = httpMock.expectOne(`${base}/users/${id}`);
        expect(req.request.method).toBe('PUT');
        expect(req.request.body).toEqual(body);
        req.flush({});
    });

    it('deleteUser() → DELETE /users/:id', () => {
        const id = 'u1';
        service.deleteUser(id).subscribe();
        const req = httpMock.expectOne(`${base}/users/${id}`);
        expect(req.request.method).toBe('DELETE');
        req.flush(null);
    });

    // ── Backlog ────────────────────────────────────────────────────────────────

    it('getBacklog() without filter → GET /backlog', () => {
        service.getBacklog().subscribe();
        const req = httpMock.expectOne(`${base}/backlog`);
        expect(req.request.method).toBe('GET');
        req.flush([]);
    });

    it('getBacklog() with category → GET /backlog?category=Client', () => {
        service.getBacklog('Client').subscribe();
        const req = httpMock.expectOne(r =>
            r.url === `${base}/backlog` && r.params.get('category') === 'Client');
        expect(req.request.method).toBe('GET');
        req.flush([]);
    });

    it('getAllBacklog() → GET /backlog/all', () => {
        service.getAllBacklog().subscribe();
        const req = httpMock.expectOne(`${base}/backlog/all`);
        expect(req.request.method).toBe('GET');
        req.flush([]);
    });

    it('createBacklogItem() → POST /backlog with body', () => {
        const body = { title: 'Fix bug', description: '', category: 'Client', estimatedHours: 4 };
        service.createBacklogItem(body as any).subscribe();
        const req = httpMock.expectOne(`${base}/backlog`);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual(body);
        req.flush({});
    });

    it('updateBacklogItem() → PUT /backlog/:id', () => {
        const id = 'b1';
        service.updateBacklogItem(id, { title: 'Renamed' } as any).subscribe();
        const req = httpMock.expectOne(`${base}/backlog/${id}`);
        expect(req.request.method).toBe('PUT');
        req.flush({});
    });

    it('deleteBacklogItem() → DELETE /backlog/:id', () => {
        const id = 'b1';
        service.deleteBacklogItem(id).subscribe();
        const req = httpMock.expectOne(`${base}/backlog/${id}`);
        expect(req.request.method).toBe('DELETE');
        req.flush(null);
    });

    it('hardDeleteBacklogItem() → DELETE /backlog/:id/permanent', () => {
        const id = 'b1';
        service.hardDeleteBacklogItem(id).subscribe();
        const req = httpMock.expectOne(`${base}/backlog/${id}/permanent`);
        expect(req.request.method).toBe('DELETE');
        req.flush(null);
    });

    // ── Weekly Plan ────────────────────────────────────────────────────────────

    it('getPlans() → GET /weeklyplan', () => {
        service.getPlans().subscribe();
        const req = httpMock.expectOne(`${base}/weeklyplan`);
        expect(req.request.method).toBe('GET');
        req.flush([]);
    });

    it('getActivePlan() → GET /weeklyplan/active', () => {
        service.getActivePlan().subscribe();
        const req = httpMock.expectOne(`${base}/weeklyplan/active`);
        expect(req.request.method).toBe('GET');
        req.flush(null);
    });

    it('createPlan() → POST /weeklyplan', () => {
        const body = { weekStartDate: '2025-01-06', clientPercent: 50, techDebtPercent: 30, rdPercent: 20, totalTeamHours: 30 };
        service.createPlan(body as any).subscribe();
        const req = httpMock.expectOne(`${base}/weeklyplan`);
        expect(req.request.method).toBe('POST');
        req.flush({});
    });

    it('assignTask() → POST /weeklyplan/:id/assign-task', () => {
        const id = 'p1';
        const body = { backlogItemId: 'b1', assignedUserId: 'u1', plannedHours: 8 };
        service.assignTask(id, body as any).subscribe();
        const req = httpMock.expectOne(`${base}/weeklyplan/${id}/assign-task`);
        expect(req.request.method).toBe('POST');
        req.flush({});
    });

    it('removeTask() → DELETE /weeklyplan/:planId/tasks/:taskId', () => {
        const planId = 'p1';
        const taskId = 't1';
        service.removeTask(planId, taskId).subscribe();
        const req = httpMock.expectOne(`${base}/weeklyplan/${planId}/tasks/${taskId}`);
        expect(req.request.method).toBe('DELETE');
        req.flush(null);
    });

    it('freezePlan() → POST /weeklyplan/:id/freeze', () => {
        const id = 'p1';
        service.freezePlan(id).subscribe();
        const req = httpMock.expectOne(`${base}/weeklyplan/${id}/freeze`);
        expect(req.request.method).toBe('POST');
        req.flush(null);
    });

    it('updateProgress() → PUT /weeklyplan/:id/update-progress', () => {
        const id = 'p1';
        const body = { taskId: 't1', completedHours: 4 };
        service.updateProgress(id, body as any).subscribe();
        const req = httpMock.expectOne(`${base}/weeklyplan/${id}/update-progress`);
        expect(req.request.method).toBe('PUT');
        req.flush(null);
    });

    it('completePlan() → POST /weeklyplan/:id/complete', () => {
        const id = 'p1';
        service.completePlan(id).subscribe();
        const req = httpMock.expectOne(`${base}/weeklyplan/${id}/complete`);
        expect(req.request.method).toBe('POST');
        req.flush(null);
    });

    it('cancelPlan() → DELETE /weeklyplan/:id/cancel', () => {
        const id = 'p1';
        service.cancelPlan(id).subscribe();
        const req = httpMock.expectOne(`${base}/weeklyplan/${id}/cancel`);
        expect(req.request.method).toBe('DELETE');
        req.flush(null);
    });

    // ── Dashboard ──────────────────────────────────────────────────────────────

    it('getDashboard() → GET /weeklyplan/:id/dashboard', () => {
        const id = 'p1';
        service.getDashboard(id).subscribe();
        const req = httpMock.expectOne(`${base}/weeklyplan/${id}/dashboard`);
        expect(req.request.method).toBe('GET');
        req.flush({});
    });

    it('getTasksByUser() → GET /weeklyplan/:planId/tasks/user/:userId', () => {
        const planId = 'p1';
        const userId = 'u1';
        service.getTasksByUser(planId, userId).subscribe();
        const req = httpMock.expectOne(`${base}/weeklyplan/${planId}/tasks/user/${userId}`);
        expect(req.request.method).toBe('GET');
        req.flush([]);
    });

    // ── Admin ──────────────────────────────────────────────────────────────────

    it('exportData() → GET /admin/export', () => {
        service.exportData().subscribe();
        const req = httpMock.expectOne(`${base}/admin/export`);
        expect(req.request.method).toBe('GET');
        req.flush({});
    });

    it('importData() → POST /admin/import with body', () => {
        const data = { users: [], backlogItems: [] };
        service.importData(data).subscribe();
        const req = httpMock.expectOne(`${base}/admin/import`);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual(data);
        req.flush({ message: 'ok' });
    });

    it('seedSampleData() → POST /admin/seed', () => {
        service.seedSampleData().subscribe();
        const req = httpMock.expectOne(`${base}/admin/seed`);
        expect(req.request.method).toBe('POST');
        req.flush({ message: 'seeded' });
    });

    it('resetApp() → DELETE /admin/reset', () => {
        service.resetApp().subscribe();
        const req = httpMock.expectOne(`${base}/admin/reset`);
        expect(req.request.method).toBe('DELETE');
        req.flush({ message: 'reset' });
    });
});
