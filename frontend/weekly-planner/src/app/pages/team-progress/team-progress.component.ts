import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { Dashboard, WeeklyPlan, CATEGORY_LABELS, CATEGORY_BADGE_CLASS, CategoryType } from '../../core/models/models';
import { NavbarComponent } from '../../shared/navbar/navbar.component';

@Component({
  selector: 'app-team-progress',
  standalone: true,
  imports: [CommonModule, NavbarComponent],
  template: `
    <app-navbar />
    <div class="page">
      <div class="container">

        @if (loading()) {
          <div class="text-center mt-xl"><div class="spinner"></div></div>
        } @else if (!plan()) {
          <div class="alert alert--warning">No frozen or active plan available.</div>
        } @else {

          <!-- Header: title + status badge -->
          <div class="tp-header mb-lg">
            <div class="tp-header__left">
              <button class="btn btn--ghost btn--sm" (click)="router.navigate(['/home'])">← Home</button>
              <h2>Team Progress — {{ formatDate(plan()!.weekStartDate) }}</h2>
              <span class="status-badge status-badge--{{ plan()!.status.toLowerCase() }}">
                {{ plan()!.status.toUpperCase() }}
              </span>
            </div>
            @if (auth.isLead && plan()!.status === 'Frozen') {
              <button class="btn btn--success btn--sm" [disabled]="completing()" (click)="confirmComplete = true">
                @if (completing()) { <span class="spinner"></span> } @else { ✅ Finish This Week }
              </button>
            }
          </div>

          <!-- 3 stat cards matching demo app -->
          <div class="stats-row mb-lg">
            <div class="stat-card">
              <div class="stat-label">Overall Progress</div>
              <div class="stat-value">{{ dashboard()!.totalCompletedHours }}h / {{ dashboard()!.totalPlannedHours }}h</div>
              <div class="stat-sub">{{ dashboard()!.overallProgress }}%</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Tasks Done</div>
              <div class="stat-value">{{ tasksDone() }} / {{ totalTasks() }}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Blocked</div>
              <div class="stat-value">{{ tasksBlocked() }}</div>
            </div>
          </div>

          <!-- All-done success banner -->
          @if (totalTasks() > 0 && tasksDone() === totalTasks()) {
            <div class="all-done-banner mb-lg">
              🎉 <strong>Great work!</strong> All tasks are done this week!
            </div>
          } @else if (dashboard()!.totalCompletedHours === 0) {
            <div class="info-box mb-lg">No one has reported progress yet.</div>
          }

          <!-- ── By Category ──────────────────────────────────────── -->
          <h3 class="section-title mb-md">By Category</h3>
          <div class="cat-list mb-lg">
            @for (cat of dashboard()!.categoryBreakdown; track cat.category) {
              <div class="cat-row" (click)="toggleCatDetail(cat.category)" style="cursor:pointer;">
                <span class="badge {{ catClass(cat.category) }}">{{ catLabel(cat.category) }}</span>
                <span class="cat-stat">Budget: <strong>{{ cat.plannedHours }}h</strong></span>
                <span class="cat-stat">Done: <strong>{{ cat.completedHours }}h ({{ cat.progressPercent }}%)</strong></span>
                <div class="cat-bar-wrap">
                  <div class="cat-bar-fill {{ catClass(cat.category) }}"
                    [style.width.%]="cat.plannedHours > 0 ? cat.progressPercent : 0">
                  </div>
                </div>
                <button class="btn btn--ghost btn--xs" (click)="$event.stopPropagation(); toggleCatDetail(cat.category)">
                  {{ expandedCat() === cat.category ? 'Hide ▴' : 'See Details ▾' }}
                </button>
              </div>

              <!-- Expandable task detail per category -->
              @if (expandedCat() === cat.category) {
                <div class="cat-detail">
                  @if (tasksByCategory(cat.category).length === 0) {
                    <p class="text-secondary text-sm">No tasks in this category yet.</p>
                  } @else {
                    <table class="detail-table">
                      <thead>
                        <tr><th>Item</th><th>Assigned To</th><th>Hours</th><th>Status</th></tr>
                      </thead>
                      <tbody>
                        @for (task of tasksByCategory(cat.category); track task.id) {
                          <tr>
                            <td>{{ task.backlogItemTitle }}</td>
                            <td>{{ task.assignedUserName }}</td>
                            <td>{{ task.completedHours }}h / {{ task.plannedHours }}h</td>
                            <td><span class="status-pill status-pill--{{ task.status.toLowerCase() }}">{{ task.status }}</span></td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  }
                </div>
              }
            }
          </div>

          <!-- ── By Member ────────────────────────────────────────── -->
          <h3 class="section-title mb-md">By Member</h3>
          <div class="member-list mb-lg">
            @for (u of dashboard()!.userBreakdown; track u.userId) {
              <div class="member-row" (click)="toggleMemberDetail(u.userId)" style="cursor:pointer;">
                <span class="member-name">{{ u.userName }}</span>
                <span class="member-hours">{{ u.completedHours }}h / {{ u.plannedHours }}h ({{ u.progressPercent }}%)</span>
                <div class="member-bar-wrap">
                  <div class="member-bar-fill" [style.width.%]="u.progressPercent"></div>
                </div>
                <span class="member-status-badge" [class.badge--working]="u.progressPercent > 0 && u.progressPercent < 100"
                  [class.badge--done]="u.progressPercent >= 100"
                  [class.badge--waiting]="u.progressPercent === 0">
                  {{ u.progressPercent >= 100 ? 'Done' : u.progressPercent > 0 ? 'Working' : 'Not Yet' }}
                </span>
                <button class="btn btn--ghost btn--xs" (click)="$event.stopPropagation(); toggleMemberDetail(u.userId)">
                  {{ expandedMember() === u.userId ? 'Hide ▴' : 'See Plan ▾' }}
                </button>
              </div>

              <!-- Member task detail -->
              @if (expandedMember() === u.userId) {
                <div class="member-detail">
                  @if (u.tasks.length === 0) {
                    <p class="text-secondary text-sm">No tasks assigned.</p>
                  } @else {
                    <table class="detail-table">
                      <thead>
                        <tr><th>Task</th><th>Category</th><th>Committed</th><th>Done</th><th>Status</th></tr>
                      </thead>
                      <tbody>
                        @for (t of u.tasks; track t.id) {
                          <tr>
                            <td>{{ t.backlogItemTitle }}</td>
                            <td><span class="badge {{ catClass(t.category) }}" style="font-size:0.72rem;">{{ catLabel(t.category) }}</span></td>
                            <td>{{ t.plannedHours }}h</td>
                            <td>{{ t.completedHours }}h</td>
                            <td><span class="status-pill status-pill--{{ t.status.toLowerCase() }}">{{ t.status }}</span></td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  }
                </div>
              }
            }
          </div>
        }
      </div>
    </div>

    <!-- Complete Week confirm dialog -->
    @if (confirmComplete) {
      <div class="modal-overlay" (click)="confirmComplete = false">
        <div class="modal-box" (click)="$event.stopPropagation()" style="max-width:460px;">
          <div class="modal-header">
            <h3>Finish This Week?</h3>
            <button class="btn btn--ghost btn--sm" (click)="confirmComplete = false">✕</button>
          </div>
          <p class="mt-md text-secondary">This will archive the week. No further updates will be possible.</p>
          <div class="flex gap-sm mt-lg">
            <button class="btn btn--success" (click)="completeWeek()">Yes, Finish It</button>
            <button class="btn btn--secondary" (click)="confirmComplete = false">Cancel</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    /* Header */
    .tp-header {
      display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 1rem;
    }
    .tp-header__left { display: flex; flex-direction: column; gap: 6px; }
    .tp-header__left h2 { margin: 0; }

    /* Status badge on the plan */
    .status-badge {
      display: inline-block; padding: 2px 10px; border-radius: 999px;
      font-size: 0.72rem; font-weight: 700; letter-spacing: 0.05em;
    }
    .status-badge--planning  { background: rgba(52,152,219,0.2); color: #3498db; border: 1px solid rgba(52,152,219,0.4); }
    .status-badge--frozen    { background: rgba(155,89,182,0.2); color: #9b59b6; border: 1px solid rgba(155,89,182,0.4); }
    .status-badge--completed { background: rgba(39,174,96,0.2); color: #27ae60; border: 1px solid rgba(39,174,96,0.4); }

    /* 3 stat cards */
    .stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-md); }
    @media (max-width: 600px) { .stats-row { grid-template-columns: 1fr; } }
    .stat-card {
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: var(--border-radius-lg); padding: var(--space-lg);
      text-align: center;
    }
    .stat-label { font-size: 0.78rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px; }
    .stat-value { font-size: 1.5rem; font-weight: 700; color: var(--text-primary); }
    .stat-sub   { font-size: 0.82rem; color: var(--text-secondary); margin-top: 2px; }

    /* Info box */
    .info-box {
      background: rgba(52,152,219,0.1); border: 1px solid rgba(52,152,219,0.3);
      border-radius: var(--border-radius); padding: var(--space-md) var(--space-lg);
      color: var(--text-secondary); font-size: 0.9rem;
    }

    /* All-done success banner */
    .all-done-banner {
      background: rgba(39,174,96,0.18); border: 1px solid rgba(39,174,96,0.4);
      border-radius: var(--border-radius); padding: var(--space-md) var(--space-lg);
      color: #27ae60; font-size: 0.95rem;
    }

    /* Section title */
    .section-title { font-size: 1rem; font-weight: 700; color: var(--text-primary); }

    /* Category rows */
    .cat-list { display: flex; flex-direction: column; gap: 2px; }
    .cat-row {
      display: flex; align-items: center; gap: var(--space-md); flex-wrap: wrap;
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: var(--border-radius-lg); padding: var(--space-md) var(--space-lg);
    }
    .cat-stat { font-size: 0.85rem; color: var(--text-secondary); white-space: nowrap; }
    .cat-stat strong { color: var(--text-primary); }
    .cat-bar-wrap {
      flex: 1; min-width: 80px; height: 6px;
      background: var(--border); border-radius: 999px; overflow: hidden;
    }
    .cat-bar-fill {
      height: 100%; border-radius: 999px; transition: width 0.3s ease;
    }
    .cat-bar-fill.badge--client   { background: var(--cat-client, #3498db); }
    .cat-bar-fill.badge--techdebt { background: var(--cat-techdebt, #e67e22); }
    .cat-bar-fill.badge--rnd      { background: var(--cat-rnd, #9b59b6); }

    /* Category detail */
    .cat-detail {
      background: var(--bg-input); border: 1px solid var(--border);
      border-top: none; border-radius: 0 0 var(--border-radius-lg) var(--border-radius-lg);
      padding: var(--space-md);
    }

    /* Member rows */
    .member-list { display: flex; flex-direction: column; gap: 2px; }
    .member-row {
      display: flex; align-items: center; gap: var(--space-md); flex-wrap: wrap;
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: var(--border-radius-lg); padding: var(--space-md) var(--space-lg);
    }
    .member-name  { font-weight: 700; font-size: 0.95rem; min-width: 120px; }
    .member-hours { font-size: 0.84rem; color: var(--text-secondary); white-space: nowrap; }
    .member-bar-wrap {
      flex: 1; min-width: 80px; height: 6px;
      background: var(--border); border-radius: 999px; overflow: hidden;
    }
    .member-bar-fill {
      height: 100%; border-radius: 999px;
      background: var(--accent, #3498db); transition: width 0.3s ease;
    }
    .member-status-badge {
      padding: 3px 10px; border-radius: 999px;
      font-size: 0.72rem; font-weight: 700; white-space: nowrap;
    }
    .member-status-badge.badge--working { background: rgba(52,152,219,0.2); color: #3498db; border: 1px solid rgba(52,152,219,0.4); }
    .member-status-badge.badge--done    { background: rgba(39,174,96,0.2);  color: #27ae60; border: 1px solid rgba(39,174,96,0.4); }
    .member-status-badge.badge--waiting { background: rgba(127,140,141,0.2); color: #7f8c8d; border: 1px solid rgba(127,140,141,0.4); }

    /* Member detail */
    .member-detail {
      background: var(--bg-input); border: 1px solid var(--border);
      border-top: none; border-radius: 0 0 var(--border-radius-lg) var(--border-radius-lg);
      padding: var(--space-md);
    }

    /* Detail tables shared style */
    .detail-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    .detail-table th {
      padding: 6px 10px; font-size: 0.78rem; color: var(--text-secondary);
      font-weight: 600; text-align: left; border-bottom: 1px solid var(--border);
    }
    .detail-table td { padding: 6px 10px; border-bottom: 1px solid rgba(255,255,255,0.03); }
    .detail-table tr:last-child td { border-bottom: none; }

    /* Task status pills */
    .status-pill {
      padding: 2px 8px; border-radius: 999px; font-size: 0.72rem; font-weight: 600;
    }
    .status-pill--notstarted  { background: rgba(127,140,141,0.2); color: #7f8c8d; }
    .status-pill--inprogress  { background: rgba(52,152,219,0.2);  color: #3498db; }
    .status-pill--completed   { background: rgba(39,174,96,0.2);   color: #27ae60; }
    .status-pill--blocked     { background: rgba(231,76,60,0.2);   color: #e74c3c; }

    /* extra button size */
    .btn--xs { padding: 3px 10px; font-size: 0.78rem; }
    .btn--success { background: #27ae60; color: #fff; border: none; }
    .btn--success:hover:not(:disabled) { background: #219150; }
  `]
})
export class TeamProgressComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  readonly router = inject(Router);

  readonly loading = signal(true);
  readonly completing = signal(false);
  readonly dashboard = signal<Dashboard | null>(null);
  readonly plan = signal<WeeklyPlan | null>(null);
  readonly planId = signal('');

  /** Which category row is expanded */
  readonly expandedCat = signal<string | null>(null);
  /** Which member row is expanded */
  readonly expandedMember = signal<string | null>(null);

  confirmComplete = false;

  ngOnInit(): void {
    this.api.getActivePlan().subscribe({
      next: (p) => {
        if (!p) { this.loading.set(false); return; }
        this.plan.set(p);
        this.planId.set(p.id);
        this.api.getDashboard(p.id).subscribe({
          next: (d) => { this.dashboard.set(d); this.loading.set(false); },
          error: () => this.loading.set(false)
        });
      },
      error: () => this.loading.set(false)
    });
  }

  // ── Computed stats ───────────────────────────────────────────────────────

  totalTasks(): number {
    return this.dashboard()?.tasks?.length ?? 0;
  }

  tasksDone(): number {
    return this.dashboard()?.tasks?.filter(t => t.status === 'Completed').length ?? 0;
  }

  tasksBlocked(): number {
    return this.dashboard()?.tasks?.filter(t => t.status === 'Blocked').length ?? 0;
  }

  tasksByCategory(cat: string) {
    return (this.dashboard()?.tasks ?? []).filter(t => t.category === cat);
  }

  // ── Expand toggles ───────────────────────────────────────────────────────

  toggleCatDetail(cat: string): void {
    this.expandedCat.set(this.expandedCat() === cat ? null : cat);
  }

  toggleMemberDetail(userId: string): void {
    this.expandedMember.set(this.expandedMember() === userId ? null : userId);
  }

  // ── Actions ──────────────────────────────────────────────────────────────

  completeWeek(): void {
    this.confirmComplete = false;
    this.completing.set(true);
    this.api.completePlan(this.planId()).subscribe({
      next: () => {
        this.toast.success('Week completed and archived! Great work team! 🎉');
        this.router.navigate(['/home']);
      },
      error: (err) => {
        this.toast.error(err.error?.detail ?? 'Failed to complete the week.');
        this.completing.set(false);
      }
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  catLabel(cat: string): string { return CATEGORY_LABELS[cat as CategoryType] ?? cat; }
  catClass(cat: string): string { return CATEGORY_BADGE_CLASS[cat as CategoryType] ?? ''; }
}
