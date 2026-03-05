import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { WeeklyPlan, WeeklyPlanTask, CATEGORY_LABELS, CATEGORY_BADGE_CLASS, CategoryType, WorkItemStatus } from '../../core/models/models';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { Router } from '@angular/router';

const STATUS_LABELS: Record<WorkItemStatus, string> = {
  NotStarted: 'Not Started',
  InProgress: 'In Progress',
  Completed: 'Completed',
  Blocked: 'Blocked',
};

function getAllowedNextStatuses(current: WorkItemStatus): WorkItemStatus[] {
  switch (current) {
    case 'NotStarted': return ['NotStarted', 'InProgress', 'Blocked'];
    case 'InProgress': return ['InProgress', 'Completed', 'Blocked'];
    case 'Completed': return ['Completed', 'InProgress'];  // allow going back per demo app
    case 'Blocked': return ['Blocked', 'InProgress'];
    default: return ['NotStarted', 'InProgress', 'Completed', 'Blocked'];
  }
}

@Component({
  selector: 'app-update-progress',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent],
  template: `
    <app-navbar />
    <div class="page">
      <div class="container">
        <button class="btn btn--ghost btn--sm mb-sm" (click)="router.navigate(['/home'])">← Home</button>
        <h2 class="mb-sm">Update My Progress</h2>

        @if (loading()) {
          <div class="text-center mt-xl"><div class="spinner"></div></div>
        } @else if (tasks().length === 0) {
          <div class="alert alert--warning">No tasks assigned to you. Ask your Team Lead to freeze the plan first.</div>
        } @else {

          <!-- Subtitle: week info -->
          <p class="week-meta mb-md">
            Week of {{ formatDate(plan()?.weekEndDate) }}. Your plan: {{ totalCommitted() }} hours.
          </p>

          <!-- Overview progress bar -->
          <div class="overview-bar card mb-lg">
            <div class="overview-bar__text">
              You've completed <strong>{{ totalCompleted() }} of {{ totalCommitted() }} hours</strong>
              ({{ overallProgress() }}%)
            </div>
            <div class="progress-bar-wrap mt-md" style="height:10px;">
              <div class="progress-bar-fill" [style.width.%]="overallProgress()"></div>
            </div>
          </div>

          <!-- Task rows — one card per task -->
          <div class="task-list">
            @for (task of tasks(); track task.id) {
              <div class="task-card" [class.task-card--overrun]="task.completedHours > task.plannedHours">
                <div class="task-card__left">
                  <span class="task-title">{{ task.backlogItemTitle }}</span>
                  <span class="badge {{ catClass(task.category) }} badge--sm">{{ catLabel(task.category) }}</span>
                  <span class="status-pill status-pill--{{ task.status.toLowerCase() }}">{{ statusLabel(task.status) }}</span>
                </div>
                <div class="task-card__right">
                  <span class="task-progress-text">
                    {{ task.completedHours }} of {{ task.plannedHours }}h done
                  </span>
                  <div class="task-bar-wrap">
                    <div class="task-bar-fill"
                      [style.width.%]="task.plannedHours > 0 ? Math.min(task.completedHours / task.plannedHours * 100, 100) : 0"
                      [class.fill--overrun]="task.completedHours > task.plannedHours">
                    </div>
                  </div>
                  <button class="btn btn--primary btn--sm" (click)="openModal(task)">
                    Update This Task
                  </button>
                </div>

                <!-- Overrun warning -->
                @if (task.completedHours > task.plannedHours) {
                  <div class="overrun-banner">
                    ⚠️ You've put in more hours than planned ({{ task.completedHours }}h vs {{ task.plannedHours }}h committed). That's okay — this will be noted.
                  </div>
                }
              </div>
            }
          </div>
        }
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════ -->
    <!-- Modal: Update This Task                        -->
    <!-- ═══════════════════════════════════════════════ -->
    @if (editingTask()) {
      <div class="modal-overlay" (click)="closeModal()">
        <div class="modal-box" (click)="$event.stopPropagation()" style="max-width:500px;">
          <div class="modal-header">
            <h3>Update: {{ editingTask()!.backlogItemTitle }}</h3>
            <button class="btn btn--ghost btn--sm" (click)="closeModal()">✕</button>
          </div>

          <p class="modal-sub mb-lg">
            Committed: {{ editingTask()!.plannedHours }}h. Currently: {{ editingTask()!.completedHours }}h done.
          </p>

          <!-- Hours completed -->
          <div class="form-group mb-md">
            <label class="form-label">Hours completed</label>
            <input type="number" class="form-control"
              [(ngModel)]="editHours"
              min="0" step="0.5"
              placeholder="0" />
          </div>

          <!-- Status -->
          <div class="form-group mb-md">
            <label class="form-label">Status</label>
            <select class="form-control" [(ngModel)]="editStatus">
              @for (s of allowedStatuses(editingTask()!.status); track s) {
                <option [value]="s">{{ statusLabel(s) }}</option>
              }
            </select>
          </div>

          <!-- Note (optional) -->
          <div class="form-group mb-lg">
            <label class="form-label">Note (optional)</label>
            <textarea class="form-control" rows="3"
              [(ngModel)]="editNote"
              placeholder="Add a note about this task"></textarea>
          </div>

          <!-- Overrun warning in modal -->
          @if (editHours > editingTask()!.plannedHours) {
            <div class="overrun-banner mb-md">
              ⚠️ You've entered more hours than planned ({{ editHours }}h vs {{ editingTask()!.plannedHours }}h committed). That's okay.
            </div>
          }

          <div class="flex gap-sm">
            <button class="btn btn--primary" [disabled]="saving()" (click)="saveModal()">
              @if (saving()) { <span class="spinner"></span> } @else { Save Progress }
            </button>
            <button class="btn btn--secondary" (click)="closeModal()">Cancel</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .week-meta { color: var(--text-secondary); font-size: 0.88rem; }

    /* Overview bar */
    .overview-bar { padding: var(--space-md) var(--space-lg); }
    .overview-bar__text { font-size: 0.95rem; color: var(--text-secondary); }
    .overview-bar__text strong { color: var(--text-primary); }

    /* Task list */
    .task-list { display: flex; flex-direction: column; gap: var(--space-sm); }

    /* Task card */
    .task-card {
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: var(--border-radius-lg);
      padding: var(--space-md) var(--space-lg);
      display: flex; align-items: center; flex-wrap: wrap; gap: var(--space-md);
    }
    .task-card--overrun { border-color: rgba(234,179,8,0.4); }

    .task-card__left {
      display: flex; align-items: center; flex-wrap: wrap; gap: var(--space-sm); flex: 1; min-width: 200px;
    }
    .task-title { font-weight: 700; font-size: 0.95rem; }

    .task-card__right {
      display: flex; align-items: center; gap: var(--space-md); flex-wrap: wrap;
    }
    .task-progress-text { font-size: 0.85rem; color: var(--text-secondary); white-space: nowrap; }
    .task-bar-wrap {
      width: 120px; height: 6px; background: var(--border); border-radius: 999px; overflow: hidden;
    }
    .task-bar-fill {
      height: 100%; background: var(--accent, #3498db); border-radius: 999px; transition: width 0.3s ease;
    }
    .fill--overrun { background: #eab308 !important; }

    /* Overrun banner — spans full width inside card */
    .overrun-banner {
      width: 100%; flex-basis: 100%;
      background: rgba(234,179,8,0.12); border-left: 3px solid #eab308;
      padding: 8px 12px; font-size: 0.82rem; color: #fbbf24; border-radius: 4px;
    }

    /* Status pills */
    .status-pill {
      padding: 2px 8px; border-radius: 999px; font-size: 0.72rem; font-weight: 600; white-space: nowrap;
    }
    .status-pill--notstarted  { background: rgba(127,140,141,0.2); color: #7f8c8d; }
    .status-pill--inprogress  { background: rgba(52,152,219,0.2);  color: #3498db; }
    .status-pill--completed   { background: rgba(39,174,96,0.2);   color: #27ae60; }
    .status-pill--blocked     { background: rgba(231,76,60,0.2);   color: #e74c3c; }

    /* Badge small size */
    .badge--sm { font-size: 0.72rem; }

    /* Modal sub-text */
    .modal-sub { font-size: 0.88rem; color: var(--text-secondary); }
  `]
})
export class UpdateProgressComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  readonly router = inject(Router);
  readonly Math = Math;

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly tasks = signal<WeeklyPlanTask[]>([]);
  readonly plan = signal<WeeklyPlan | null>(null);

  /** The task currently being edited in the modal */
  readonly editingTask = signal<WeeklyPlanTask | null>(null);
  editHours = 0;
  editStatus: WorkItemStatus = 'NotStarted';
  editNote = '';

  planId = '';

  // ── Computed totals ────────────────────────────────────────────────────
  readonly totalCommitted = computed(() => this.tasks().reduce((s, t) => s + t.plannedHours, 0));
  readonly totalCompleted = computed(() => this.tasks().reduce((s, t) => s + t.completedHours, 0));
  readonly overallProgress = computed(() => {
    const c = this.totalCommitted();
    return c > 0 ? Math.round(this.totalCompleted() / c * 100) : 0;
  });

  ngOnInit(): void {
    this.api.getActivePlan().subscribe({
      next: (p) => {
        if (!p) { this.loading.set(false); return; }
        this.plan.set(p);
        this.planId = p.id;
        this.api.getTasksByUser(p.id, this.auth.currentUser()!.id).subscribe({
          next: (ts) => { this.tasks.set(ts); this.loading.set(false); },
          error: () => this.loading.set(false)
        });
      },
      error: () => this.loading.set(false)
    });
  }

  // ── Modal ──────────────────────────────────────────────────────────────

  openModal(task: WeeklyPlanTask): void {
    this.editingTask.set(task);
    this.editHours = task.completedHours;
    this.editStatus = task.status;
    this.editNote = '';
  }

  closeModal(): void {
    this.editingTask.set(null);
  }

  saveModal(): void {
    const task = this.editingTask();
    if (!task) return;
    if (this.editHours < 0) { this.toast.error('Hours cannot be negative.'); return; }

    this.saving.set(true);
    this.api.updateProgress(this.planId, {
      taskId: task.id,
      completedHours: this.editHours,
      status: this.editStatus
    }).subscribe({
      next: () => {
        // Update local task list reactively
        this.tasks.update(list => list.map(t =>
          t.id === task.id
            ? { ...t, completedHours: this.editHours, status: this.editStatus }
            : t
        ));
        this.saving.set(false);
        this.toast.success(`"${task.backlogItemTitle}" progress saved!`);
        this.closeModal();
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(err.error?.detail ?? 'Failed to save progress.');
      }
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────

  allowedStatuses(current: WorkItemStatus): WorkItemStatus[] {
    return getAllowedNextStatuses(current);
  }

  formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  statusLabel(s: WorkItemStatus): string { return STATUS_LABELS[s] ?? s; }
  catLabel(cat: CategoryType): string { return CATEGORY_LABELS[cat] ?? cat; }
  catClass(cat: CategoryType): string { return CATEGORY_BADGE_CLASS[cat] ?? ''; }
}
