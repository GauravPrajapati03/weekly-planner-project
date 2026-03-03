import { Component, inject, OnInit, signal, computed } from '@angular/core';
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
        <div class="flex items-center gap-sm mb-sm">
          <button class="btn btn--secondary btn--sm" (click)="router.navigate(['/home'])">← Home</button>
        </div>
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

          <!-- ── Section 1: Planning Date ────────────────────────────────────── -->
          <div class="setup-section">
            <h4 class="section-title">📅 Planning date <span class="hint">(pick a Tuesday)</span></h4>
            <input type="date" class="form-control date-input"
              [(ngModel)]="tuesdayDate"
              (ngModelChange)="onDateChange()"
              [min]="minDate" />
            @if (workPeriod()) {
              <p class="work-period-label">Work period: <strong>{{ workPeriod() }}</strong></p>
            }
            @if (tuesdayDate && !isTuesday()) {
              <p class="error-hint">⚠️ Please pick a Tuesday for planning day.</p>
            }
          </div>

          <!-- ── Section 2: Who is working ─────────────────────────────────── -->
          <div class="setup-section">
            <h4 class="section-title">👥 Who is working this week?</h4>
            @for (user of activeUsers(); track user.id) {
              <label class="member-check">
                <input type="checkbox"
                  [checked]="isSelected(user.id)"
                  (change)="toggleMember(user.id)" />
                <span class="member-name">{{ user.name }}</span>
                @if (user.role === 'TeamLead') {
                  <span class="badge badge--info" style="font-size:0.65rem; padding:2px 8px;">Lead</span>
                }
              </label>
            }
            <p class="member-summary">
              Team members selected: <strong>{{ selectedCount() }}</strong>.
              &nbsp; Total hours to plan: <strong>{{ totalTeamHours() }}</strong>
            </p>
          </div>

          <!-- ── Section 3: Category split ─────────────────────────────────── -->
          <div class="setup-section">
            <h4 class="section-title">⚖️ How should the hours be split?</h4>
            <div class="split-grid">
              <div class="split-item">
                <label class="form-label">Client Focused %</label>
                <input type="number" class="form-control" [(ngModel)]="clientPct"
                  min="0" max="100" (ngModelChange)="recalc()" />
                <div class="split-hours">= {{ clientHours() }}h</div>
              </div>
              <div class="split-item">
                <label class="form-label">Tech Debt %</label>
                <input type="number" class="form-control" [(ngModel)]="techPct"
                  min="0" max="100" (ngModelChange)="recalc()" />
                <div class="split-hours">= {{ techHours() }}h</div>
              </div>
              <div class="split-item">
                <label class="form-label">R&amp;D %</label>
                <input type="number" class="form-control" [(ngModel)]="rdPct"
                  min="0" max="100" (ngModelChange)="recalc()" />
                <div class="split-hours">= {{ rdHours() }}h</div>
              </div>
            </div>

            <!-- Total indicator -->
            <div class="total-row" [class.total-row--err]="total() !== 100">
              <span [style.color]="total() !== 100 ? 'var(--status-error)' : 'var(--status-success)'">
                Total: <strong>{{ total() }}%</strong>
                @if (total() !== 100) { (must be 100%) }
              </span>
            </div>
          </div>

          <!-- ── Submit ──────────────────────────────────────────────────────── -->
          <button class="btn btn--primary btn--full"
            [disabled]="!canSubmit() || saving()"
            (click)="create()">
            @if (saving()) { <span class="spinner"></span> Opening... }
            @else { Open Planning for the Team }
          </button>

          @if (!isTuesday() && tuesdayDate) {
            <p class="text-sm text-muted text-center mt-md">Choose a Tuesday as the planning date.</p>
          } @else if (selectedCount() === 0) {
            <p class="text-sm text-muted text-center mt-md">Select at least one team member.</p>
          } @else if (total() !== 100) {
            <p class="text-sm text-muted text-center mt-md">Category percentages must add up to 100%.</p>
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
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: var(--space-md);
    }

    .hint {
      font-size: 0.8rem;
      font-weight: 400;
      color: var(--text-muted);
    }

    .date-input { max-width: 260px; }

    .work-period-label {
      margin-top: var(--space-sm);
      font-size: 0.84rem;
      color: var(--text-secondary);
    }

    .error-hint {
      margin-top: var(--space-sm);
      font-size: 0.84rem;
      color: var(--status-error);
    }

    .member-check {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      padding: var(--space-sm) 0;
      cursor: pointer;
      user-select: none;
    }

    .member-check input[type=checkbox] {
      width: 16px;
      height: 16px;
      accent-color: var(--accent);
      cursor: pointer;
    }

    .member-name { font-weight: 500; }

    .member-summary {
      margin-top: var(--space-md);
      font-size: 0.85rem;
      color: var(--text-secondary);
      padding-top: var(--space-md);
      border-top: 1px solid var(--border);
    }

    .split-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: var(--space-md);
    }
    @media (max-width: 600px) { .split-grid { grid-template-columns: 1fr; } }

    .split-item { display: flex; flex-direction: column; gap: var(--space-sm); }

    .split-hours {
      font-size: 1rem;
      font-weight: 700;
      color: var(--accent);
    }

    .total-row {
      margin-top: var(--space-md);
      padding: var(--space-sm) var(--space-md);
      background: var(--bg-input);
      border-radius: var(--border-radius);
    }

    .total-row--err { color: var(--status-error); }

    .btn--full { width: 100%; height: 50px; font-size: 1rem; font-weight: 600; }
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

  // Date
  tuesdayDate = '';
  minDate = new Date().toISOString().split('T')[0];

  // Member selection
  selectedIds = new Set<number>();

  // Category %
  clientPct = 0;
  techPct = 0;
  rdPct = 0;

  readonly total = signal(0);
  readonly selectedCount = computed(() => this.selectedIds.size);

  /** 30h per person × number of selected members */
  readonly totalTeamHours = computed(() => this.selectedIds.size * 30);

  /** Per-category hours based on TOTAL team hours (not single person) */
  readonly clientHours = computed(() => Math.round(this.clientPct / 100 * this.totalTeamHours() * 10) / 10);
  readonly techHours = computed(() => Math.round(this.techPct / 100 * this.totalTeamHours() * 10) / 10);
  readonly rdHours = computed(() => Math.round(this.rdPct / 100 * this.totalTeamHours() * 10) / 10);

  ngOnInit(): void {
    this.recalc();
    // Set default to next Tuesday
    this.tuesdayDate = this.getNextTuesday();
    this.onDateChange();

    this.api.getActivePlan().subscribe({
      next: (plan) => this.existingPlan.set(plan),
      error: () => { }
    });

    this.api.getUsers().subscribe({
      next: (users) => {
        this.activeUsers.set(users);
        // All active members selected by default
        users.forEach(u => this.selectedIds.add(u.id));
        this.loadingUsers.set(false);
      },
      error: () => this.loadingUsers.set(false)
    });
  }

  isTuesday(): boolean {
    if (!this.tuesdayDate) return false;
    // Parse as local date to avoid timezone off-by-one
    const [y, m, d] = this.tuesdayDate.split('-').map(Number);
    return new Date(y, m - 1, d).getDay() === 2; // 2 = Tuesday
  }

  onDateChange(): void {
    // no extra logic needed — workPeriod() is computed
  }

  workPeriod(): string {
    if (!this.tuesdayDate || !this.isTuesday()) return '';
    const [y, m, d] = this.tuesdayDate.split('-').map(Number);
    const tuesday = new Date(y, m - 1, d);
    // Work period: Wed (tuesday+1) to Mon (tuesday+6)
    const wed = new Date(tuesday); wed.setDate(tuesday.getDate() + 1);
    const mon = new Date(tuesday); mon.setDate(tuesday.getDate() + 6);
    const fmt = (dt: Date) => dt.toISOString().split('T')[0];
    return `${fmt(wed)} to ${fmt(mon)}`;
  }

  getNextTuesday(): string {
    const today = new Date();
    const day = today.getDay();
    const daysUntilTuesday = (2 - day + 7) % 7 || 7; // 2 = Tuesday; if today is Tuesday, go to next Tuesday
    const next = new Date(today);
    next.setDate(today.getDate() + daysUntilTuesday);
    return next.toISOString().split('T')[0];
  }

  toggleMember(id: number): void {
    if (this.selectedIds.has(id)) this.selectedIds.delete(id);
    else this.selectedIds.add(id);
    // Trigger signal update for computed
    this.selectedIds = new Set(this.selectedIds);
  }

  isSelected(id: number): boolean {
    return this.selectedIds.has(id);
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

    // The weekStartDate sent to backend is the Wednesday (tuesday+1)
    const [y, m, d] = this.tuesdayDate.split('-').map(Number);
    const tuesday = new Date(y, m - 1, d);
    const wednesday = new Date(tuesday);
    wednesday.setDate(tuesday.getDate() + 1);
    const weekStartDate = wednesday.toISOString().split('T')[0];

    this.api.createPlan({
      weekStartDate,
      clientPercent: this.clientPct,
      techDebtPercent: this.techPct,
      rdPercent: this.rdPct
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
