import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { User } from '../../core/models/models';

@Component({
    selector: 'app-onboarding',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="onboard-page">
      <div class="onboard-card">
        <div class="onboard-emoji">👋</div>
        <h1 class="onboard-title">Welcome! Let's set up your team.</h1>
        <p class="onboard-subtitle">
          Add your team members below. The first person you add will become the
          <strong>Team Lead</strong>. You can change roles later from the Manage Team page.
        </p>

        <!-- Add form -->
        <div class="add-form">
          <input id="onboard-name-input" class="form-control add-input"
            [(ngModel)]="newName"
            placeholder="Type a name here"
            [disabled]="saving()"
            (keyup.enter)="addMember()" />
          <button class="btn btn--primary add-btn"
            [disabled]="saving() || !newName.trim()"
            (click)="addMember()">
            @if (saving()) { <span class="spinner"></span> } @else { Add This Person }
          </button>
        </div>

        <!-- Members list -->
        <div class="members-preview" [class.members-preview--empty]="members().length === 0">
          @if (members().length === 0) {
            <p class="text-muted text-center" style="margin:0;">No team members added yet.</p>
          } @else {
            @for (member of members(); track member.id) {
              <div class="preview-row">
                <div class="flex items-center gap-md">
                  <div class="preview-avatar">{{ initials(member.name) }}</div>
                  <strong>{{ member.name }}</strong>
                  @if (member.role === 'TeamLead') {
                    <span class="badge badge--info" style="font-size:0.65rem;">Lead</span>
                  }
                </div>
              </div>
            }
          }
        </div>

        <!-- Done button -->
        <button class="btn btn--primary done-btn"
          [disabled]="members().length === 0"
          (click)="goToLogin()">
          Done — Go to Home Screen →
        </button>
        @if (members().length === 0) {
          <p class="text-sm text-muted text-center mt-md">Add at least one member to continue.</p>
        }
      </div>
    </div>
  `,
    styles: [`
    .onboard-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--bg-primary);
      padding: var(--space-lg);
    }

    .onboard-card {
      width: 100%;
      max-width: 580px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--border-radius-xl, 20px);
      padding: var(--space-2xl);
      box-shadow: 0 8px 40px rgba(0,0,0,0.35);
      animation: fadeUp 0.4s ease;
    }

    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(20px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .onboard-emoji { font-size: 2.5rem; margin-bottom: var(--space-md); }
    .onboard-title { font-size: 1.6rem; font-weight: 700; margin: 0 0 var(--space-sm); }
    .onboard-subtitle { color: var(--text-secondary); font-size: 0.9rem; margin-bottom: var(--space-xl); line-height: 1.6; }

    .add-form {
      display: flex;
      gap: var(--space-sm);
      margin-bottom: var(--space-lg);
    }

    .add-input { flex: 1; }
    .add-btn { white-space: nowrap; flex-shrink: 0; }

    .members-preview {
      border: 1px solid var(--border);
      border-radius: var(--border-radius-lg);
      overflow: hidden;
      margin-bottom: var(--space-xl);
    }

    .members-preview--empty {
      padding: var(--space-xl);
    }

    .preview-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-md) var(--space-lg);
      border-bottom: 1px solid var(--border);
    }
    .preview-row:last-child { border-bottom: none; }

    .preview-avatar {
      width: 36px; height: 36px; border-radius: 50%;
      background: linear-gradient(135deg, var(--accent), #6366f1);
      display: flex; align-items: center; justify-content: center;
      font-size: 0.75rem; font-weight: 700; color: #fff; flex-shrink: 0;
    }

    .done-btn {
      width: 100%;
      height: 48px;
      font-size: 1rem;
      font-weight: 600;
    }
    .done-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  `]
})
export class OnboardingComponent implements OnInit {
    private readonly api = inject(ApiService);
    private readonly toast = inject(ToastService);
    private readonly router = inject(Router);

    readonly saving = signal(false);
    readonly members = signal<User[]>([]);

    newName = '';
    isFirstMember = true;

    ngOnInit(): void {
        // If users already exist, skip onboarding
        this.api.getUsers().subscribe({
            next: (users) => {
                if (users.length > 0) this.router.navigate(['/login'], { replaceUrl: true });
            }
        });
    }

    addMember(): void {
        if (!this.newName.trim()) return;
        this.saving.set(true);

        // First person added → TeamLead; rest → TeamMember
        const role = this.members().length === 0 ? 'TeamLead' : 'TeamMember';

        this.api.createUser({ name: this.newName.trim(), role }).subscribe({
            next: (user) => {
                this.members.update(list => [...list, user]);
                this.newName = '';
                this.saving.set(false);
                this.toast.success(`${user.name} added${role === 'TeamLead' ? ' as Team Lead! 👑' : '!'}`);
            },
            error: (err) => {
                this.toast.error(err.error?.detail ?? 'Failed to add member.');
                this.saving.set(false);
            }
        });
    }

    goToLogin(): void {
        this.router.navigate(['/login'], { replaceUrl: true });
    }

    initials(name: string): string {
        return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    }
}
