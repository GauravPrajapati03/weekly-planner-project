import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { Router } from '@angular/router';
import { Dashboard, WeeklyPlan, User, CATEGORY_LABELS, CATEGORY_BADGE_CLASS, CategoryType } from '../../core/models/models';
import { NavbarComponent } from '../../shared/navbar/navbar.component';

interface MemberRow {
  userId: string;
  userName: string;
  hoursPlanned: number;
  ready: boolean;
  tasks: { title: string; category: CategoryType; hours: number }[];
}

interface CategoryRow {
  label: string;
  badgeClass: string;
  budget: number;
  planned: number;
  diff: number;
  ok: boolean;
}

@Component({
  selector: 'app-review-freeze',
  standalone: true,
  imports: [CommonModule, NavbarComponent],
  template: `
    <app-navbar />
    <div class="page">
      <div class="container" style="max-width: 800px;">
        <button class="btn btn--ghost btn--sm mb-sm" (click)="router.navigate(['/home'])">← Home</button>
        <h2 class="mb-sm">Review the Team's Plan</h2>

        @if (!auth.isLead) {
          <div class="alert alert--warning">Only the Team Lead can review and freeze the plan.</div>
        } @else if (loading()) {
          <div class="text-center mt-xl"><div class="spinner"></div></div>
        } @else if (!plan()) {
          <div class="alert alert--error">No active plan found.</div>
        } @else {

          <!-- Week header -->
          <p class="week-meta mb-lg">
            Week of {{ formatDate(plan()!.weekStartDate) }}.
            {{ memberRows().length }} team members.
            {{ plan()!.totalTeamHours }} total hours.
          </p>

          <!-- ── Category Summary ──────────────────────────────────────── -->
          <h3 class="section-title mb-sm">Category Summary</h3>
          <div class="table-card mb-lg">
            <table class="review-table">
              <thead>
                <tr><th>Category</th><th>Budget</th><th>Planned</th><th>Status</th></tr>
              </thead>
              <tbody>
                @for (cat of categoryRows(); track cat.label) {
                  <tr>
                    <td><span class="badge {{ cat.badgeClass }}">{{ cat.label }}</span></td>
                    <td>{{ cat.budget }}h</td>
                    <td>{{ cat.planned }}h</td>
                    <td>
                      @if (cat.ok) { <span class="status-ok">✓ OK</span> }
                      @else {        <span class="status-warn">⚠ Off by {{ absNum(cat.diff) }}h</span> }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- ── Member Summary ───────────────────────────────────────── -->
          <h3 class="section-title mb-sm">Member Summary</h3>
          <div class="member-list mb-lg">
            @for (member of memberRows(); track member.userId) {
              <div class="member-card">
                <!-- Header row — always visible, click to expand -->
                <div class="member-header" (click)="toggleExpanded(member.userId)">
                  <div class="member-header__left">
                    <span class="member-name">{{ member.userName }}</span>
                    <span class="member-hours {{ member.ready ? 'hours--ready' : '' }}">
                      {{ member.hoursPlanned }} / 30h
                    </span>
                  </div>
                  <div class="member-header__right">
                    @if (member.ready) {
                      <span class="badge badge--success" style="font-size:0.75rem;">✓ Ready</span>
                    } @else {
                      <span class="badge badge--warning" style="font-size:0.75rem;">Not yet</span>
                    }
                    <button class="expand-btn">{{ isExpanded(member.userId) ? '▲' : '▼' }}</button>
                  </div>
                </div>

                <!-- Expandable task breakdown — only when explicitly open -->
                @if (isExpanded(member.userId)) {
                  @if (member.tasks.length > 0) {
                    <table class="task-table">
                      <thead>
                        <tr>
                          <th>Item</th>
                          <th>Category</th>
                          <th style="text-align:right;">Hours</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (task of member.tasks; track task.title) {
                          <tr>
                            <td>{{ task.title }}</td>
                            <td>
                              <span class="badge {{ catClass(task.category) }}" style="font-size:0.72rem;">
                                {{ catLabel(task.category) }}
                              </span>
                            </td>
                            <td style="text-align:right;font-weight:600;">{{ task.hours }}h</td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  } @else {
                    <p class="no-tasks-msg">No tasks planned yet.</p>
                  }
                }
              </div>
            }
          </div>

          <!-- ── Status Box ────────────────────────────────────────────── -->
          @if (unmetConditions().length === 0) {
            <div class="ok-box mb-lg">Everything looks good! You can freeze the plan.</div>
          } @else {
            <div class="cant-freeze-box mb-lg">
              <p class="cant-freeze-title">Can't freeze yet:</p>
              <ul class="cant-freeze-list">
                @for (msg of unmetConditions(); track msg) {
                  <li>{{ msg }}</li>
                }
              </ul>
            </div>
          }

          <!-- ── Action Buttons ────────────────────────────────────────── -->
          <div class="action-row">
            <button class="btn btn--primary btn--lg"
              [disabled]="unmetConditions().length > 0 || freezing()"
              (click)="confirmFreeze = true">
              @if (freezing()) { <span class="spinner"></span>&nbsp;Freezing... }
              @else { ❄ Freeze the Plan }
            </button>
            <button class="btn btn--danger btn--sm" [disabled]="cancelling()"
              (click)="confirmCancel = true">
              @if (cancelling()) { <span class="spinner"></span> }
              @else { Cancel Planning }
            </button>
          </div>
        }
      </div>
    </div>

    <!-- Freeze confirm dialog — matches demo app -->
    @if (confirmFreeze) {
      <div class="modal-overlay" (click)="confirmFreeze = false">
        <div class="modal-box" (click)="$event.stopPropagation()" style="max-width:480px;">
          <div class="modal-header">
            <h3>Freeze the Plan?</h3>
            <button class="btn btn--ghost btn--sm" (click)="confirmFreeze = false">✕</button>
          </div>
          <p class="mt-md text-secondary">
            After this, nobody can change their hours. Team members will only report progress.
          </p>
          <div class="flex gap-sm mt-lg">
            <button class="btn btn--primary" (click)="freeze()">Yes, Freeze It</button>
            <button class="btn btn--secondary" (click)="confirmFreeze = false">No, Go Back</button>
          </div>
        </div>
      </div>
    }

    <!-- Cancel dialog -->
    @if (confirmCancel) {
      <div class="modal-overlay" (click)="confirmCancel = false">
        <div class="modal-box" (click)="$event.stopPropagation()" style="max-width:460px;">
          <div class="modal-header">
            <h3>Cancel Planning?</h3>
            <button class="btn btn--ghost btn--sm" (click)="confirmCancel = false">✕</button>
          </div>
          <p class="mt-md text-secondary">
            This will <strong>delete the current plan and all tasks</strong>. This cannot be undone.
          </p>
          <div class="flex gap-sm mt-lg">
            <button class="btn btn--danger" (click)="cancelPlan()">Yes, Cancel It</button>
            <button class="btn btn--secondary" (click)="confirmCancel = false">No, Go Back</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .week-meta { color: var(--text-secondary); font-size: 0.92rem; }
    .section-title { font-size: 1rem; font-weight: 700; }

    .table-card {
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: var(--border-radius-lg); overflow: hidden;
    }
    .review-table { width: 100%; border-collapse: collapse; }
    .review-table th {
      background: var(--bg-input); text-align: left; padding: 10px 16px;
      font-size: 0.82rem; color: var(--text-secondary); font-weight: 600;
      border-bottom: 1px solid var(--border);
    }
    .review-table td {
      padding: 10px 16px; border-bottom: 1px solid rgba(255,255,255,0.04); font-size: 0.9rem;
    }
    .review-table tr:last-child td { border-bottom: none; }
    .status-ok   { color: #27ae60; font-weight: 600; font-size: 0.85rem; }
    .status-warn { color: #e74c3c; font-weight: 600; font-size: 0.85rem; }

    /* Member cards */
    .member-list { display: flex; flex-direction: column; gap: var(--space-sm); }
    .member-card {
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: var(--border-radius-lg); overflow: hidden;
    }
    .member-header {
      display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap;
      padding: var(--space-md) var(--space-lg); cursor: pointer;
      &:hover { background: rgba(255,255,255,0.02); }
    }
    .member-header__left { display: flex; align-items: center; gap: var(--space-lg); }
    .member-header__right { display: flex; align-items: center; gap: var(--space-sm); }
    .member-name { font-weight: 700; font-size: 0.95rem; }
    .member-hours { color: var(--text-secondary); font-size: 0.9rem; }
    .member-hours.hours--ready { color: #27ae60; font-weight: 600; }
    .expand-btn {
      background: none; border: none; color: var(--text-secondary);
      cursor: pointer; font-size: 0.7rem; padding: 2px 6px;
    }

    .task-table { width: 100%; border-collapse: collapse; background: var(--bg-input); }
    .task-table th {
      padding: 8px 16px; font-size: 0.78rem; color: var(--text-secondary); font-weight: 600;
      text-align: left; border-bottom: 1px solid var(--border);
    }
    .task-table td {
      padding: 8px 16px; font-size: 0.88rem; border-bottom: 1px solid rgba(255,255,255,0.03);
    }
    .task-table tr:last-child td { border-bottom: none; }
    .no-tasks-msg { padding: var(--space-md) var(--space-lg); color: var(--text-secondary); font-size: 0.88rem; }

    /* Status boxes */
    .ok-box {
      background: rgba(39,174,96,0.12); border: 1px solid rgba(39,174,96,0.4);
      border-radius: var(--border-radius-lg); padding: var(--space-lg);
      color: #27ae60; font-weight: 500;
    }
    .cant-freeze-box {
      background: rgba(231,76,60,0.1); border: 1px solid rgba(231,76,60,0.35);
      border-radius: var(--border-radius-lg); padding: var(--space-lg);
    }
    .cant-freeze-title { font-weight: 700; color: #e74c3c; margin-bottom: var(--space-sm); }
    .cant-freeze-list {
      list-style: none; display: flex; flex-direction: column; gap: 6px;
      color: var(--text-secondary); font-size: 0.88rem;
    }
    .cant-freeze-list li::before { content: "• "; color: #e74c3c; font-weight: 700; }

    .action-row { display: flex; gap: var(--space-md); flex-wrap: wrap; align-items: center; }
    .btn--danger { background: #e74c3c; color: #fff; border: none; }
    .btn--danger:hover:not(:disabled) { background: #c0392b; }
    .btn--lg { padding: 0.7rem 1.6rem; font-size: 1rem; font-weight: 700; }
  `]
})
export class ReviewFreezeComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  readonly router = inject(Router);

  readonly loading = signal(true);
  readonly freezing = signal(false);
  readonly cancelling = signal(false);
  readonly plan = signal<WeeklyPlan | null>(null);
  readonly dashboard = signal<Dashboard | null>(null);
  readonly allUsers = signal<User[]>([]);

  /** Tracks which member rows are expanded — separate signal so memberRows() stays pure */
  readonly expandedIds = signal<Set<string>>(new Set<string>());

  confirmFreeze = false;
  confirmCancel = false;

  // ── Init ─────────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.api.getActivePlan().subscribe({
      next: (p) => {
        if (!p) { this.loading.set(false); return; }
        this.plan.set(p);

        // Load dashboard + all users in parallel
        Promise.all([
          new Promise<void>(res => this.api.getDashboard(p.id).subscribe({ next: d => { this.dashboard.set(d); res(); }, error: () => res() })),
          new Promise<void>(res => this.api.getUsers().subscribe({ next: u => { this.allUsers.set(u); res(); }, error: () => res() }))
        ]).then(() => this.loading.set(false));
      },
      error: () => this.loading.set(false)
    });
  }

  // ── Computeds ────────────────────────────────────────────────────────────

  memberRows(): MemberRow[] {
    const p = this.plan();
    const d = this.dashboard();
    const allUsers = this.allUsers();
    if (!p || !allUsers.length) return [];

    let selectedUsers: User[];
    const selectedIds = p.selectedMemberIds ?? [];
    if (selectedIds.length > 0) {
      const selectedSet = new Set(selectedIds);
      selectedUsers = allUsers.filter(u => selectedSet.has(u.id));
    } else {
      selectedUsers = allUsers;
    }

    const taskMap = new Map((d?.userBreakdown ?? []).map(u => [u.userId, u]));

    return selectedUsers.map(user => {
      const userData = taskMap.get(user.id);
      const submitKey = `plan-submit-${p.id}-${user.id}`;
      const isSubmitted = localStorage.getItem(submitKey) === 'true';
      const hoursPlanned = userData?.plannedHours ?? 0;
      return {
        userId: user.id,
        userName: user.name,
        hoursPlanned,
        ready: isSubmitted,           // READY badge = only if they clicked the button
        tasks: (userData?.tasks ?? []).map(t => ({
          title: t.backlogItemTitle,
          category: t.category as CategoryType,
          hours: t.plannedHours
        }))
      };
    });
  }

  categoryRows(): CategoryRow[] {
    const p = this.plan();
    const d = this.dashboard();
    if (!p) return [];

    const totalHours = p.totalTeamHours || 30;
    const catMap = new Map((d?.categoryBreakdown ?? []).map(c => [c.category, c.plannedHours]));

    return [
      { label: 'Client Focused', badgeClass: 'badge--client', key: 'Client', pct: p.clientPercent },
      { label: 'Tech Debt', badgeClass: 'badge--techdebt', key: 'TechDebt', pct: p.techDebtPercent },
      { label: 'R&D', badgeClass: 'badge--rnd', key: 'RnD', pct: p.rdPercent },
    ].map(cat => {
      const budget = Math.round(cat.pct / 100 * totalHours * 10) / 10;
      const planned = catMap.get(cat.key) ?? 0;
      const diff = Math.round((budget - planned) * 10) / 10;
      return { label: cat.label, badgeClass: cat.badgeClass, budget, planned, diff, ok: Math.abs(diff) < 0.1 } as CategoryRow;
    });
  }

  unmetConditions(): string[] {
    const msgs: string[] = [];
    // Freeze condition: every member must have exactly 30h planned
    for (const m of this.memberRows()) {
      if (m.hoursPlanned < 30)
        msgs.push(`${m.userName} has ${m.hoursPlanned}h planned (needs ${30 - m.hoursPlanned} more).`);
    }
    for (const cat of this.categoryRows()) {
      if (!cat.ok) {
        if (cat.planned < cat.budget)
          msgs.push(`${cat.label} has ${cat.planned}h planned but budget is ${cat.budget}h.`);
        else
          msgs.push(`${cat.label} exceeds budget: ${cat.planned}h planned, limit is ${cat.budget}h.`);
      }
    }
    return msgs;
  }

  // ── Expand / collapse ────────────────────────────────────────────────────

  toggleExpanded(userId: string): void {
    const current = new Set(this.expandedIds());
    if (current.has(userId)) current.delete(userId);
    else current.add(userId);
    this.expandedIds.set(current);
  }

  isExpanded(userId: string): boolean {
    return this.expandedIds().has(userId);
  }

  // ── Actions ──────────────────────────────────────────────────────────────

  freeze(): void {
    const p = this.plan();
    if (!p) return;
    this.confirmFreeze = false;
    this.freezing.set(true);
    this.api.freezePlan(p.id).subscribe({
      next: () => {
        this.toast.success('Plan is now frozen! Good luck team. 🚀');
        this.router.navigate(['/home']);
      },
      error: (err) => {
        this.toast.error(err.error?.detail ?? 'Failed to freeze plan.');
        this.freezing.set(false);
      }
    });
  }

  cancelPlan(): void {
    const p = this.plan();
    if (!p) return;
    this.confirmCancel = false;
    this.cancelling.set(true);
    this.api.cancelPlan(p.id).subscribe({
      next: () => {
        this.toast.success('Planning week cancelled.');
        this.router.navigate(['/home']);
      },
      error: (err) => {
        this.toast.error(err.error?.detail ?? 'Failed to cancel planning.');
        this.cancelling.set(false);
      }
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  absNum(n: number): number { return Math.abs(n); }
  catLabel(cat: CategoryType): string { return CATEGORY_LABELS[cat] ?? cat; }
  catClass(cat: CategoryType): string { return CATEGORY_BADGE_CLASS[cat] ?? ''; }
}
