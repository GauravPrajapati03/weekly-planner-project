import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
    User, BacklogItem, WeeklyPlan, WeeklyPlanTask, Dashboard,
    CreateUserRequest, UpdateUserRequest, CreateBacklogItemRequest, UpdateBacklogItemRequest,
    CreateWeeklyPlanRequest, AssignTaskRequest, UpdateProgressRequest, CategoryType
} from '../models/models';
import { environment } from '../../../environments/environment';

/**
 * ApiService — centralized HTTP layer for all backend API calls.
 * All methods return Observables for Angular's async pipe / subscription pattern.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
    private readonly http = inject(HttpClient);
    private readonly base = environment.apiUrl;

    // ── Users ────────────────────────────────────────────────────────────
    /** Active users only — shown on Login page */
    getUsers(): Observable<User[]> {
        return this.http.get<User[]>(`${this.base}/users`);
    }

    /** All users including inactive — used by Manage Team page */
    getAllUsers(): Observable<User[]> {
        return this.http.get<User[]>(`${this.base}/users/all`);
    }

    createUser(req: CreateUserRequest): Observable<User> {
        return this.http.post<User>(`${this.base}/users`, req);
    }

    updateUser(id: number, req: UpdateUserRequest): Observable<User> {
        return this.http.put<User>(`${this.base}/users/${id}`, req);
    }

    // ── Backlog ──────────────────────────────────────────────────────────
    /** Active backlog items only — shown in planning views */
    getBacklog(category?: CategoryType): Observable<BacklogItem[]> {
        let params = new HttpParams();
        if (category) params = params.set('category', category);
        return this.http.get<BacklogItem[]>(`${this.base}/backlog`, { params });
    }

    /** All backlog items including archived — used by Manage Backlog page */
    getAllBacklog(category?: CategoryType): Observable<BacklogItem[]> {
        let params = new HttpParams();
        if (category) params = params.set('category', category);
        return this.http.get<BacklogItem[]>(`${this.base}/backlog/all`, { params });
    }

    createBacklogItem(req: CreateBacklogItemRequest): Observable<BacklogItem> {
        return this.http.post<BacklogItem>(`${this.base}/backlog`, req);
    }

    updateBacklogItem(id: number, req: UpdateBacklogItemRequest): Observable<BacklogItem> {
        return this.http.put<BacklogItem>(`${this.base}/backlog/${id}`, req);
    }

    deleteBacklogItem(id: number): Observable<void> {
        return this.http.delete<void>(`${this.base}/backlog/${id}`);
    }

    hardDeleteBacklogItem(id: number): Observable<void> {
        return this.http.delete<void>(`${this.base}/backlog/${id}/permanent`);
    }

    // ── Weekly Plans ─────────────────────────────────────────────────────
    getPlans(): Observable<WeeklyPlan[]> {
        return this.http.get<WeeklyPlan[]>(`${this.base}/weeklyplan`);
    }

    getActivePlan(): Observable<WeeklyPlan | null> {
        return this.http.get<WeeklyPlan>(`${this.base}/weeklyplan/active`);
    }

    createPlan(req: CreateWeeklyPlanRequest): Observable<WeeklyPlan> {
        return this.http.post<WeeklyPlan>(`${this.base}/weeklyplan`, req);
    }

    assignTask(planId: number, req: AssignTaskRequest): Observable<WeeklyPlanTask> {
        return this.http.post<WeeklyPlanTask>(`${this.base}/weeklyplan/${planId}/assign-task`, req);
    }

    freezePlan(planId: number): Observable<void> {
        return this.http.post<void>(`${this.base}/weeklyplan/${planId}/freeze`, {});
    }

    updateProgress(planId: number, req: UpdateProgressRequest): Observable<void> {
        return this.http.put<void>(`${this.base}/weeklyplan/${planId}/update-progress`, req);
    }

    completePlan(planId: number): Observable<void> {
        return this.http.post<void>(`${this.base}/weeklyplan/${planId}/complete`, {});
    }

    cancelPlan(planId: number): Observable<void> {
        return this.http.delete<void>(`${this.base}/weeklyplan/${planId}/cancel`);
    }

    // ── Dashboard ────────────────────────────────────────────────────────
    getDashboard(planId: number): Observable<Dashboard> {
        return this.http.get<Dashboard>(`${this.base}/weeklyplan/${planId}/dashboard`);
    }

    getTasksByUser(planId: number, userId: number): Observable<WeeklyPlanTask[]> {
        return this.http.get<WeeklyPlanTask[]>(`${this.base}/weeklyplan/${planId}/tasks/user/${userId}`);
    }

    // ── Admin / Data Management ───────────────────────────────────────────
    exportData(): Observable<object> {
        return this.http.get<object>(`${this.base}/admin/export`);
    }

    importData(data: object): Observable<{ message: string }> {
        return this.http.post<{ message: string }>(`${this.base}/admin/import`, data);
    }

    seedSampleData(): Observable<{ message: string }> {
        return this.http.post<{ message: string }>(`${this.base}/admin/seed`, {});
    }

    resetApp(): Observable<{ message: string }> {
        return this.http.delete<{ message: string }>(`${this.base}/admin/reset`);
    }
}

