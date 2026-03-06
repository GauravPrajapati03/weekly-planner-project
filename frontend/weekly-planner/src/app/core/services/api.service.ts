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
 * All ID parameters are string (UUID/GUID format) to match backend Guid type.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
    private readonly http = inject(HttpClient);
    private readonly base = environment.apiUrl;

    // ── Users ────────────────────────────────────────────────────────────
    getUsers(): Observable<User[]> {
        return this.http.get<User[]>(`${this.base}/users`);
    }

    getAllUsers(): Observable<User[]> {
        return this.http.get<User[]>(`${this.base}/users/all`);
    }

    createUser(req: CreateUserRequest): Observable<User> {
        return this.http.post<User>(`${this.base}/users`, req);
    }

    updateUser(id: string, req: UpdateUserRequest): Observable<User> {
        return this.http.put<User>(`${this.base}/users/${id}`, req);
    }

    deleteUser(id: string): Observable<void> {
        return this.http.delete<void>(`${this.base}/users/${id}`);
    }

    // ── Backlog ──────────────────────────────────────────────────────────
    getBacklog(category?: CategoryType): Observable<BacklogItem[]> {
        let params = new HttpParams();
        if (category) params = params.set('category', category);
        return this.http.get<BacklogItem[]>(`${this.base}/backlog`, { params });
    }

    getAllBacklog(category?: CategoryType): Observable<BacklogItem[]> {
        let params = new HttpParams();
        if (category) params = params.set('category', category);
        return this.http.get<BacklogItem[]>(`${this.base}/backlog/all`, { params });
    }

    createBacklogItem(req: CreateBacklogItemRequest): Observable<BacklogItem> {
        return this.http.post<BacklogItem>(`${this.base}/backlog`, req);
    }

    updateBacklogItem(id: string, req: UpdateBacklogItemRequest): Observable<BacklogItem> {
        return this.http.put<BacklogItem>(`${this.base}/backlog/${id}`, req);
    }

    deleteBacklogItem(id: string): Observable<void> {
        return this.http.delete<void>(`${this.base}/backlog/${id}`);
    }

    hardDeleteBacklogItem(id: string): Observable<void> {
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

    assignTask(planId: string, req: AssignTaskRequest): Observable<WeeklyPlanTask> {
        return this.http.post<WeeklyPlanTask>(`${this.base}/weeklyplan/${planId}/assign-task`, req);
    }

    removeTask(planId: string, taskId: string): Observable<void> {
        return this.http.delete<void>(`${this.base}/weeklyplan/${planId}/tasks/${taskId}`);
    }

    freezePlan(planId: string): Observable<void> {
        return this.http.post<void>(`${this.base}/weeklyplan/${planId}/freeze`, {});
    }

    updateProgress(planId: string, req: UpdateProgressRequest): Observable<void> {
        return this.http.put<void>(`${this.base}/weeklyplan/${planId}/update-progress`, req);
    }

    completePlan(planId: string): Observable<void> {
        return this.http.post<void>(`${this.base}/weeklyplan/${planId}/complete`, {});
    }

    cancelPlan(planId: string): Observable<void> {
        return this.http.delete<void>(`${this.base}/weeklyplan/${planId}/cancel`);
    }

    // ── Dashboard ────────────────────────────────────────────────────────
    getDashboard(planId: string): Observable<Dashboard> {
        return this.http.get<Dashboard>(`${this.base}/weeklyplan/${planId}/dashboard`);
    }

    getTasksByUser(planId: string, userId: string): Observable<WeeklyPlanTask[]> {
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
