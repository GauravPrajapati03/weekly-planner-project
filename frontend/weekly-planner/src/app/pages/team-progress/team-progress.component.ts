import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { Dashboard, CATEGORY_LABELS, CATEGORY_BADGE_CLASS, CategoryType } from '../../core/models/models';
import { NavbarComponent } from '../../shared/navbar/navbar.component';

@Component({
  selector: 'app-team-progress',
  standalone: true,
  imports: [CommonModule, NavbarComponent],
  template: `
    <app-navbar />
    <div class="page">
      <div class="container">
        <div class="flex items-center justify-between mb-lg" style="flex-wrap:wrap; gap:1rem;">
          <h2>🏆 Team Progress</h2>
          @if (auth.isLead && planId()) {
            <button class="btn btn--success" [disabled]="completing()" (click)="confirmComplete = true">
              @if (completing()) { <span class="spinner"></span> } @else { ✅ Mark Week Complete }
            </button>
          }
        </div>

        @if (loading()) {
          <div class="text-center mt-xl"><div class="spinner"></div></div>
        } @else if (!dashboard()) {
          <div class="alert alert--warning">No frozen or active plan available.</div>
        } @else {

          <!-- Overall stats -->
          <div class="stats-grid mb-lg">
            <div class="stat-card">
              <div class="stat-value">{{ dashboard()!.totalPlannedHours }}h</div>
              <div class="stat-label">Total Planned</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{ dashboard()!.totalCompletedHours }}h</div>
              <div class="stat-label">Total Completed</div>
            </div>
            <div class="stat-card stat-card--highlight">
              <div class="stat-value">{{ dashboard()!.overallProgress }}%</div>
              <div class="stat-label">Overall Progress</div>
            </div>
          </div>

          <!-- Overall progress bar -->
          <div class="card mb-lg">
            <h4 class="mb-md">Overall Completion</h4>
            <div class="progress-bar-wrap" style="height:16px;">
              <div class="progress-bar-fill"
                [style.width.%]="dashboard()!.overallProgress">
              </div>
            </div>
            <div class="text-sm text-secondary mt-md text-center">
              {{ dashboard()!.totalCompletedHours }}h of {{ dashboard()!.totalPlannedHours }}h completed
            </div>
          </div>

          <!-- Category breakdown -->
          <div class="card mb-lg">
            <h4 class="mb-md">By Category</h4>
            <div class="breakdown-list">
              @for (cat of dashboard()!.categoryBreakdown; track cat.category) {
                <div class="breakdown-row">
                  <div class="flex items-center justify-between mb-md" style="gap:1rem;">
                    <span class="badge {{ catClass(cat.category) }}">
                      {{ catLabel(cat.category) }}
                    </span>
                    <span class="text-secondary text-sm">{{ cat.completedHours }}h / {{ cat.plannedHours }}h</span>
                    <strong style="color: var(--accent);">{{ cat.progressPercent }}%</strong>
                  </div>
                  <div class="progress-bar-wrap">
                    <div class="progress-bar-fill" [style.width.%]="cat.progressPercent"></div>
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- User breakdown -->
          <div class="card" style="padding:0; overflow:hidden;">
            <div style="padding: var(--space-lg); border-bottom: 1px solid var(--border);">
              <h4 style="margin:0;">By Team Member</h4>
            </div>
            <div class="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Member</th>
                    <th style="text-align:right;">Planned</th>
                    <th style="text-align:right;">Completed</th>
                    <th style="min-width:150px;">Progress</th>
                    <th style="text-align:right;">%</th>
                  </tr>
                </thead>
                <tbody>
                  @for (u of dashboard()!.userBreakdown; track u.userId) {
                    <tr>
                      <td><strong>{{ u.userName }}</strong></td>
                      <td style="text-align:right;">{{ u.plannedHours }}h</td>
                      <td style="text-align:right;">{{ u.completedHours }}h</td>
                      <td>
                        <div class="progress-bar-wrap">
                          <div class="progress-bar-fill" [style.width.%]="u.progressPercent"></div>
                        </div>
                      </td>
                      <td style="text-align:right; font-weight:700; color: var(--accent);">{{ u.progressPercent }}%</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }
      </div>
    </div>

    @if (confirmComplete) {
      <div class="modal-overlay" (click)="confirmComplete = false">
        <div class="modal-box" (click)="$event.stopPropagation()">
          <h3>✅ Mark Week as Complete?</h3>
          <p class="mt-md">This will archive the current week. No further updates will be possible.</p>
          <div class="flex gap-sm mt-lg">
            <button class="btn btn--success" (click)="completeWeek()">Yes, Complete It</button>
            <button class="btn btn--secondary" (click)="confirmComplete = false">Cancel</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-md); }
    @media (max-width: 600px) { .stats-grid { grid-template-columns: 1fr; } }

    .stat-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--border-radius-lg);
      padding: var(--space-xl);
      text-align: center;
      box-shadow: var(--shadow-card);
    }

    .stat-card--highlight { border-color: var(--accent); background: rgba(79,142,247,0.06); }

    .stat-value { font-size: 2rem; font-weight: 700; color: var(--text-primary); }
    .stat-label { font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; margin-top: 4px; }

    .breakdown-list { display: flex; flex-direction: column; gap: var(--space-md); }
    .breakdown-row { padding: var(--space-md); background: var(--bg-input); border-radius: var(--border-radius); border: 1px solid var(--border); }
  `]
})
export class TeamProgressComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly completing = signal(false);
  readonly dashboard = signal<Dashboard | null>(null);
  readonly planId = signal('');

  confirmComplete = false;

  ngOnInit(): void {
    this.api.getActivePlan().subscribe({
      next: (plan) => {
        if (!plan) { this.loading.set(false); return; }
        this.planId.set(plan.id);
        this.api.getDashboard(plan.id).subscribe({
          next: (d) => { this.dashboard.set(d); this.loading.set(false); },
          error: () => this.loading.set(false)
        });
      }
    });
  }

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

  catLabel(cat: string): string { return CATEGORY_LABELS[cat as CategoryType] ?? cat; }
  catClass(cat: string): string { return CATEGORY_BADGE_CLASS[cat as CategoryType] ?? ''; }
}
