import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { WeeklyPlanTask, CATEGORY_LABELS, CATEGORY_BADGE_CLASS, CategoryType, WorkItemStatus } from '../../core/models/models';
import { NavbarComponent } from '../../shared/navbar/navbar.component';

interface EditableTask extends WeeklyPlanTask {
  editedHours: number;
  editedStatus: WorkItemStatus;
}

// Human-readable status labels
const STATUS_LABELS: Record<WorkItemStatus, string> = {
  NotStarted: 'Not Started',
  InProgress: 'In Progress',
  Completed: 'Completed',
  Blocked: 'Blocked',
};

// Valid target statuses from a given current status
function getAllowedNextStatuses(current: WorkItemStatus): WorkItemStatus[] {
  switch (current) {
    case 'NotStarted': return ['NotStarted', 'InProgress', 'Blocked'];
    case 'InProgress': return ['InProgress', 'Completed', 'Blocked'];
    case 'Completed': return ['Completed']; // Terminal
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
        <div class="flex items-center gap-sm mb-md">
          <h2 style="margin:0;">✏️ Update My Progress</h2>
        </div>

        @if (loading()) {
          <div class="text-center mt-xl"><div class="spinner"></div></div>
        } @else if (tasks().length === 0) {
          <div class="alert alert--warning">No tasks assigned to you in the current plan. Ask your Team Lead to freeze the plan first.</div>
        } @else {

          <!-- ── Header Stats ─────────────────────────────────────────── -->
          <div class="stats-row mb-lg">
            <div class="stat-chip">
              <span class="stat-chip__label">Committed</span>
              <span class="stat-chip__value">{{ totalCommitted() }}h</span>
            </div>
            <div class="stat-chip">
              <span class="stat-chip__label">Overall Progress</span>
              <span class="stat-chip__value accent">{{ overallProgress() }}%</span>
            </div>
            <div class="stat-chip">
              <span class="stat-chip__label">Tasks Done</span>
              <span class="stat-chip__value success">{{ tasksDone() }}</span>
            </div>
            <div class="stat-chip">
              <span class="stat-chip__label">Blocked</span>
              <span class="stat-chip__value {{ tasksBlocked() > 0 ? 'danger' : '' }}">{{ tasksBlocked() }}</span>
            </div>
          </div>

          <!-- ── Overall progress bar ──────────────────────────────────── -->
          <div class="card mb-lg" style="padding: var(--space-md) var(--space-lg);">
            <div class="flex items-center justify-between mb-md">
              <span class="text-sm text-secondary">{{ totalCompleted() }}h completed of {{ totalCommitted() }}h committed</span>
              <span class="text-sm font-bold" style="color:var(--accent);">{{ overallProgress() }}%</span>
            </div>
            <div class="progress-bar-wrap" style="height:10px;">
              <div class="progress-bar-fill" [style.width.%]="overallProgress()"></div>
            </div>
          </div>

          <!-- ── Tasks table ────────────────────────────────────────────── -->
          <div class="card" style="padding:0; overflow:hidden;">
            <div class="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Category</th>
                    <th style="text-align:right;">Planned</th>
                    <th style="text-align:right; min-width:110px;">Hours Done</th>
                    <th style="min-width:160px;">Status</th>
                    <th style="min-width:120px;">Progress</th>
                    <th style="text-align:right;">Save</th>
                  </tr>
                </thead>
                <tbody>
                  @for (task of tasks(); track task.id; let i = $index) {
                    <tr [class.row--overrun]="task.editedHours > task.plannedHours"
                        [class.row--done]="task.editedStatus === 'Completed'">
                      <td><strong>{{ task.backlogItemTitle }}</strong></td>
                      <td><span class="badge {{ catClass(task.category) }}">{{ catLabel(task.category) }}</span></td>
                      <td style="text-align:right; white-space:nowrap;">{{ task.plannedHours }}h</td>
                      <td style="text-align:right;">
                        <input type="number" class="form-control hours-input"
                          [(ngModel)]="task.editedHours"
                          min="0" step="0.5" />
                      </td>
                      <td>
                        <select class="form-control status-select"
                          [(ngModel)]="task.editedStatus">
                          @for (s of allowedStatuses(task.status); track s) {
                            <option [value]="s">{{ statusLabel(s) }}</option>
                          }
                        </select>
                      </td>
                      <td style="min-width: 120px;">
                        <div class="progress-bar-wrap">
                          <div class="progress-bar-fill"
                            [style.width.%]="Math.min(task.plannedHours > 0 ? (task.editedHours / task.plannedHours * 100) : 0, 100)"
                            [class.fill--overrun]="task.editedHours > task.plannedHours">
                          </div>
                        </div>
                        <div class="text-sm text-secondary" style="margin-top:4px; font-size:0.75rem;">
                          {{ task.plannedHours > 0 ? (task.editedHours / task.plannedHours * 100).toFixed(0) : 0 }}%
                        </div>
                      </td>
                      <td style="text-align:right;">
                        <button class="btn btn--success btn--sm"
                          [disabled]="saving()[i]"
                          (click)="save(task, i)">
                          @if (saving()[i]) { <span class="spinner"></span> } @else { Save }
                        </button>
                      </td>
                    </tr>

                    <!-- Overrun warning row -->
                    @if (task.editedHours > task.plannedHours) {
                      <tr class="overrun-warning-row">
                        <td colspan="7">
                          <div class="overrun-banner">
                            ⚠️ You've put in more hours than you planned (<strong>{{ task.editedHours }}h</strong> vs <strong>{{ task.plannedHours }}h</strong> planned). That's okay — this will be noted.
                          </div>
                        </td>
                      </tr>
                    }
                  }
                </tbody>
              </table>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .stats-row {
      display: flex; gap: var(--space-md); flex-wrap: wrap;
    }
    .stat-chip {
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: var(--border-radius-lg);
      padding: var(--space-md) var(--space-lg);
      display: flex; flex-direction: column; gap: 4px; min-width: 130px;
    }
    .stat-chip__label { font-size: 0.73rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
    .stat-chip__value { font-size: 1.4rem; font-weight: 700; color: var(--text-primary); }
    .stat-chip__value.accent  { color: var(--accent); }
    .stat-chip__value.success { color: var(--status-success); }
    .stat-chip__value.danger  { color: var(--status-error); }

    .hours-input  { width: 72px; text-align: right; padding: 0.35rem 0.5rem; font-size: 0.85rem; }
    .status-select { width: 140px; padding: 0.35rem 0.5rem; font-size: 0.82rem; }

    .row--overrun td { background: rgba(234,179,8,0.04); }
    .row--done   td { opacity: 0.75; }

    .fill--overrun { background: var(--status-warning, #eab308) !important; }

    .overrun-warning-row td { padding: 0 !important; border-top: none !important; }
    .overrun-banner {
      background: rgba(234,179,8,0.12);
      border-left: 3px solid #eab308;
      padding: 0.5rem 1rem;
      font-size: 0.82rem;
      color: #fbbf24;
    }
  `]
})
export class UpdateProgressComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  readonly Math = Math;
  readonly loading = signal(true);
  readonly tasks = signal<EditableTask[]>([]);
  readonly saving = signal<boolean[]>([]);

  planId = '';

  // Computed stats — reactive, no refresh needed
  readonly totalCommitted = computed(() => this.tasks().reduce((s, t) => s + t.plannedHours, 0));
  readonly totalCompleted = computed(() => this.tasks().reduce((s, t) => s + t.editedHours, 0));
  readonly overallProgress = computed(() => {
    const c = this.totalCommitted();
    return c > 0 ? Math.round(this.totalCompleted() / c * 100) : 0;
  });
  readonly tasksDone = computed(() => this.tasks().filter(t => t.editedStatus === 'Completed').length);
  readonly tasksBlocked = computed(() => this.tasks().filter(t => t.editedStatus === 'Blocked').length);

  ngOnInit(): void {
    this.api.getActivePlan().subscribe({
      next: (plan) => {
        if (!plan) { this.loading.set(false); return; }
        this.planId = plan.id;
        this.api.getTasksByUser(plan.id, this.auth.currentUser()!.id).subscribe({
          next: (ts) => {
            this.tasks.set(ts.map(t => ({
              ...t,
              editedHours: t.completedHours,
              editedStatus: t.status
            })));
            this.saving.set(ts.map(() => false));
            this.loading.set(false);
          },
          error: () => this.loading.set(false)
        });
      },
      error: () => this.loading.set(false)
    });
  }

  save(task: EditableTask, index: number): void {
    if (task.editedHours < 0) {
      this.toast.error('Hours cannot be negative.');
      return;
    }

    this.saving.update(arr => { const a = [...arr]; a[index] = true; return a; });

    this.api.updateProgress(this.planId, {
      taskId: task.id,
      completedHours: task.editedHours,
      status: task.editedStatus
    }).subscribe({
      next: () => {
        // Update local state reactively — no page refresh needed
        this.tasks.update(list => list.map((t, i) =>
          i === index
            ? { ...t, completedHours: task.editedHours, status: task.editedStatus }
            : t
        ));
        this.saving.update(arr => { const a = [...arr]; a[index] = false; return a; });
        this.toast.success(`"${task.backlogItemTitle}" progress saved!`);
      },
      error: (err) => {
        this.saving.update(arr => { const a = [...arr]; a[index] = false; return a; });
        this.toast.error(err.error?.detail ?? 'Failed to save progress.');
      }
    });
  }

  allowedStatuses(current: WorkItemStatus): WorkItemStatus[] {
    return getAllowedNextStatuses(current);
  }

  statusLabel(s: WorkItemStatus): string { return STATUS_LABELS[s] ?? s; }
  catLabel(cat: CategoryType): string { return CATEGORY_LABELS[cat] ?? cat; }
  catClass(cat: CategoryType): string { return CATEGORY_BADGE_CLASS[cat] ?? ''; }
}
