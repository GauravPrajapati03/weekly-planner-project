import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/services/auth.service';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { User } from '../../core/models/models';

@Component({
  selector: 'app-week-setup',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent],
  template: `
    <app-navbar />
    <div class="page">
      <div class="container" style="max-width: 720px;">
        <button class="btn btn--ghost btn--sm mb-sm" (click)="router.navigate(['/home'])">← Home</button>
        <h2 class="mb-lg">Set Up This Week's Plan</h2>

        @if (!auth.isLead) {
          <div class="alert alert--warning">Only the Team Lead can set up a new week.</div>
        } @else if (existingPlan()) {
          <div class="alert alert--info">
            ℹ️ An active plan already exists (status: <strong>{{ existingPlan()?.status }}</strong>).
            Complete or freeze it before starting a new week.
          </div>
        } @else if (loadingUsers()) {
          <div class="text-center mt-xl"><div class="spinner"></div></div>
        } @else {

          <!-- ── Section 1: Planning Date ─────────────────────────────────── -->
          <div class="setup-section">
            <h4 class="section-title">Planning date (pick a Tuesday)</h4>
            <input type="date" class="form-control date-input"
              [(ngModel)]="tuesdayDate"
              (ngModelChange)="onDateChange()" />
            @if (workPeriod() && isTuesday()) {
              <p class="work-period-label">Work period: {{ workPeriod() }}</p>
            }
            @if (tuesdayDate && !isTuesday()) {
              <p class="error-msg">⚠️ Please pick a Tuesday for the planning day.</p>
            }
          </div>

          <!-- ── Section 2: Who is working ──────────────────────────────── -->
          <div class="setup-section">
            <h4 class="section-title">Who is working this week?</h4>
            @for (user of activeUsers(); track user.id) {
              <label class="member-check">
                <input type="checkbox"
                  [checked]="isSelected(user.id)"
                  (change)="toggleMember(user.id, $event)" />
                <span class="member-name">{{ user.name }}</span>
                @if (user.role === 'TeamLead') {
                  <span class="lead-badge">Lead</span>
                }
              </label>
            }
            <p class="member-summary">
              Team members selected: <strong>{{ selectedCount() }}</strong>.&nbsp;
              Total hours to plan: <strong>{{ totalTeamHours() }}</strong>
            </p>
          </div>

          <!-- ── Section 3: Category split ──────────────────────────────── -->
          <div class="setup-section">
            <h4 class="section-title">How should the hours be split?</h4>
            <div class="split-grid">
              <div class="split-item">
                <label class="form-label">Client Focused %</label>
                <input type="number" class="form-control" [(ngModel)]="clientPct"
                  min="0" max="100" (ngModelChange)="recalc()" />
              </div>
              <div class="split-item">
                <label class="form-label">Tech Debt %</label>
                <input type="number" class="form-control" [(ngModel)]="techPct"
                  min="0" max="100" (ngModelChange)="recalc()" />
              </div>
              <div class="split-item">
                <label class="form-label">R&amp;D %</label>
                <input type="number" class="form-control" [(ngModel)]="rdPct"
                  min="0" max="100" (ngModelChange)="recalc()" />
              </div>
            </div>

            <!-- Total row -->
            <div class="total-row">
              @if (total() !== 100) {
                <span class="total-bad">Total: {{ total() }}% (must be 100%)</span>
              } @else {
                <span class="total-ok">Total: 100% ✓</span>
              }
            </div>

            <!-- Calculated hours — only shown when total = 100 and members selected -->
            @if (total() === 100 && selectedCount() > 0) {
              <div class="hours-row">
                <div class="hours-chip hours-chip--client">
                  <span class="hours-chip__label">Client</span>
                  <span class="hours-chip__val">{{ clientHours() }}h</span>
                </div>
                <div class="hours-chip hours-chip--tech">
                  <span class="hours-chip__label">Tech Debt</span>
                  <span class="hours-chip__val">{{ techHours() }}h</span>
                </div>
                <div class="hours-chip hours-chip--rnd">
                  <span class="hours-chip__label">R&amp;D</span>
                  <span class="hours-chip__val">{{ rdHours() }}h</span>
                </div>
              </div>
            }
          </div>

          <!-- ── Submit ────────────────────────────────────────────────── -->
          <button class="btn btn--primary btn--full"
            [disabled]="!canSubmit() || saving()"
            (click)="create()">
            @if (saving()) { <span class="spinner"></span>&nbsp;Opening... }
            @else { Open Planning for the Team }
          </button>

          @if (!isTuesday() && tuesdayDate) {
            <p class="hint-msg">Select a Tuesday as the planning date.</p>
          } @else if (selectedCount() === 0) {
            <p class="hint-msg">Select at least one team member.</p>
          } @else if (total() !== 100) {
            <p class="hint-msg">Category percentages must add up to 100%.</p>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .setup-section {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--border-radius-lg);
      padding: var(--space-lg);
      margin-bottom: var(--space-lg);
    }
    .section-title {
      font-size: 1rem; font-weight: 600; margin: 0 0 var(--space-md);
    }
    .date-input { max-width: 220px; }

    .work-period-label {
      margin-top: var(--space-sm); font-size: 0.84rem; color: var(--text-secondary);
    }
    .error-msg {
      margin-top: var(--space-sm); font-size: 0.84rem; color: var(--status-error, #e74c3c);
    }

    /* Member checkboxes */
    .member-check {
      display: flex; align-items: center; gap: var(--space-sm);
      padding: 6px 0; cursor: pointer; user-select: none;
    }
    .member-check input[type=checkbox] {
      width: 16px; height: 16px; accent-color: var(--accent); cursor: pointer;
    }
    .member-name { font-weight: 500; }
    .lead-badge {
      font-size: 0.65rem; padding: 2px 8px;
      border: 1px solid var(--accent); border-radius: 999px;
      color: var(--accent); font-weight: 600;
    }
    .member-summary {
      margin-top: var(--space-md); font-size: 0.85rem; color: var(--text-secondary);
      padding-top: var(--space-md); border-top: 1px solid var(--border);
    }

    /* Category split */
    .split-grid {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-md);
    }
    @media (max-width: 600px) { .split-grid { grid-template-columns: 1fr; } }
    .split-item { display: flex; flex-direction: column; gap: var(--space-sm); }

    .total-row { margin-top: var(--space-md); }
    .total-bad { color: var(--status-error, #e74c3c); font-weight: 600; font-size: 0.95rem; }
    .total-ok  { color: var(--status-success, #27ae60); font-weight: 600; font-size: 0.95rem; }

    /* Calculated hours chips */
    .hours-row {
      display: flex; gap: var(--space-md); flex-wrap: wrap;
      margin-top: var(--space-lg);
    }
    .hours-chip {
      flex: 1; min-width: 80px;
      border-radius: var(--border-radius-lg);
      padding: var(--space-md) var(--space-lg);
      display: flex; flex-direction: column; gap: 4px;
    }
    .hours-chip--client  { background: rgba(52,152,219,0.15); border: 1px solid rgba(52,152,219,0.4); }
    .hours-chip--tech    { background: rgba(230,126,34,0.15);  border: 1px solid rgba(230,126,34,0.4); }
    .hours-chip--rnd     { background: rgba(155,89,182,0.15);  border: 1px solid rgba(155,89,182,0.4); }
    .hours-chip__label { font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; font-weight: 600; }
    .hours-chip__val   { font-size: 1.5rem; font-weight: 700; color: var(--text-primary); }

    .btn--full { width: 100%; height: 50px; font-size: 1rem; font-weight: 600; }
    .hint-msg  { text-align: center; font-size: 0.84rem; color: var(--text-secondary); margin-top: var(--space-sm); }
  `]
})
export class WeekSetupComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly router = inject(Router);
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  readonly existingPlan = signal<any>(null);
  readonly saving = signal(false);
  readonly loadingUsers = signal(true);
  readonly activeUsers = signal<User[]>([]);

  // Date — no minDate restriction, all Tuesdays selectable
  tuesdayDate = '';

  // Member selection — use a signal-tracked array of selected IDs for reactivity
  private _selectedIds = signal<Set<string>>(new Set<string>());

  // Category %
  clientPct = 0;
  techPct = 0;
  rdPct = 0;

  readonly total = signal(0);

  selectedCount() { return this._selectedIds().size; }

  /** 30h per person × selected members */
  totalTeamHours() { return this._selectedIds().size * 30; }

  clientHours() { return Math.round(this.clientPct / 100 * this.totalTeamHours() * 10) / 10; }
  techHours() { return Math.round(this.techPct / 100 * this.totalTeamHours() * 10) / 10; }
  rdHours() { return Math.round(this.rdPct / 100 * this.totalTeamHours() * 10) / 10; }

  ngOnInit(): void {
    this.recalc();
    this.tuesdayDate = this.nearestTuesday();

    this.api.getActivePlan().subscribe({
      next: (plan) => this.existingPlan.set(plan),
      error: () => { }
    });

    this.api.getUsers().subscribe({
      next: (users) => {
        this.activeUsers.set(users);
        // All active members selected by default
        const ids = new Set<string>(users.map(u => u.id));
        this._selectedIds.set(ids);
        this.loadingUsers.set(false);
      },
      error: () => this.loadingUsers.set(false)
    });
  }

  isTuesday(): boolean {
    if (!this.tuesdayDate) return false;
    const [y, m, d] = this.tuesdayDate.split('-').map(Number);
    return new Date(y, m - 1, d).getDay() === 2;
  }

  onDateChange(): void { /* template drives workPeriod() */ }

  workPeriod(): string {
    if (!this.tuesdayDate || !this.isTuesday()) return '';
    const [y, m, d] = this.tuesdayDate.split('-').map(Number);
    const tue = new Date(y, m - 1, d);
    const wed = new Date(tue); wed.setDate(tue.getDate() + 1);
    const mon = new Date(tue); mon.setDate(tue.getDate() + 6);
    const fmt = (dt: Date) => {
      const yy = dt.getFullYear();
      const mm = String(dt.getMonth() + 1).padStart(2, '0');
      const dd = String(dt.getDate()).padStart(2, '0');
      return `${yy}-${mm}-${dd}`;
    };
    return `${fmt(wed)} to ${fmt(mon)}`;
  }

  /** Returns the most recent Tuesday on or before today (using local date, not UTC) */
  nearestTuesday(): string {
    const today = new Date();
    const day = today.getDay(); // 0=Sun 1=Mon 2=Tue ...
    const offset = day >= 2 ? day - 2 : day + 5; // days since last Tuesday
    const tue = new Date(today);
    tue.setDate(today.getDate() - offset);
    const yy = tue.getFullYear();
    const mm = String(tue.getMonth() + 1).padStart(2, '0');
    const dd = String(tue.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  }

  toggleMember(id: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const current = new Set<string>(this._selectedIds());
    if (checked) current.add(id);
    else current.delete(id);
    this._selectedIds.set(current);
  }

  isSelected(id: string): boolean {
    return this._selectedIds().has(id);
  }

  recalc(): void {
    this.total.set((this.clientPct || 0) + (this.techPct || 0) + (this.rdPct || 0));
  }

  canSubmit(): boolean {
    return this.isTuesday() && this.selectedCount() > 0 && this.total() === 100;
  }

  create(): void {
    if (!this.canSubmit()) return;
    this.saving.set(true);

    const [y, m, d] = this.tuesdayDate.split('-').map(Number);
    const tue = new Date(y, m - 1, d);
    const wed = new Date(tue);
    wed.setDate(tue.getDate() + 1);
    // Use local date formatting to avoid timezone off-by-one (toISOString converts to UTC)
    const wy = wed.getFullYear();
    const wm = String(wed.getMonth() + 1).padStart(2, '0');
    const wd = String(wed.getDate()).padStart(2, '0');
    const weekStartDate = `${wy}-${wm}-${wd}`;

    this.api.createPlan({
      weekStartDate,
      clientPercent: this.clientPct,
      techDebtPercent: this.techPct,
      rdPercent: this.rdPct,
      totalTeamHours: this.totalTeamHours(),
      selectedMemberIds: Array.from(this._selectedIds())
    }).subscribe({
      next: () => {
        this.toast.success('🚀 Week opened for planning! Team can now plan their work.');
        this.router.navigate(['/home']);
      },
      error: (err) => {
        this.toast.error(err.error?.detail ?? 'Failed to create plan.');
        this.saving.set(false);
      }
    });
  }
}
