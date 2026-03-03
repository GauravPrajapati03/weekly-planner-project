import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { BacklogItem, WeeklyPlan, WeeklyPlanTask, CATEGORY_LABELS, CATEGORY_BADGE_CLASS, CategoryType } from '../../core/models/models';
import { NavbarComponent } from '../../shared/navbar/navbar.component';

@Component({
    selector: 'app-plan-my-work',
    standalone: true,
    imports: [CommonModule, FormsModule, NavbarComponent],
    template: `
    <app-navbar />
    <div class="page">
      <div class="container">
        <h2 class="mb-md">✍️ Plan My Work</h2>

        @if (!activePlan()) {
          <div class="alert alert--warning">No active planning week. Ask your Team Lead to start one.</div>
        } @else if (activePlan()!.status !== 'Planning') {
          <div class="alert alert--warning">The plan is {{ activePlan()?.status }} — no more changes allowed.</div>
        } @else {

          <!-- Budget bar -->
          <div class="budget-card card mb-lg">
            <div class="flex items-center justify-between mb-md">
              <h4 style="margin:0;">My Weekly Budget</h4>
              <span class="badge {{ claimedHours() >= 30 ? 'badge--success' : 'badge--warning' }}">
                {{ 30 - claimedHours() > 0 ? (30 - claimedHours()) + 'h left' : '✅ Full' }}
              </span>
            </div>
            <div class="progress-bar-wrap" style="height: 12px; margin-bottom: var(--space-sm);">
              <div class="progress-bar-fill"
                [style.width.%]="Math.min(claimedHours() / 30 * 100, 100)"></div>
            </div>
            <div class="flex justify-between text-sm text-secondary">
              <span>Claimed: <strong style="color:var(--text-primary)">{{ claimedHours() }}h</strong></span>
              <span>Budget: <strong style="color:var(--text-primary)">30h</strong></span>
            </div>
          </div>

          <!-- Task list -->
          @if (myTasks().length > 0) {
            <div class="card mb-lg" style="padding:0; overflow:hidden;">
              <div class="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Task</th>
                      <th>Category</th>
                      <th style="text-align:right;">Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (task of myTasks(); track task.id) {
                      <tr>
                        <td><strong>{{ task.backlogItemTitle }}</strong></td>
                        <td><span class="badge {{ catClass(task.category) }}">{{ catLabel(task.category) }}</span></td>
                        <td style="text-align:right; font-weight:600;">{{ task.plannedHours }}h</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }

          <!-- Pick from backlog button -->
          @if (claimedHours() < 30) {
            <button class="btn btn--primary" (click)="openBacklogModal()">+ Pick from Backlog</button>
          }
        }
      </div>
    </div>

    <!-- Backlog Modal -->
    @if (showModal()) {
      <div class="modal-overlay" (click)="showModal.set(false)">
        <div class="modal-box" (click)="$event.stopPropagation()" style="max-width:680px;">
          <div class="modal-header">
            <h3>Pick a Backlog Item</h3>
            <button class="btn btn--ghost btn--sm" (click)="showModal.set(false)">✕</button>
          </div>
          <p class="text-secondary text-sm mb-md">Remaining budget: <strong>{{ 30 - claimedHours() }}h</strong></p>

          <div class="backlog-list">
            @for (item of backlogItems(); track item.id) {
              <div class="backlog-row" [class.backlog-row--selected]="selectedItem()?.id === item.id"
                (click)="selectedItem.set(item)">
                <div class="flex items-center gap-md">
                  <span class="badge {{ catClass(item.category) }}">{{ catLabel(item.category) }}</span>
                  <strong>{{ item.title }}</strong>
                </div>
                @if (item.description) {
                  <p class="text-secondary text-sm mt-md" style="margin:0.3rem 0 0;">{{ item.description }}</p>
                }
              </div>
            }
          </div>

          @if (selectedItem()) {
            <div class="mt-lg">
              <div class="form-group">
                <label class="form-label">Hours to commit (max {{ 30 - claimedHours() }}h)</label>
                <input type="number" class="form-control" [(ngModel)]="selectedHours"
                  min="0.5" [max]="30 - claimedHours()" step="0.5" />
              </div>
              <button class="btn btn--primary" [disabled]="!selectedHours || selectedHours <= 0 || saving()"
                (click)="addTask()">
                @if (saving()) { <span class="spinner"></span> Adding... } @else { Add to My Plan }
              </button>
            </div>
          }
        </div>
      </div>
    }
  `,
    styles: [`
    .backlog-list { display: flex; flex-direction: column; gap: var(--space-sm); max-height: 350px; overflow-y: auto; }

    .backlog-row {
      padding: var(--space-md);
      background: var(--bg-input);
      border: 2px solid var(--border);
      border-radius: var(--border-radius);
      cursor: pointer;
      transition: all 0.2s;
      &:hover { border-color: var(--accent); }
    }

    .backlog-row--selected { border-color: var(--accent); background: rgba(79,142,247,0.08); }
  `]
})
export class PlanMyWorkComponent implements OnInit {
    readonly auth = inject(AuthService);
    private readonly api = inject(ApiService);
    private readonly toast = inject(ToastService);

    readonly Math = Math;
    readonly activePlan = signal<WeeklyPlan | null>(null);
    readonly myTasks = signal<WeeklyPlanTask[]>([]);
    readonly backlogItems = signal<BacklogItem[]>([]);
    readonly showModal = signal(false);
    readonly selectedItem = signal<BacklogItem | null>(null);
    readonly saving = signal(false);

    selectedHours = 0;

    ngOnInit(): void {
        this.api.getActivePlan().subscribe({
            next: (plan) => {
                this.activePlan.set(plan);
                if (plan) this.loadMyTasks(plan.id);
            },
            error: () => this.toast.error('Failed to load active plan.')
        });
    }

    loadMyTasks(planId: number): void {
        const userId = this.auth.currentUser()!.id;
        this.api.getTasksByUser(planId, userId).subscribe({
            next: (tasks) => this.myTasks.set(tasks)
        });
    }

    openBacklogModal(): void {
        this.api.getBacklog().subscribe({
            next: (items) => {
                this.backlogItems.set(items.filter(i => i.isActive));
                this.selectedItem.set(null);
                this.selectedHours = 0;
                this.showModal.set(true);
            }
        });
    }

    claimedHours(): number { return this.myTasks().reduce((s, t) => s + t.plannedHours, 0); }

    addTask(): void {
        const plan = this.activePlan()!;
        const item = this.selectedItem()!;
        this.saving.set(true);
        this.api.assignTask(plan.id, {
            backlogItemId: item.id,
            assignedUserId: this.auth.currentUser()!.id,
            plannedHours: this.selectedHours
        }).subscribe({
            next: (task) => {
                this.myTasks.update(t => [...t, task]);
                this.showModal.set(false);
                this.saving.set(false);
                this.toast.success(`"${item.title}" added — ${this.selectedHours}h committed!`);
            },
            error: (err) => {
                this.toast.error(err.error?.detail ?? 'Failed to assign task.');
                this.saving.set(false);
            }
        });
    }

    catLabel(cat: CategoryType): string { return CATEGORY_LABELS[cat] ?? cat; }
    catClass(cat: CategoryType): string { return CATEGORY_BADGE_CLASS[cat] ?? ''; }
}
