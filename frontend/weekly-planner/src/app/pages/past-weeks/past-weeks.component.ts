import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { WeeklyPlan } from '../../core/models/models';
import { NavbarComponent } from '../../shared/navbar/navbar.component';

@Component({
    selector: 'app-past-weeks',
    standalone: true,
    imports: [CommonModule, RouterLink, NavbarComponent],
    template: `
    <app-navbar />
    <div class="page">
      <div class="container">
        <h2 class="mb-md">📅 Past Planning Weeks</h2>
        <p>Historical record of all planning cycles.</p>

        @if (loading()) {
          <div class="text-center mt-xl"><div class="spinner"></div></div>
        } @else if (completedPlans().length === 0) {
          <div class="card text-center" style="padding: var(--space-2xl);">
            <p class="text-muted" style="font-size: 1rem;">No completed weeks yet.</p>
            <a routerLink="/home" class="btn btn--primary mt-md">Back to Home</a>
          </div>
        } @else {
          <div style="display: flex; flex-direction: column; gap: var(--space-md);">
            @for (plan of completedPlans(); track plan.id) {
              <div class="card">
                <div class="flex items-center justify-between" style="flex-wrap:wrap; gap:1rem;">
                  <div>
                    <h4 style="margin:0;">
                      {{ formatDate(plan.weekStartDate) }} → {{ formatDate(plan.weekEndDate) }}
                    </h4>
                    <p class="text-sm text-secondary mt-md" style="margin: 0.3rem 0 0;">
                      Created: {{ formatDate(plan.createdAt) }}
                      @if (plan.completedAt) { · Completed: {{ formatDate(plan.completedAt) }} }
                    </p>
                  </div>
                  <div class="flex gap-sm items-center" style="flex-wrap:wrap;">
                    <span class="badge {{ statusBadge(plan.status) }}">{{ plan.status }}</span>
                    <div class="text-sm text-secondary">
                      Client {{ plan.clientPercent }}% ·
                      TechDebt {{ plan.techDebtPercent }}% ·
                      R&amp;D {{ plan.rdPercent }}%
                    </div>
                  </div>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `
})
export class PastWeeksComponent implements OnInit {
    private readonly api = inject(ApiService);
    private readonly toast = inject(ToastService);

    readonly loading = signal(true);
    readonly completedPlans = signal<WeeklyPlan[]>([]);

    ngOnInit(): void {
        this.api.getPlans().subscribe({
            next: (plans) => {
                this.completedPlans.set(plans.filter(p => p.status === 'Completed'));
                this.loading.set(false);
            },
            error: () => {
                this.toast.error('Failed to load plan history.');
                this.loading.set(false);
            }
        });
    }

    formatDate(dateStr: string): string {
        return new Date(dateStr).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
    }

    statusBadge(status: string): string {
        return { Planning: 'badge--info', Frozen: 'badge--warning', Completed: 'badge--success' }[status] ?? 'badge--neutral';
    }
}
