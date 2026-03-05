import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { WeeklyPlan, Dashboard, CATEGORY_LABELS, CATEGORY_BADGE_CLASS, CategoryType } from '../../core/models/models';
import { NavbarComponent } from '../../shared/navbar/navbar.component';

@Component({
  selector: 'app-past-weeks',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent],
  template: `
    <app-navbar />
    <div class="page">
      <div class="container">

        <!-- ═══════════════════════════════ DETAIL VIEW ═══════════════════════════════ -->
        @if (selectedPlan()) {
          <div class="detail-view">
            <button class="btn btn--ghost btn--sm mb-md" (click)="clearSelection()">← Back to Past Weeks</button>

            <div class="detail-header mb-lg">
              <div>
                <h2 class="mb-xs">Past Week — {{ fmtDate(selectedPlan()!.weekStartDate) }}</h2>
                <span class="sw-badge sw-badge--{{ selectedPlan()!.status.toLowerCase() }}">
                  {{ selectedPlan()!.status.toUpperCase() }}
                </span>
              </div>
              <div class="detail-meta">
                <span class="meta-chip">Client {{ selectedPlan()!.clientPercent }}%</span>
                <span class="meta-chip">Tech Debt {{ selectedPlan()!.techDebtPercent }}%</span>
                <span class="meta-chip">R&D {{ selectedPlan()!.rdPercent }}%</span>
              </div>
            </div>

            @if (detailLoading()) {
              <div class="text-center mt-xl"><div class="spinner"></div></div>
            } @else if (detail()) {

              <!-- 3 stat cards -->
              <div class="stats-row mb-lg">
                <div class="stat-card">
                  <div class="stat-label">Overall Progress</div>
                  <div class="stat-value">{{ detail()!.totalCompletedHours }}h / {{ detail()!.totalPlannedHours }}h</div>
                  <div class="stat-bar-wrap mt-md">
                    <div class="stat-bar-fill" [style.width.%]="overallPct()"></div>
                  </div>
                  <div class="stat-sub">{{ detail()!.overallProgress }}%</div>
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

              <!-- All-done banner -->
              @if (totalTasks() > 0 && tasksDone() === totalTasks()) {
                <div class="all-done-banner mb-lg">🎉 <strong>Great work!</strong> All tasks are done this week!</div>
              }

              <!-- By Category -->
              <h3 class="section-title mb-sm">By Category</h3>
              <div class="cat-list mb-lg">
                @for (cat of detail()!.categoryBreakdown; track cat.category) {
                  <div class="cat-card" (click)="toggleCat(cat.category)" style="cursor:pointer;">
                    <div class="cat-card__top">
                      <span class="badge {{ catClass(cat.category) }}">{{ catLabel(cat.category) }}</span>
                      <span class="cat-stat">Budget: <strong>{{ cat.plannedHours }}h</strong></span>
                      <span class="cat-stat">Done: <strong>{{ cat.completedHours }}h ({{ cat.progressPercent }}%)</strong></span>
                      <div class="cat-bar-wrap">
                        <div class="cat-bar-fill {{ catClass(cat.category) }}" [style.width.%]="cat.progressPercent"></div>
                      </div>
                      <button class="btn btn--ghost btn--xs" (click)="$event.stopPropagation(); toggleCat(cat.category)">
                        {{ expandedCat() === cat.category ? 'Hide ▴' : 'See Details ▾' }}
                      </button>
                    </div>
                    @if (expandedCat() === cat.category) {
                      <div class="expand-panel" (click)="$event.stopPropagation()">
                        @if (tasksByCat(cat.category).length === 0) {
                          <p class="text-secondary text-sm">No tasks in this category.</p>
                        } @else {
                          <table class="dtable">
                            <thead><tr><th>Item</th><th>Assigned To</th><th>Committed</th><th>Done</th><th>Status</th></tr></thead>
                            <tbody>
                              @for (t of tasksByCat(cat.category); track t.id) {
                                <tr>
                                  <td>{{ t.backlogItemTitle }}</td>
                                  <td>{{ t.assignedUserName }}</td>
                                  <td>{{ t.plannedHours }}h</td>
                                  <td>{{ t.completedHours }}h</td>
                                  <td><span class="spill spill--{{ t.status.toLowerCase() }}">{{ t.status }}</span></td>
                                </tr>
                              }
                            </tbody>
                          </table>
                        }
                      </div>
                    }
                  </div>
                }
              </div>

              <!-- By Member -->
              <h3 class="section-title mb-sm">By Member</h3>
              <div class="member-list mb-lg">
                @for (u of detail()!.userBreakdown; track u.userId) {
                  <div class="member-card" (click)="toggleMember(u.userId)" style="cursor:pointer;">
                    <div class="member-card__top">
                      <span class="member-name">{{ u.userName }}</span>
                      <span class="member-hours">{{ u.completedHours }}h / {{ u.plannedHours }}h ({{ u.progressPercent }}%)</span>
                      <div class="mbar-wrap">
                        <div class="mbar-fill" [style.width.%]="u.progressPercent"
                          [class.mbar-fill--overrun]="u.progressPercent > 100"></div>
                      </div>
                      <span class="mstatus"
                        [class.mstatus--done]="u.progressPercent >= 100"
                        [class.mstatus--working]="u.progressPercent > 0 && u.progressPercent < 100"
                        [class.mstatus--waiting]="u.progressPercent === 0">
                        {{ u.progressPercent >= 100 ? 'Done' : u.progressPercent > 0 ? 'Working' : 'Not Yet' }}
                      </span>
                      <button class="btn btn--ghost btn--xs" (click)="$event.stopPropagation(); toggleMember(u.userId)">
                        {{ expandedMember() === u.userId ? 'Hide ▴' : 'See Plan ▾' }}
                      </button>
                    </div>
                    @if (expandedMember() === u.userId) {
                      <div class="expand-panel" (click)="$event.stopPropagation()">
                        @if (u.tasks.length === 0) {
                          <p class="text-secondary text-sm">No tasks assigned.</p>
                        } @else {
                          <table class="dtable">
                            <thead><tr><th>Task</th><th>Category</th><th>Committed</th><th>Done</th><th>Status</th></tr></thead>
                            <tbody>
                              @for (t of u.tasks; track t.id) {
                                <tr>
                                  <td>{{ t.backlogItemTitle }}</td>
                                  <td><span class="badge {{ catClass(t.category) }}" style="font-size:0.7rem">{{ catLabel(t.category) }}</span></td>
                                  <td>{{ t.plannedHours }}h</td>
                                  <td>{{ t.completedHours }}h</td>
                                  <td><span class="spill spill--{{ t.status.toLowerCase() }}">{{ t.status }}</span></td>
                                </tr>
                              }
                            </tbody>
                          </table>
                        }
                      </div>
                    }
                  </div>
                }
              </div>
            }
          </div>

        } @else {
          <!-- ═══════════════════════════ LIST VIEW ═══════════════════════════════════ -->
          <h2 class="mb-xs">Past Weeks</h2>
          <p class="text-secondary text-sm mb-lg">Historical record of all completed cycles.</p>

          @if (loading()) {
            <div class="text-center mt-xl"><div class="spinner"></div></div>
          } @else if (completedPlans().length === 0) {
            <div class="card text-center" style="padding: var(--space-2xl);">
              <p class="text-muted" style="font-size:1rem;">No completed weeks yet.</p>
              <a routerLink="/home" class="btn btn--primary mt-md">Back to Home</a>
            </div>
          } @else {
            <div class="plan-list">
              @for (plan of completedPlans(); track plan.id) {
                <div class="plan-row" (click)="selectPlan(plan)">
                  <div class="plan-row__left">
                    <span class="plan-week-label">Week of {{ fmtDate(plan.weekStartDate) }}</span>
                    <span class="sw-badge sw-badge--{{ plan.status.toLowerCase() }}">{{ plan.status }}</span>
                  </div>
                  <div class="plan-row__right">
                    <span class="plan-meta">
                      {{ fmtDate(plan.weekStartDate) }} → {{ fmtDate(plan.weekEndDate) }}
                    </span>
                    <span class="plan-meta">
                      Client {{ plan.clientPercent }}% · TechDebt {{ plan.techDebtPercent }}% · R&D {{ plan.rdPercent }}%
                    </span>
                    <button class="btn btn--ghost btn--sm view-btn" (click)="$event.stopPropagation(); selectPlan(plan)">
                      View Details →
                    </button>
                  </div>
                </div>
              }
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    /* ── List view ─────────────────────────────────────────────────────────── */
    .plan-list { display: flex; flex-direction: column; gap: var(--space-sm); }
    .plan-row {
      display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: var(--border-radius-lg); padding: var(--space-md) var(--space-lg);
      cursor: pointer; transition: all 0.2s ease;
    }
    .plan-row:hover { border-color: var(--accent); transform: translateX(4px); }
    .plan-row__left  { display: flex; align-items: center; gap: var(--space-sm); }
    .plan-row__right { display: flex; align-items: center; gap: var(--space-md); flex-wrap: wrap; }
    .plan-week-label { font-weight: 700; font-size: 1rem; }
    .plan-meta { font-size: 0.82rem; color: var(--text-secondary); white-space: nowrap; }
    .view-btn { white-space: nowrap; }

    /* ── Status badge ──────────────────────────────────────────────────────── */
    .sw-badge        { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 0.72rem; font-weight: 700; }
    .sw-badge--completed { background: rgba(39,174,96,0.2);  color: #27ae60; border: 1px solid rgba(39,174,96,0.4); }
    .sw-badge--frozen    { background: rgba(155,89,182,0.2); color: #9b59b6; border: 1px solid rgba(155,89,182,0.4); }

    /* ── Detail view ─────────────────────────────────────────────────────── */
    .detail-header { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 1rem; }
    .detail-header h2 { margin: 0; }
    .detail-meta { display: flex; gap: var(--space-sm); flex-wrap: wrap; }
    .meta-chip { background: var(--bg-card); border: 1px solid var(--border); border-radius: 999px; padding: 3px 10px; font-size: 0.8rem; color: var(--text-secondary); }

    /* Stat cards */
    .stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-md); }
    @media (max-width: 600px) { .stats-row { grid-template-columns: 1fr; } }
    .stat-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--border-radius-lg); padding: var(--space-lg); text-align: center; }
    .stat-label { font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px; }
    .stat-value { font-size: 1.5rem; font-weight: 700; }
    .stat-sub   { font-size: 0.82rem; color: var(--text-secondary); margin-top: 4px; }
    .stat-bar-wrap { height: 6px; background: var(--border); border-radius: 999px; overflow: hidden; }
    .stat-bar-fill { height: 100%; background: var(--accent, #3498db); border-radius: 999px; }

    /* All-done */
    .all-done-banner { background: rgba(39,174,96,0.18); border: 1px solid rgba(39,174,96,0.4); border-radius: var(--border-radius); padding: var(--space-md) var(--space-lg); color: #27ae60; }

    .section-title { font-size: 1rem; font-weight: 700; }

    /* Category cards */
    .cat-list   { display: flex; flex-direction: column; gap: 2px; }
    .cat-card   { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--border-radius-lg); overflow: hidden; transition: border-color 0.15s; }
    .cat-card:hover { border-color: var(--accent); }
    .cat-card__top { display: flex; align-items: center; gap: var(--space-md); flex-wrap: wrap; padding: var(--space-md) var(--space-lg); }
    .cat-stat { font-size: 0.84rem; color: var(--text-secondary); white-space: nowrap; }
    .cat-stat strong { color: var(--text-primary); }
    .cat-bar-wrap { flex: 1; min-width: 60px; height: 6px; background: var(--border); border-radius: 999px; overflow: hidden; }
    .cat-bar-fill { height: 100%; border-radius: 999px; transition: width 0.3s ease; }
    .cat-bar-fill.badge--client   { background: #3498db; }
    .cat-bar-fill.badge--techdebt { background: #e67e22; }
    .cat-bar-fill.badge--rnd      { background: #9b59b6; }

    /* Member cards */
    .member-list { display: flex; flex-direction: column; gap: 2px; }
    .member-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--border-radius-lg); overflow: hidden; transition: border-color 0.15s; }
    .member-card:hover { border-color: var(--accent); }
    .member-card__top { display: flex; align-items: center; gap: var(--space-md); flex-wrap: wrap; padding: var(--space-md) var(--space-lg); }
    .member-name  { font-weight: 700; font-size: 0.95rem; min-width: 110px; }
    .member-hours { font-size: 0.83rem; color: var(--text-secondary); white-space: nowrap; }
    .mbar-wrap { flex: 1; min-width: 60px; height: 6px; background: var(--border); border-radius: 999px; overflow: hidden; }
    .mbar-fill { height: 100%; background: var(--accent, #3498db); border-radius: 999px; transition: width 0.3s ease; }
    .mbar-fill--overrun { background: #f59e0b; }
    .mstatus { padding: 3px 10px; border-radius: 999px; font-size: 0.72rem; font-weight: 700; white-space: nowrap; }
    .mstatus--done    { background: rgba(39,174,96,0.2);   color: #27ae60; border: 1px solid rgba(39,174,96,0.4); }
    .mstatus--working { background: rgba(52,152,219,0.2);  color: #3498db; border: 1px solid rgba(52,152,219,0.4); }
    .mstatus--waiting { background: rgba(127,140,141,0.2); color: #7f8c8d; border: 1px solid rgba(127,140,141,0.4); }

    /* Expand panel (detail table) */
    .expand-panel { background: var(--bg-input); border-top: 1px solid var(--border); padding: var(--space-md); }
    .dtable { width: 100%; border-collapse: collapse; font-size: 0.84rem; }
    .dtable th { padding: 6px 10px; font-size: 0.75rem; color: var(--text-secondary); font-weight: 600; text-align: left; border-bottom: 1px solid var(--border); }
    .dtable td { padding: 6px 10px; border-bottom: 1px solid rgba(255,255,255,0.03); }
    .dtable tr:last-child td { border-bottom: none; }
    .spill { padding: 2px 8px; border-radius: 999px; font-size: 0.72rem; font-weight: 600; }
    .spill--notstarted  { background: rgba(127,140,141,0.2); color: #7f8c8d; }
    .spill--inprogress  { background: rgba(52,152,219,0.2);  color: #3498db; }
    .spill--completed   { background: rgba(39,174,96,0.2);   color: #27ae60; }
    .spill--blocked     { background: rgba(231,76,60,0.2);   color: #e74c3c; }

    .btn--xs { padding: 3px 10px; font-size: 0.78rem; }
  `]
})
export class PastWeeksComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly completedPlans = signal<WeeklyPlan[]>([]);

  readonly selectedPlan = signal<WeeklyPlan | null>(null);
  readonly detail = signal<Dashboard | null>(null);
  readonly detailLoading = signal(false);
  readonly expandedCat = signal<string | null>(null);
  readonly expandedMember = signal<string | null>(null);

  ngOnInit(): void {
    this.api.getPlans().subscribe({
      next: (plans) => {
        this.completedPlans.set(plans.filter(p => p.status === 'Completed'));
        this.loading.set(false);
      },
      error: () => { this.toast.error('Failed to load plan history.'); this.loading.set(false); }
    });
  }

  selectPlan(plan: WeeklyPlan): void {
    this.selectedPlan.set(plan);
    this.detail.set(null);
    this.expandedCat.set(null);
    this.expandedMember.set(null);
    this.detailLoading.set(true);
    this.api.getDashboard(plan.id).subscribe({
      next: (d) => { this.detail.set(d); this.detailLoading.set(false); },
      error: () => { this.toast.error('Failed to load week details.'); this.detailLoading.set(false); }
    });
  }

  clearSelection(): void { this.selectedPlan.set(null); this.detail.set(null); }

  totalTasks(): number { return this.detail()?.tasks?.length ?? 0; }
  tasksDone(): number { return this.detail()?.tasks?.filter(t => t.status === 'Completed').length ?? 0; }
  tasksBlocked(): number { return this.detail()?.tasks?.filter(t => t.status === 'Blocked').length ?? 0; }
  tasksByCat(cat: string) { return (this.detail()?.tasks ?? []).filter(t => t.category === cat); }
  overallPct(): number { return this.detail()?.overallProgress ?? 0; }

  toggleCat(cat: string): void { this.expandedCat.set(this.expandedCat() === cat ? null : cat); }
  toggleMember(id: string): void { this.expandedMember.set(this.expandedMember() === id ? null : id); }

  fmtDate(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  catLabel(cat: string): string { return CATEGORY_LABELS[cat as CategoryType] ?? cat; }
  catClass(cat: string): string { return CATEGORY_BADGE_CLASS[cat as CategoryType] ?? ''; }
}
