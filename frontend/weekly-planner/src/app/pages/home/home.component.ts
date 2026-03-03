import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { WeeklyPlan } from '../../core/models/models';
import { NavbarComponent } from '../../shared/navbar/navbar.component';

interface ActionCard {
  title: string;
  description: string;
  icon: string;
  route: string;
  style: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, NavbarComponent],
  template: `
    <app-navbar />
    <div class="page">
      <div class="container">
        @if (!auth.currentUser()) {
          <div class="alert alert--warning">Please log in first.</div>
        } @else {
          <div class="home-header">
            <div>
              <h1>What do you want to do?</h1>
              <p>Hi, <strong>{{ auth.currentUser()?.name }}</strong>
                @if (auth.isLead) {
                  <span class="badge badge--info" style="margin-left:8px;">Team Lead</span>
                }
              </p>
            </div>
            @if (activePlan()) {
              <div class="plan-status-chip" [class]="'plan-status--' + activePlan()!.status.toLowerCase()">
                <span class="status-dot"></span>
                Week {{ activePlan()!.status }}
              </div>
            }
          </div>

          @if (loading()) {
            <div class="text-center mt-xl"><div class="spinner"></div></div>
          } @else {

            <!-- Active week info banner -->
            @if (activePlan()) {
              <div class="week-banner mb-lg">
                <span>📅 Current Week: <strong>{{ formatDate(activePlan()!.weekStartDate) }}</strong>
                  → <strong>{{ formatDate(activePlan()!.weekEndDate) }}</strong></span>
                <span class="text-secondary text-sm">
                  Client {{ activePlan()!.clientPercent }}% · TechDebt {{ activePlan()!.techDebtPercent }}% · R&amp;D {{ activePlan()!.rdPercent }}%
                </span>
              </div>
            } @else {
              <div class="alert alert--warning mb-lg">
                ⚠️ No active planning week. {{ auth.isLead ? 'Start a new week below.' : 'Ask your Team Lead to start the week.' }}
              </div>
            }

            <div class="grid-cards">
              <!-- Regular navigation cards -->
              @for (card of visibleCards(); track card.route) {
                <a [routerLink]="card.route" class="card card--clickable action-card action-card--{{ card.style }}">
                  <div class="action-card__icon">{{ card.icon }}</div>
                  <h3>{{ card.title }}</h3>
                  <p>{{ card.description }}</p>
                </a>
              }

              <!-- Cancel Planning — destructive card (leads only, planning status only) -->
              @if (auth.isLead && activePlan()?.status === 'Planning') {
                <div class="card card--clickable action-card action-card--danger"
                  (click)="confirmCancel()">
                  <div class="action-card__icon">🗑️</div>
                  <h3>Cancel This Week's Planning</h3>
                  <p>Erase all plans and start over.</p>
                </div>
              }
            </div>
          }
        }
      </div>
    </div>

    <!-- ── Data Management Bottom Bar ──────────────────────────────────── -->
    <!-- Hidden file input for Load from File -->
    <input #fileInput type="file" accept=".json" style="display:none"
      (change)="onFileSelected($event)" />

    <div class="data-controls-bar">
      <button class="btn btn--ghost btn--sm" [disabled]="adminBusy()" (click)="downloadData()">
        📥 Download My Data
      </button>
      <button class="btn btn--ghost btn--sm" [disabled]="adminBusy()" (click)="fileInput.click()">
        📂 Load Data from File
      </button>
      <button class="btn btn--ghost btn--sm" [disabled]="adminBusy()" (click)="confirmSeed()">
        🌱 Seed Sample Data
      </button>
      <button class="btn btn--ghost-danger btn--sm" [disabled]="adminBusy()" (click)="confirmReset()">
        🗑️ Reset App
      </button>
    </div>

    <!-- Cancel confirmation modal -->
    @if (showCancelModal()) {
      <div class="modal-overlay" (click)="showCancelModal.set(false)">
        <div class="modal-box" (click)="$event.stopPropagation()">
          <h3 style="color: var(--status-error);">🗑️ Cancel This Week's Planning?</h3>
          <p style="color: var(--text-secondary); margin: var(--space-md) 0;">
            This will <strong>permanently delete</strong> the current weekly plan and all tasks assigned to it.
            Everyone will lose their planned work. This action <strong>cannot be undone</strong>.
          </p>
          <div class="flex gap-md justify-end" style="margin-top: var(--space-lg);">
            <button class="btn btn--secondary" (click)="showCancelModal.set(false)">Keep Planning</button>
            <button class="btn btn--danger-solid" [disabled]="cancelling()" (click)="cancelPlan()">
              @if (cancelling()) { <span class="spinner"></span> } @else { Yes, Erase Everything }
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Seed confirmation modal -->
    @if (showSeedModal()) {
      <div class="modal-overlay" (click)="showSeedModal.set(false)">
        <div class="modal-box" (click)="$event.stopPropagation()">
          <h3>🌱 Seed Sample Data?</h3>
          <p style="color: var(--text-secondary); margin: var(--space-md) 0;">
            This will <strong>clear all existing data</strong> and populate the app with realistic sample
            team members and backlog items matching the demo application. You will be logged out.
          </p>
          <div class="flex gap-md justify-end" style="margin-top: var(--space-lg);">
            <button class="btn btn--secondary" (click)="showSeedModal.set(false)">Cancel</button>
            <button class="btn btn--primary" [disabled]="adminBusy()" (click)="seedData()">
              @if (adminBusy()) { <span class="spinner"></span> } @else { Yes, Seed Data }
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Reset confirmation modal -->
    @if (showResetModal()) {
      <div class="modal-overlay" (click)="showResetModal.set(false)">
        <div class="modal-box" (click)="$event.stopPropagation()">
          <h3 style="color: var(--status-error);">⚠️ Reset the Entire App?</h3>
          <p style="color: var(--text-secondary); margin: var(--space-md) 0;">
            This will <strong>permanently delete ALL data</strong> — users, backlog items, all plans and tasks.
            The app will return to the initial onboarding screen. <strong>This cannot be undone.</strong>
          </p>
          <div style="background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.3); border-radius:8px; padding:0.75rem 1rem; margin-bottom:1rem;">
            <p style="margin:0; font-size:0.85rem; color:#f87171;">Type <strong>RESET</strong> to confirm:</p>
            <input class="form-control" style="margin-top:0.5rem;" [(ngModel)]="resetConfirmText"
              placeholder="RESET" />
          </div>
          <div class="flex gap-md justify-end">
            <button class="btn btn--secondary" (click)="showResetModal.set(false)">Cancel</button>
            <button class="btn btn--danger-solid" [disabled]="adminBusy() || resetConfirmText !== 'RESET'" (click)="resetApp()">
              @if (adminBusy()) { <span class="spinner"></span> } @else { Permanently Reset }
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .home-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: var(--space-xl);
      flex-wrap: wrap;
      gap: var(--space-md);
    }

    .plan-status-chip {
      display: flex; align-items: center; gap: var(--space-sm);
      padding: 0.5rem 1rem; border-radius: 999px;
      font-size: 0.85rem; font-weight: 600; border: 1px solid;
    }

    .plan-status--planning  { background: rgba(79,142,247,0.1);  color: var(--accent);         border-color: rgba(79,142,247,0.3); }
    .plan-status--frozen    { background: rgba(168,85,247,0.1);   color: #c084fc;               border-color: rgba(168,85,247,0.3); }
    .plan-status--completed { background: rgba(34,197,94,0.1);    color: var(--status-success); border-color: rgba(34,197,94,0.3); }

    .status-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: currentColor;
      animation: pulse 2s ease-in-out infinite;
    }

    .week-banner {
      display: flex; justify-content: space-between; align-items: center;
      flex-wrap: wrap; gap: var(--space-sm);
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: var(--border-radius); padding: var(--space-md) var(--space-lg);
      font-size: 0.9rem;
    }

    .action-card {
      display: flex; flex-direction: column; gap: var(--space-sm);
      min-height: 160px; text-decoration: none; color: inherit;
      transition: all 0.25s ease;
      cursor: pointer;
      &:hover { transform: translateY(-3px); }
    }

    .action-card__icon { font-size: 2rem; margin-bottom: var(--space-sm); }
    .action-card h3 { margin-bottom: var(--space-xs); }
    .action-card p  { font-size: 0.85rem; color: var(--text-secondary); flex: 1; }

    .action-card--primary   { border-top: 3px solid var(--accent); }
    .action-card--success   { border-top: 3px solid var(--status-success); }
    .action-card--warning   { border-top: 3px solid var(--status-warning); }
    .action-card--secondary { border-top: 3px solid var(--text-muted); }
    .action-card--danger    {
      border-top: 3px solid var(--status-error);
      border: 1px solid rgba(239,68,68,0.4);
      background: rgba(239,68,68,0.05);
      h3 { color: var(--status-error); }
    }

    /* Modal */
    .modal-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.6);
      display: flex; align-items: center; justify-content: center;
      z-index: 200; padding: var(--space-lg);
    }
    .modal-box {
      background: var(--bg-card); border: 1px solid rgba(239,68,68,0.3);
      border-radius: var(--border-radius-lg); padding: var(--space-xl);
      max-width: 460px; width: 100%;
      box-shadow: 0 8px 40px rgba(0,0,0,0.5);
      animation: fadeUp 0.2s ease;
    }

    .btn--danger-solid {
      background: var(--status-error); color: white; border: none;
      padding: 0.6rem 1.2rem; border-radius: var(--border-radius);
      font-weight: 600; cursor: pointer;
      &:disabled { opacity: 0.5; cursor: not-allowed; }
      &:hover:not(:disabled) { background: #dc2626; }
    }

    .btn--ghost {
      background: transparent; border: 1px solid var(--border);
      color: var(--text-secondary); font-size: 0.78rem; padding: 0.4rem 0.85rem;
      border-radius: var(--border-radius); cursor: pointer; transition: all 0.15s;
      white-space: nowrap;
      &:hover:not(:disabled) { background: var(--bg-card); color: var(--text-primary); border-color: var(--accent); }
      &:disabled { opacity: 0.4; cursor: not-allowed; }
    }
    .btn--ghost-danger {
      background: transparent; border: 1px solid rgba(239,68,68,0.3);
      color: #f87171; font-size: 0.78rem; padding: 0.4rem 0.85rem;
      border-radius: var(--border-radius); cursor: pointer; transition: all 0.15s;
      white-space: nowrap;
      &:hover:not(:disabled) { background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.6); }
      &:disabled { opacity: 0.4; cursor: not-allowed; }
    }
    .data-controls-bar {
      position: fixed; bottom: 0; left: 0; right: 0;
      display: flex; justify-content: center; gap: var(--space-sm); flex-wrap: wrap;
      padding: 0.6rem 1rem;
      background: var(--bg-card); border-top: 1px solid var(--border);
      z-index: 100;
    }

    @keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(10px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class HomeComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly activePlan = signal<WeeklyPlan | null>(null);
  readonly loading = signal(true);
  readonly showCancelModal = signal(false);
  readonly cancelling = signal(false);

  // Data management
  readonly adminBusy = signal(false);
  readonly showSeedModal = signal(false);
  readonly showResetModal = signal(false);
  resetConfirmText = '';

  ngOnInit(): void {
    if (!this.auth.currentUser()) {
      this.router.navigate(['/login']);
      return;
    }

    this.api.getActivePlan().subscribe({
      next: (plan) => { this.activePlan.set(plan); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  visibleCards(): ActionCard[] {
    const status = this.activePlan()?.status ?? null;
    const isLead = this.auth.isLead;
    const cards: ActionCard[] = [];

    // Lead: Start new week (only when no active plan)
    if (isLead && !status)
      cards.push({ title: 'Set Up This Week\'s Plan', description: 'Set dates, team members, and category budgets for the upcoming work cycle.', icon: '🗓️', route: '/week/setup', style: 'primary' });

    // Any member in Planning: plan their work
    if (status === 'Planning')
      cards.push({ title: 'Plan My Work', description: 'Pick backlog items and commit hours.', icon: '✍️', route: '/week/plan', style: 'primary' });

    // Lead in Planning: review and freeze
    if (isLead && status === 'Planning')
      cards.push({ title: 'Review and Freeze the Plan', description: 'Check everyone\'s hours and lock the plan.', icon: '❄️', route: '/week/review', style: 'warning' });

    // Member in Frozen: update progress
    if (status === 'Frozen')
      cards.push({ title: 'Update My Progress', description: 'Report completed hours on each task.', icon: '📊', route: '/week/progress', style: 'success' });

    // Lead in Frozen: complete the week
    if (isLead && status === 'Frozen')
      cards.push({ title: 'Team Progress', description: 'View overall dashboard and mark the week complete.', icon: '🏆', route: '/week/team-progress', style: 'success' });

    // Always visible
    cards.push({ title: 'Manage Backlog', description: 'Add, edit, or browse work items.', icon: '📋', route: '/backlog', style: 'secondary' });

    if (isLead)
      cards.push({ title: 'Manage Team Members', description: 'Add or remove team members.', icon: '👥', route: '/team', style: 'secondary' });

    cards.push({ title: 'View Past Weeks', description: 'Look at completed planning cycles.', icon: '📅', route: '/past-weeks', style: 'secondary' });

    return cards;
  }

  confirmCancel(): void {
    this.showCancelModal.set(true);
  }

  cancelPlan(): void {
    const plan = this.activePlan();
    if (!plan) return;
    this.cancelling.set(true);
    this.api.cancelPlan(plan.id).subscribe({
      next: () => {
        this.activePlan.set(null);
        this.showCancelModal.set(false);
        this.cancelling.set(false);
        this.toast.success('Planning cancelled. You can start fresh! 🔄');
      },
      error: (err) => {
        this.toast.error(err.error?.detail ?? 'Failed to cancel plan.');
        this.cancelling.set(false);
      }
    });
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  }

  // ── Data Management ──────────────────────────────────────────────────────

  downloadData(): void {
    this.adminBusy.set(true);
    this.api.exportData().subscribe({
      next: (data) => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `weekly-planner-backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.adminBusy.set(false);
        this.toast.success('Data downloaded successfully! 📥');
      },
      error: () => { this.adminBusy.set(false); this.toast.error('Export failed.'); }
    });
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        this.adminBusy.set(true);
        this.api.importData(data).subscribe({
          next: () => {
            this.adminBusy.set(false);
            this.toast.success('Data loaded successfully! The app will reload.');
            this.auth.clearUser();
            setTimeout(() => this.router.navigate(['/onboarding']), 800);
          },
          error: (err) => {
            this.adminBusy.set(false);
            this.toast.error(err.error?.detail ?? 'Import failed. Check the file format.');
          }
        });
      } catch {
        this.toast.error('Invalid JSON file. Please select a valid backup file.');
      }
      // Reset file input so same file can be loaded again
      (event.target as HTMLInputElement).value = '';
    };
    reader.readAsText(file);
  }

  confirmSeed(): void { this.showSeedModal.set(true); }
  confirmReset(): void { this.resetConfirmText = ''; this.showResetModal.set(true); }

  seedData(): void {
    this.adminBusy.set(true);
    this.api.seedSampleData().subscribe({
      next: () => {
        this.adminBusy.set(false);
        this.showSeedModal.set(false);
        this.toast.success('Sample data seeded! 🌱 Redirecting to onboarding...');
        this.auth.clearUser();
        setTimeout(() => this.router.navigate(['/onboarding']), 800);
      },
      error: () => { this.adminBusy.set(false); this.toast.error('Seed failed.'); }
    });
  }

  resetApp(): void {
    if (this.resetConfirmText !== 'RESET') return;
    this.adminBusy.set(true);
    this.api.resetApp().subscribe({
      next: () => {
        this.adminBusy.set(false);
        this.showResetModal.set(false);
        this.toast.success('App reset! All data cleared. Redirecting to onboarding...');
        this.auth.clearUser();
        setTimeout(() => this.router.navigate(['/onboarding']), 800);
      },
      error: () => { this.adminBusy.set(false); this.toast.error('Reset failed.'); }
    });
  }
}
