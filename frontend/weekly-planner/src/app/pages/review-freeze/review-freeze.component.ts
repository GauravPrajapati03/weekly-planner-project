import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { Router } from '@angular/router';
import { Dashboard, UserProgress } from '../../core/models/models';
import { NavbarComponent } from '../../shared/navbar/navbar.component';

@Component({
    selector: 'app-review-freeze',
    standalone: true,
    imports: [CommonModule, NavbarComponent],
    template: `
    <app-navbar />
    <div class="page">
      <div class="container">
        <h2 class="mb-md">❄️ Review &amp; Freeze</h2>
        <p>All conditions below must be met before the plan can be frozen.</p>

        @if (!auth.isLead) {
          <div class="alert alert--warning">Only the Team Lead can freeze the plan.</div>
        } @else if (loading()) {
          <div class="text-center mt-xl"><div class="spinner"></div></div>
        } @else if (!dashboard()) {
          <div class="alert alert--error">No active plan found.</div>
        } @else {

          <!-- Conditions panel -->
          <div class="card mb-lg" style="border-left: 3px solid {{ allConditionsMet() ? 'var(--status-success)' : 'var(--status-error)' }};">
            <h4 class="mb-md">Planning Conditions</h4>
            <div class="conditions-list">
              @for (c of conditions(); track c.label) {
                <div class="condition-row">
                  <span class="condition-icon">{{ c.met ? '✅' : '❌' }}</span>
                  <span [style.color]="c.met ? 'var(--status-success)' : 'var(--status-error)'">{{ c.label }}</span>
                </div>
              }
            </div>
          </div>

          <!-- Member breakdown -->
          <div class="card mb-lg" style="padding:0; overflow:hidden;">
            <div style="padding: var(--space-lg); border-bottom: 1px solid var(--border);">
              <h4 style="margin:0;">Team Member Status</h4>
            </div>
            <div class="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Member</th>
                    <th style="text-align:right;">Hours Planned</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  @for (u of dashboard()!.userBreakdown; track u.userId) {
                    <tr>
                      <td><strong>{{ u.userName }}</strong></td>
                      <td style="text-align:right;">{{ u.plannedHours }}h</td>
                      <td>
                        @if (u.plannedHours >= 30) {
                          <span class="badge badge--success">✅ Ready</span>
                        } @else {
                          <span class="badge badge--error">⏳ {{ 30 - u.plannedHours }}h left</span>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>

          <!-- Freeze button -->
          <button class="btn btn--primary btn--lg"
            [disabled]="!allConditionsMet() || freezing()"
            (click)="confirmFreeze = true">
            @if (freezing()) { <span class="spinner"></span> Freezing... } @else { ❄️ Freeze the Plan }
          </button>
          @if (!allConditionsMet()) {
            <p class="text-sm text-muted mt-md">Resolve all ❌ issues above to enable freezing.</p>
          }
        }
      </div>
    </div>

    @if (confirmFreeze) {
      <div class="modal-overlay" (click)="confirmFreeze = false">
        <div class="modal-box" (click)="$event.stopPropagation()">
          <h3>❄️ Freeze Plan?</h3>
          <p class="mt-md">This is <strong>irreversible</strong>. Once frozen, no tasks can be added or removed. Members can only update their completed hours.</p>
          <div class="flex gap-sm mt-lg">
            <button class="btn btn--primary" (click)="freeze()">Yes, Freeze It</button>
            <button class="btn btn--secondary" (click)="confirmFreeze = false">Cancel</button>
          </div>
        </div>
      </div>
    }
  `,
    styles: [`
    .conditions-list { display: flex; flex-direction: column; gap: var(--space-sm); }
    .condition-row { display: flex; align-items: center; gap: var(--space-md); padding: var(--space-sm) 0; font-size: 0.9rem; border-bottom: 1px solid rgba(255,255,255,0.04); }
    .condition-row:last-child { border-bottom: none; }
    .condition-icon { font-size: 1rem; }
  `]
})
export class ReviewFreezeComponent implements OnInit {
    readonly auth = inject(AuthService);
    private readonly api = inject(ApiService);
    private readonly toast = inject(ToastService);
    private readonly router = inject(Router);

    readonly loading = signal(true);
    readonly freezing = signal(false);
    readonly dashboard = signal<Dashboard | null>(null);
    readonly conditions = signal<{ label: string; met: boolean }[]>([]);

    confirmFreeze = false;
    planId = 0;

    ngOnInit(): void {
        this.api.getActivePlan().subscribe({
            next: (plan) => {
                if (!plan) { this.loading.set(false); return; }
                this.planId = plan.id;
                this.api.getDashboard(plan.id).subscribe({
                    next: (d) => {
                        this.dashboard.set(d);
                        this.buildConditions(d, plan.clientPercent, plan.techDebtPercent, plan.rdPercent);
                        this.loading.set(false);
                    },
                    error: () => this.loading.set(false)
                });
            }
        });
    }

    buildConditions(d: Dashboard, cp: number, tp: number, rp: number): void {
        const conditions: { label: string; met: boolean }[] = [];

        // All members must have exactly 30h planned
        const allMembersReady = d.userBreakdown.every(u => u.plannedHours >= 30);
        conditions.push({ label: `All team members have planned exactly 30h`, met: allMembersReady });

        // Category budgets must match allocations (within rounding)
        const clientBudget = cp / 100 * 30;
        const techBudget = tp / 100 * 30;
        const rdBudget = rp / 100 * 30;

        const clientCat = d.categoryBreakdown.find(c => c.category === 'Client');
        const techCat = d.categoryBreakdown.find(c => c.category === 'TechDebt');
        const rdCat = d.categoryBreakdown.find(c => c.category === 'RnD');

        conditions.push({ label: `Client Focused hours ≤ budget (${clientBudget}h)`, met: (clientCat?.plannedHours ?? 0) <= clientBudget + 0.1 });
        conditions.push({ label: `Tech Debt hours ≤ budget (${techBudget}h)`, met: (techCat?.plannedHours ?? 0) <= techBudget + 0.1 });
        conditions.push({ label: `R&D hours ≤ budget (${rdBudget}h)`, met: (rdCat?.plannedHours ?? 0) <= rdBudget + 0.1 });

        conditions.push({ label: `At least one team member has planned work`, met: d.userBreakdown.length > 0 });

        this.conditions.set(conditions);
    }

    allConditionsMet(): boolean { return this.conditions().every(c => c.met); }

    freeze(): void {
        this.confirmFreeze = false;
        this.freezing.set(true);
        this.api.freezePlan(this.planId).subscribe({
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
}
