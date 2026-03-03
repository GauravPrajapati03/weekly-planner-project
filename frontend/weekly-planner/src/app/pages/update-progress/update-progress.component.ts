import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { WeeklyPlanTask, CATEGORY_LABELS, CATEGORY_BADGE_CLASS, CategoryType } from '../../core/models/models';
import { NavbarComponent } from '../../shared/navbar/navbar.component';

interface EditableTask extends WeeklyPlanTask { editedHours: number; }

@Component({
    selector: 'app-update-progress',
    standalone: true,
    imports: [CommonModule, FormsModule, NavbarComponent],
    template: `
    <app-navbar />
    <div class="page">
      <div class="container">
        <h2 class="mb-md">📊 Update My Progress</h2>
        <p>Enter how many hours you've completed on each task. Changes are saved individually.</p>

        @if (loading()) {
          <div class="text-center mt-xl"><div class="spinner"></div></div>
        } @else if (tasks().length === 0) {
          <div class="alert alert--warning">No tasks assigned to you in the current plan.</div>
        } @else {
          <div class="card" style="padding:0; overflow:hidden;">
            <div class="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Category</th>
                    <th style="text-align:right;">Planned</th>
                    <th style="text-align:right; min-width:120px;">Completed</th>
                    <th>Progress</th>
                    <th style="text-align:right;">Save</th>
                  </tr>
                </thead>
                <tbody>
                  @for (task of tasks(); track task.id; let i = $index) {
                    <tr>
                      <td><strong>{{ task.backlogItemTitle }}</strong></td>
                      <td><span class="badge {{ catClass(task.category) }}">{{ catLabel(task.category) }}</span></td>
                      <td style="text-align:right;">{{ task.plannedHours }}h</td>
                      <td style="text-align:right;">
                        <input type="number" class="form-control" style="width:80px; text-align:right; padding:0.4rem 0.6rem;"
                          [(ngModel)]="task.editedHours"
                          min="0" [max]="task.plannedHours" step="0.5" />
                      </td>
                      <td style="min-width: 100px;">
                        <div class="progress-bar-wrap">
                          <div class="progress-bar-fill"
                            [style.width.%]="task.plannedHours > 0 ? (task.editedHours / task.plannedHours * 100) : 0">
                          </div>
                        </div>
                        <div class="text-sm text-secondary" style="margin-top:4px;">
                          {{ task.plannedHours > 0 ? (task.editedHours / task.plannedHours * 100).toFixed(0) : 0 }}%
                        </div>
                      </td>
                      <td style="text-align:right;">
                        <button class="btn btn--success btn--sm"
                          [disabled]="saving()[i]"
                          (click)="save(task, i)">
                          @if (saving()[i]) { <span class="spinner"></span> } @else { Save }
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }
      </div>
    </div>
  `
})
export class UpdateProgressComponent implements OnInit {
    readonly auth = inject(AuthService);
    private readonly api = inject(ApiService);
    private readonly toast = inject(ToastService);

    readonly loading = signal(true);
    readonly tasks = signal<EditableTask[]>([]);
    readonly saving = signal<boolean[]>([]);

    planId = 0;

    ngOnInit(): void {
        this.api.getActivePlan().subscribe({
            next: (plan) => {
                if (!plan) { this.loading.set(false); return; }
                this.planId = plan.id;
                this.api.getTasksByUser(plan.id, this.auth.currentUser()!.id).subscribe({
                    next: (tasks) => {
                        this.tasks.set(tasks.map(t => ({ ...t, editedHours: t.completedHours })));
                        this.saving.set(tasks.map(() => false));
                        this.loading.set(false);
                    },
                    error: () => this.loading.set(false)
                });
            }
        });
    }

    save(task: EditableTask, index: number): void {
        if (task.editedHours > task.plannedHours) {
            this.toast.error(`Completed hours cannot exceed planned hours (${task.plannedHours}h).`);
            return;
        }
        this.saving.update(arr => { const a = [...arr]; a[index] = true; return a; });

        this.api.updateProgress(this.planId, { taskId: task.id, completedHours: task.editedHours }).subscribe({
            next: () => {
                this.saving.update(arr => { const a = [...arr]; a[index] = false; return a; });
                this.toast.success(`Progress saved for "${task.backlogItemTitle}"!`);
            },
            error: (err) => {
                this.saving.update(arr => { const a = [...arr]; a[index] = false; return a; });
                this.toast.error(err.error?.detail ?? 'Failed to save progress.');
            }
        });
    }

    catLabel(cat: CategoryType): string { return CATEGORY_LABELS[cat] ?? cat; }
    catClass(cat: CategoryType): string { return CATEGORY_BADGE_CLASS[cat] ?? ''; }
}
