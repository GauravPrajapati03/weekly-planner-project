import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import {
  BacklogItem, WeeklyPlan, WeeklyPlanTask, Dashboard,
  CATEGORY_LABELS, CATEGORY_BADGE_CLASS, CategoryType
} from '../../core/models/models';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { Router } from '@angular/router';

type View = 'plan' | 'backlog-list';

@Component({
  selector: 'app-plan-my-work',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent],
  template: `
    <app-navbar />
    <div class="page">
      <div class="container">

        <!-- ═══════════════════════════════════════════════════════════════ -->
        <!-- VIEW: PLAN MY WORK main screen                                  -->
        <!-- ═══════════════════════════════════════════════════════════════ -->
        @if (view() === 'plan') {
          <button class="btn btn--ghost btn--sm mb-sm" (click)="router.navigate(['/home'])">← Home</button>
          <h2 class="mb-md">Plan My Work</h2>

          @if (!activePlan()) {
            <div class="alert alert--warning">No active planning week. Ask your Team Lead to start one.</div>
          } @else if (activePlan()!.status !== 'Planning') {
            <div class="alert alert--warning">The plan is {{ activePlan()?.status }} — no more changes allowed.</div>
          } @else {

            <!-- Not-a-member banner (shown to users not in selectedMemberIds) -->
            @if (!isInSelectedPlan()) {
              <div class="alert alert--warning" style="margin-bottom: var(--space-lg);">
                <strong>You are not included in this weekly plan.</strong><br>
                Ask the Team Lead to include you in the plan setup.
              </div>
            }

            <!-- Your hours bar -->
            <div class="hours-bar card mb-lg">
              <span>Your hours: <strong>{{ claimedHours() }} of 30</strong> planned. <strong>{{ 30 - claimedHours() }} hours left.</strong></span>
              @if (donePlanning()) {
                <span class="ready-badge">✓ You marked yourself as ready</span>
              }
            </div>

            <!-- Category budget cards — show TEAM-WIDE claimed/left -->
            <div class="cat-cards mb-lg">
              @for (cat of categoryCards(); track cat.key) {
                <div class="cat-card">
                  <span class="badge {{ cat.badgeClass }} mb-md" style="font-size:0.8rem;">{{ cat.label }}</span>
                  <div class="cat-stat"><span>Budget:</span> <strong>{{ cat.budget }}h</strong></div>
                  <div class="cat-stat"><span>Claimed:</span> <strong>{{ cat.claimed }}h</strong></div>
                  <div class="cat-stat"><span>Left:</span> <strong>{{ cat.left }}h</strong></div>
                  <div class="cat-progress-wrap" style="margin-top:var(--space-sm);">
                    <div class="cat-progress-fill {{ cat.badgeClass }}"
                      [style.width.%]="cat.budget > 0 ? Math.min(cat.claimed / cat.budget * 100, 100) : 0">
                    </div>
                  </div>
                </div>
              }
            </div>

            <!-- Action buttons —
                 'Add Work from Backlog' is DISABLED for non-members -->
            <div class="action-row mb-lg">
              <button class="btn btn--primary"
                [disabled]="claimedHours() >= 30 || !isInSelectedPlan()"
                (click)="view.set('backlog-list')">
                Add Work from Backlog
              </button>
              @if (!donePlanning()) {
                <button class="btn btn--secondary" [disabled]="claimedHours() === 0"
                  (click)="markDone()">
                  I'm Done Planning
                </button>
              } @else {
                <button class="btn btn--secondary" (click)="undoDone()">
                  Undo &mdash; I'm Not Done Yet
                </button>
              }
            </div>

            <!-- My Plan section -->
            <h3 class="mb-md">My Plan</h3>
            @if (myTasks().length === 0) {
              <div class="empty-plan card">
                You haven't picked any work yet. Click "Add Work from Backlog" to get started.
              </div>
            } @else {
              <div class="plan-list">
                @for (task of myTasks(); track task.id) {
                  <div class="plan-row card">
                    <div class="plan-row__top">
                      <div class="plan-row__info">
                        <strong>{{ task.backlogItemTitle }}</strong>
                        <span class="badge {{ catClass(task.category) }}" style="margin-left:var(--space-sm);">
                          {{ catLabel(task.category) }}
                        </span>
                        @if (editingTaskId() !== task.id) {
                          <span class="plan-row__hours">{{ task.plannedHours }}h</span>
                        }
                      </div>
                      <div class="plan-row__actions">
                        @if (editingTaskId() !== task.id) {
                          <button class="btn btn--ghost btn--sm" (click)="startInlineEdit(task)">Change Hours</button>
                          <button class="btn btn--danger btn--sm"
                            [disabled]="removingId() === task.id"
                            (click)="removeTask(task)">
                            @if (removingId() === task.id) { <span class="spinner"></span> } @else { Remove }
                          </button>
                        } @else {
                          <input type="number" class="inline-hours-input"
                            [(ngModel)]="inlineHoursVal"
                            min="0.5" step="0.5"
                            (keyup.enter)="saveInlineHours(task)"
                            (keyup.escape)="cancelInlineEdit()" />
                          <button class="btn btn--primary btn--sm"
                            [disabled]="!inlineHoursVal || inlineHoursVal <= 0 || !!inlineEditError() || saving()"
                            (click)="saveInlineHours(task)">Save</button>
                          <button class="btn btn--secondary btn--sm" (click)="cancelInlineEdit()">Cancel</button>
                        }
                      </div>
                    </div>
                    @if (editingTaskId() === task.id && inlineEditError()) {
                      <p class="inline-error">{{ inlineEditError() }}</p>
                    }
                  </div>
                }
              </div>
            }
          }
        }

        <!-- ═══════════════════════════════════════════════════════════════ -->
        <!-- VIEW: PICK A BACKLOG ITEM (full-page list)                      -->
        <!-- ═══════════════════════════════════════════════════════════════ -->
        @if (view() === 'backlog-list') {
          <button class="btn btn--ghost btn--sm mb-md" (click)="view.set('plan')">← Go Back</button>
          <h2 class="mb-md">Pick a Backlog Item</h2>

          <p class="text-secondary mb-md">
            You have <strong>{{ 30 - claimedHours() }}</strong> hours left to plan.
          </p>

          <!-- Category left-budget badges -->
          <div class="cat-budget-badges mb-lg">
            @for (cat of categoryCards(); track cat.key) {
              <span class="cat-budget-badge {{ cat.badgeClass }}">
                {{ cat.label }} ({{ cat.left }}h left)
              </span>
            }
          </div>

          <!-- Backlog items list — shows ALL active items; items in MY plan are still shown -->
          <div class="backlog-list">
            @if (allBacklogForPicker().length === 0) {
              <div class="card text-secondary" style="padding:var(--space-lg);">
                No available backlog items.
              </div>
            }
            @for (item of allBacklogForPicker(); track item.id) {
              <div class="backlog-row card" [class.backlog-row--mine]="isInMyPlan(item.id)">
                <div class="backlog-row__info">
                  <div class="backlog-row__title">
                    <strong>{{ item.title }}</strong>
                    <span class="badge {{ catClass(item.category) }}" style="margin: 0 var(--space-sm);">
                      {{ catLabel(item.category) }}
                    </span>
                    @if (item.estimatedHours) {
                      <span class="est-hours">{{ formatHours(item.estimatedHours) }} est.</span>
                    }
                    @if (isPickedByTeam(item.id)) {
                      <span class="picked-badge">Someone picked this</span>
                    }
                  </div>
                  @if (item.description) {
                    <p class="text-secondary text-sm mt-md" style="margin: 4px 0 0;">{{ item.description }}</p>
                  }
                </div>
                @if (isInMyPlan(item.id)) {
                  <span class="in-plan-tag">✓ In your plan</span>
                } @else {
                  <button class="btn btn--secondary btn--sm" (click)="openPickModal(item)">
                    Pick This Item
                  </button>
                }
              </div>
            }
          </div>
        }

      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════════════════════ -->
    <!-- MODAL: How many hours? (overlays the backlog list)                  -->
    <!-- ═══════════════════════════════════════════════════════════════════ -->
    @if (pickingItem()) {
      <div class="modal-overlay" (click)="closePickModal()">
        <div class="modal-box" (click)="$event.stopPropagation()" style="max-width:520px;">
          <div class="modal-header">
            <h3>How many hours will you work on this?</h3>
            <button class="btn btn--ghost btn--sm" (click)="closePickModal()">✕</button>
          </div>

          <div class="pick-info mb-lg">
            <div class="pick-info__row">
              <strong>{{ pickingItem()!.title }}</strong>
              <span class="badge {{ catClass(pickingItem()!.category) }}" style="margin-left:var(--space-sm);">
                {{ catLabel(pickingItem()!.category) }}
              </span>
            </div>
            <div class="pick-meta">
              <span>Your hours left: <strong>{{ formatHours(30 - claimedHours()) }}</strong></span>
              <span>{{ catLabel(pickingItem()!.category) }} budget left: <strong>{{ formatHours(catBudgetLeft(pickingItem()!.category)) }}h</strong></span>
              @if (pickingItem()!.estimatedHours) {
                <span>Estimate for this item: <strong>{{ formatHours(pickingItem()!.estimatedHours!) }}h</strong>. You can enter any amount.</span>
              }
            </div>
          </div>

          <div class="form-group mb-md">
            <label class="form-label">Hours to commit</label>
            <input type="number" class="form-control"
              [(ngModel)]="pickHours"
              min="0.5" [max]="30 - claimedHours()" step="0.5"
              placeholder="0" />
          </div>

          <!-- Inline validation error -->
          @if (pickValidationError()) {
            <p class="pick-error mb-md">{{ pickValidationError() }}</p>
          }

          <button class="btn btn--primary" style="width:100%;"
            [disabled]="!pickHours || pickHours <= 0 || !!pickValidationError() || saving()"
            (click)="addToMyPlan()">
            @if (saving()) { <span class="spinner"></span>&nbsp;Adding... }
            @else { Add to My Plan }
          </button>
        </div>
      </div>
    }


  `,
  styles: [`
    /* Hours bar */
    .hours-bar {
      padding: var(--space-md) var(--space-lg);
      font-size: 1rem; color: var(--text-secondary);
      border-radius: var(--border-radius-lg);
      display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--space-md);
    }
    .ready-badge {
      background: rgba(39,174,96,0.15); color: #27ae60;
      border: 1px solid rgba(39,174,96,0.4);
      padding: 4px 12px; border-radius: 999px; font-size: 0.84rem; font-weight: 600;
    }

    /* Category budget cards */
    .cat-cards {
      display: grid; grid-template-columns: repeat(3,1fr); gap: var(--space-md);
    }
    @media(max-width:600px){.cat-cards{grid-template-columns:1fr;}}

    .cat-card {
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: var(--border-radius-lg); padding: var(--space-lg);
    }
    .cat-stat {
      display: flex; justify-content: space-between;
      font-size: 0.88rem; color: var(--text-secondary); margin-bottom: 4px;
    }
    .cat-progress-wrap {
      height: 6px; background: var(--border); border-radius: 999px; overflow: hidden;
    }
    .cat-progress-fill {
      height: 100%; border-radius: 999px; transition: width 0.3s ease;
    }
    .cat-progress-fill.badge--client   { background: var(--cat-client, #3498db); }
    .cat-progress-fill.badge--techdebt { background: var(--cat-techdebt, #e67e22); }
    .cat-progress-fill.badge--rnd      { background: var(--cat-rnd, #9b59b6); }

    /* Action buttons row */
    .action-row { display: flex; gap: var(--space-md); }

    /* Plan list */
    .plan-list { display: flex; flex-direction: column; gap: var(--space-md); }
    .empty-plan { padding: var(--space-lg); color: var(--text-secondary); }
    .plan-row {
      display: flex; flex-direction: column; gap: 4px; padding: var(--space-md) var(--space-lg);
    }
    .plan-row__top {
      display: flex; align-items: center; justify-content: space-between;
      flex-wrap: wrap; gap: var(--space-md);
    }
    .plan-row__info { display: flex; align-items: center; flex-wrap: wrap; gap: 4px; flex: 1; }
    .plan-row__hours {
      margin-left: var(--space-sm); font-weight: 700; color: var(--text-primary); font-size: 1rem;
    }
    .plan-row__actions { display: flex; align-items: center; gap: var(--space-sm); flex-wrap: wrap; }
    .inline-hours-input {
      width: 70px; padding: 4px 8px;
      background: var(--bg-input); border: 1px solid var(--border-focus);
      border-radius: var(--border-radius); color: var(--text-primary);
      font-size: 0.9rem; outline: none; text-align: center;
      &::-webkit-inner-spin-button { opacity: 1; }
    }
    .inline-error {
      margin: 0; color: var(--status-error); font-size: 0.82rem;
      padding: 2px var(--space-sm);
    }

    /* Backlog list page */
    .cat-budget-badges { display: flex; flex-wrap: wrap; gap: var(--space-sm); }
    .cat-budget-badge  {
      padding: 4px 12px; border-radius: 999px; font-size: 0.82rem;
      font-weight: 600; color: #fff;
    }
    .cat-budget-badge.badge--client   { background: var(--cat-client, #3498db); }
    .cat-budget-badge.badge--techdebt { background: var(--cat-techdebt, #e67e22); }
    .cat-budget-badge.badge--rnd      { background: var(--cat-rnd, #9b59b6); }

    .backlog-list { display: flex; flex-direction: column; gap: var(--space-md); }
    .backlog-row {
      display: flex; align-items: flex-start; justify-content: space-between;
      gap: var(--space-md);
    }
    .backlog-row__info { flex: 1; }
    .est-hours { font-size: 0.84rem; color: var(--text-secondary); }

    /* Pick modal info */
    .pick-info { background: var(--bg-input); border-radius: var(--border-radius); padding: var(--space-md); }
    .pick-info__row { display: flex; align-items: center; flex-wrap: wrap; margin-bottom: var(--space-sm); }
    .pick-meta { display: flex; flex-direction: column; gap: 4px; font-size: 0.88rem; color: var(--text-secondary); }
    .pick-meta strong { color: var(--text-primary); }

    .pick-error { color: #e74c3c; font-size: 0.85rem; font-weight: 600; }

    /* 'Someone picked this' badge */
    .picked-badge {
      display: inline-block;
      background: rgba(155,89,182,0.18); color: #9b59b6;
      border: 1px solid rgba(155,89,182,0.4);
      padding: 2px 8px; border-radius: 999px; font-size: 0.72rem; font-weight: 600;
      margin-left: 4px;
    }
    .backlog-row__title { display: flex; align-items: center; flex-wrap: wrap; gap: 4px; }

    /* Items already in your plan */
    .in-plan-tag {
      display: inline-block;
      background: rgba(39,174,96,0.15); color: #27ae60;
      border: 1px solid rgba(39,174,96,0.35);
      padding: 3px 10px; border-radius: 999px; font-size: 0.78rem; font-weight: 600;
      white-space: nowrap;
    }
    .backlog-row--mine { opacity: 0.7; }

    .btn--danger { background: var(--status-error, #e74c3c); color: #fff; }
    .btn--danger:hover { filter: brightness(1.1); }
  `]
})
export class PlanMyWorkComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  readonly router = inject(Router);

  readonly Math = Math;

  readonly view = signal<View>('plan');
  readonly activePlan = signal<WeeklyPlan | null>(null);
  readonly myTasks = signal<WeeklyPlanTask[]>([]);
  readonly backlogItems = signal<BacklogItem[]>([]);
  readonly teamDashboard = signal<Dashboard | null>(null);
  readonly saving = signal(false);
  readonly removingId = signal<string | null>(null);
  readonly donePlanning = signal(false);

  // Backlog picker
  readonly pickingItem = signal<BacklogItem | null>(null);
  pickHours = 0;

  // Inline hour editing (replaces Change Hours modal)
  readonly editingTaskId = signal<string | null>(null);
  readonly inlineEditError = signal<string>('');
  inlineHoursVal = 0;

  /** localStorage key for the submitted state: plan-submit-{planId}-{userId} */
  private submitKey(planId: string): string {
    return `plan-submit-${planId}-${this.auth.currentUser()?.id}`;
  }

  /** True if the current user is in the plan's selectedMemberIds list.
   *  If selectedMemberIds is absent or empty the backend selected everyone,
   *  so we allow access to avoid a false-negative. */
  isInSelectedPlan(): boolean {
    const plan = this.activePlan();
    const userId = this.auth.currentUser()?.id;
    if (!plan || !userId) return false;
    const ids = plan.selectedMemberIds;
    // If the plan has no selectedMemberIds recorded, treat everyone as included
    if (!ids || ids.length === 0) return true;
    return ids.includes(userId);
  }

  ngOnInit(): void {
    this.api.getActivePlan().subscribe({
      next: (plan) => {
        this.activePlan.set(plan);
        if (plan) {
          // Restore submitted state from localStorage
          this.donePlanning.set(localStorage.getItem(this.submitKey(plan.id)) === 'true');
          this.loadMyTasks(plan.id);
          this.loadBacklog();
          this.loadTeamDashboard(plan.id);
        }
      },
      error: () => this.toast.error('Failed to load active plan.')
    });
  }

  loadMyTasks(planId: string): void {
    const userId = this.auth.currentUser()!.id;
    this.api.getTasksByUser(planId, userId).subscribe({
      next: (tasks) => this.myTasks.set(tasks)
    });
  }

  loadBacklog(): void {
    this.api.getBacklog().subscribe({
      next: (items) => this.backlogItems.set(items)
    });
  }

  /** Load team-wide tasks for category claimed totals. */
  loadTeamDashboard(planId: string): void {
    this.api.getDashboard(planId).subscribe({
      next: (d) => this.teamDashboard.set(d),
      error: () => { /* non-critical — falls back to user tasks */ }
    });
  }

  // ── Computeds ──────────────────────────────────────────────────────────

  claimedHours(): number {
    return this.myTasks().reduce((s, t) => s + t.plannedHours, 0);
  }

  claimedHoursExcluding(taskId: string): number {
    return this.myTasks().filter(t => t.id !== taskId).reduce((s, t) => s + t.plannedHours, 0);
  }

  availableBacklog(): BacklogItem[] {
    const plannedIds = new Set(this.myTasks().map(t => t.backlogItemId));
    return this.backlogItems().filter(i => i.status === 'Available' && !plannedIds.has(i.id));
  }

  /** All Available backlog items shown in the picker — including ones already in MY plan. */
  allBacklogForPicker(): BacklogItem[] {
    return this.backlogItems().filter(i => i.status === 'Available');
  }

  /** True if I already have this backlog item in my plan. */
  isInMyPlan(backlogItemId: string): boolean {
    return this.myTasks().some(t => t.backlogItemId === backlogItemId);
  }

  /**
   * Category budget cards.
   * Budget = team total hours × (percent/100).
   * Claimed = TEAM-WIDE hours for that category (from dashboard).
   * This persists across user switches — when Alice claimed 10h in Client,
   * Bob also sees 10h claimed because the backend enforces team-level budget.
   */
  categoryCards() {
    const plan = this.activePlan();
    if (!plan) return [];
    const totalHours = plan.totalTeamHours || 30;
    const round = (n: number) => Math.round(n * 10) / 10;

    // Team-wide category claimed hours from dashboard
    const dash = this.teamDashboard();
    const teamCatMap = new Map<string, number>();
    if (dash) {
      for (const c of dash.categoryBreakdown) teamCatMap.set(c.category, c.plannedHours);
    } else {
      // Fallback to current user's tasks until dashboard loads
      for (const task of this.myTasks()) {
        const cat = task.category as string;
        teamCatMap.set(cat, (teamCatMap.get(cat) ?? 0) + task.plannedHours);
      }
    }

    return [
      {
        key: 'Client' as CategoryType,
        label: 'Client Focused',
        badgeClass: 'badge--client',
        budget: round(plan.clientPercent / 100 * totalHours),
        claimed: teamCatMap.get('Client') ?? 0,
        left: round(plan.clientPercent / 100 * totalHours - (teamCatMap.get('Client') ?? 0)),
      },
      {
        key: 'TechDebt' as CategoryType,
        label: 'Tech Debt',
        badgeClass: 'badge--techdebt',
        budget: round(plan.techDebtPercent / 100 * totalHours),
        claimed: teamCatMap.get('TechDebt') ?? 0,
        left: round(plan.techDebtPercent / 100 * totalHours - (teamCatMap.get('TechDebt') ?? 0)),
      },
      {
        key: 'RnD' as CategoryType,
        label: 'R&D',
        badgeClass: 'badge--rnd',
        budget: round(plan.rdPercent / 100 * totalHours),
        claimed: teamCatMap.get('RnD') ?? 0,
        left: round(plan.rdPercent / 100 * totalHours - (teamCatMap.get('RnD') ?? 0)),
      }
    ];
  }

  catBudgetLeft(cat: CategoryType): number {
    return this.categoryCards().find(c => c.key === cat)?.left ?? 0;
  }

  /** Format hours cleanly: whole numbers show as '15', decimals as '15.5' (no trailing zeros). */
  formatHours(h: number | null | undefined): string {
    if (h == null) return '0';
    return Number.isInteger(h) ? String(h) : h.toFixed(1).replace(/\.0$/, '');
  }

  /** True if any team member already has this backlog item in their plan. */
  isPickedByTeam(backlogItemId: string): boolean {
    return (this.teamDashboard()?.tasks ?? []).some(t => t.backlogItemId === backlogItemId);
  }

  /** Inline validation message for the pick-hours modal. Empty string = no error. */
  pickValidationError(): string {
    const h = this.pickHours;
    if (!h || h <= 0) return '';
    const left = 30 - this.claimedHours();
    if (h > left) {
      return `Assigning ${this.formatHours(h)}h would exceed your 30-hour limit. You have ${this.formatHours(left)}h left.`;
    }
    return '';
  }

  // ── Backlog picker ──────────────────────────────────────────────────────

  openPickModal(item: BacklogItem): void {
    this.pickingItem.set(item);
    this.pickHours = item.estimatedHours ?? 0;
  }

  closePickModal(): void {
    this.pickingItem.set(null);
    this.pickHours = 0;
  }

  addToMyPlan(): void {
    const plan = this.activePlan()!;
    const item = this.pickingItem()!;
    const hours = this.pickHours;    // capture BEFORE closePickModal resets to 0
    const title = item.title;
    this.saving.set(true);
    this.api.assignTask(plan.id, {
      backlogItemId: item.id,
      assignedUserId: this.auth.currentUser()!.id,
      plannedHours: hours
    }).subscribe({
      next: (task) => {
        this.myTasks.update(ts => [...ts, task]);
        this.closePickModal();
        this.saving.set(false);
        this.view.set('plan');
        this.toast.success(`Added! ${title} — ${this.formatHours(hours)}h`);
        this.loadTeamDashboard(plan.id);
      },
      error: (err) => {
        this.toast.error(err.error?.detail ?? 'Failed to assign task.');
        this.saving.set(false);
      }
    });
  }

  // ── Remove task ─────────────────────────────────────────────────────────

  removeTask(task: WeeklyPlanTask): void {
    const plan = this.activePlan()!;
    this.removingId.set(task.id);
    this.api.removeTask(plan.id, task.id).subscribe({
      next: () => {
        this.myTasks.update(list => list.filter(t => t.id !== task.id));
        this.removingId.set(null);
        this.toast.success(`"${task.backlogItemTitle}" removed from your plan.`);
        this.loadTeamDashboard(plan.id);  // refresh team-wide category claimed
      },
      error: (err) => {
        this.toast.error(err.error?.detail ?? 'Failed to remove task.');
        this.removingId.set(null);
      }
    });
  }

  // ── Change hours ────────────────────────────────────────────────────────

  startInlineEdit(task: WeeklyPlanTask): void {
    this.editingTaskId.set(task.id);
    this.inlineHoursVal = task.plannedHours;
    this.inlineEditError.set('');
  }

  cancelInlineEdit(): void {
    this.editingTaskId.set(null);
    this.inlineEditError.set('');
  }

  saveInlineHours(task: WeeklyPlanTask): void {
    const newHours = this.inlineHoursVal;
    if (!newHours || newHours <= 0) return;
    const maxAllowed = 30 - this.claimedHoursExcluding(task.id);
    if (newHours > maxAllowed) {
      this.inlineEditError.set(`You only have ${this.formatHours(maxAllowed)}h you can set here.`);
      return;
    }
    const plan = this.activePlan()!;
    this.saving.set(true);
    this.inlineEditError.set('');
    // Remove the task then re-add with new hours (same as before)
    this.api.removeTask(plan.id, task.id).subscribe({
      next: () => {
        this.api.assignTask(plan.id, {
          backlogItemId: task.backlogItemId,
          assignedUserId: this.auth.currentUser()!.id,
          plannedHours: newHours
        }).subscribe({
          next: (updated) => {
            this.myTasks.update(ts => ts.map(t => t.id === task.id ? updated : t));
            this.editingTaskId.set(null);
            this.saving.set(false);
            this.toast.success('Hours updated!');
            this.loadTeamDashboard(plan.id);
          },
          error: (err) => {
            this.inlineEditError.set(err.error?.detail ?? 'Failed to update hours.');
            this.saving.set(false);
          }
        });
      },
      error: (err) => {
        this.inlineEditError.set(err.error?.detail ?? 'Failed to update hours.');
        this.saving.set(false);
      }
    });
  }

  // ── I'm Done Planning ───────────────────────────────────────────────────

  markDone(): void {
    const planId = this.activePlan()?.id;
    if (planId) localStorage.setItem(this.submitKey(planId), 'true');
    this.donePlanning.set(true);
    this.toast.success("✅ You've marked yourself as done planning!");
  }

  undoDone(): void {
    const planId = this.activePlan()?.id;
    if (planId) localStorage.removeItem(this.submitKey(planId));
    this.donePlanning.set(false);
    this.toast.info("Marked as not done yet. You can continue planning.");
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  catLabel(cat: CategoryType): string { return CATEGORY_LABELS[cat] ?? cat; }
  catClass(cat: CategoryType): string { return CATEGORY_BADGE_CLASS[cat] ?? ''; }
}
