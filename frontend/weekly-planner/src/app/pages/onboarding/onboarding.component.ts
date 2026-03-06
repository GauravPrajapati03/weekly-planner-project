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
          Add your team members below. The <strong>first person</strong> added automatically becomes
          the <strong>Team Lead</strong>. You can reassign the lead at any time using the "Make Lead" button.
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

        <!-- Members list — matching demo app layout -->
        <div class="members-list" [class.members-list--empty]="members().length === 0">
          @if (members().length === 0) {
            <p class="text-muted text-center" style="margin:0; padding: var(--space-xl);">
              No team members added yet.
            </p>
          } @else {
            @for (member of members(); track member.id; let i = $index) {
              <div class="member-row">
                <!-- Left: name -->
                <div class="member-row__left">
                  <span class="member-name">{{ member.name }}</span>
                  @if (member.role === 'TeamLead') {
                    <span class="lead-badge">Team Lead</span>
                  }
                </div>

                <!-- Right: action buttons -->
                <div class="member-row__actions">
                  <!-- Only non-leads get "Make Lead" -->
                  @if (member.role !== 'TeamLead') {
                    <button class="btn btn--make-lead btn--sm"
                      [disabled]="actionBusy()"
                      (click)="makeLead(member)">
                      Make Lead
                    </button>
                  }
                  <!-- Remove — can remove anyone (can't remove the only person if they're the only one) -->
                  <button class="btn btn--remove btn--sm"
                    [disabled]="actionBusy()"
                    (click)="removeMember(member)">
                    Remove
                  </button>
                </div>
              </div>
            }
          }
        </div>

        <!-- Done button -->
        <button class="btn btn--primary done-btn"
          [disabled]="members().length === 0"
          (click)="goToLogin()">
          Done — Go to Home Screen
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
      background: var(--bg-base);
      padding: var(--space-lg);
    }

    .onboard-card {
      width: 100%;
      max-width: 600px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--border-radius-lg);
      padding: var(--space-2xl);
      box-shadow: var(--shadow-card);
      animation: fadeUp 0.4s ease;
    }

    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(20px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .onboard-emoji  { font-size: 2.5rem; margin-bottom: var(--space-md); }
    .onboard-title  { font-size: 1.6rem; font-weight: 700; margin: 0 0 var(--space-sm); color: var(--text-primary); }
    .onboard-subtitle {
      color: var(--text-secondary); font-size: 0.9rem;
      margin-bottom: var(--space-xl); line-height: 1.6;
      strong { color: var(--text-primary); }
    }

    /* Add form */
    .add-form {
      display: flex;
      gap: var(--space-sm);
      margin-bottom: var(--space-lg);
    }
    .add-input { flex: 1; }
    .add-btn   { white-space: nowrap; flex-shrink: 0; }

    /* Members list */
    .members-list {
      border: 1px solid var(--border);
      border-radius: var(--border-radius-lg);
      overflow: hidden;
      margin-bottom: var(--space-xl);
      background: var(--bg-card);
    }
    .members-list--empty { }

    /* Individual member row — exactly like demo app */
    .member-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.85rem var(--space-lg);
      border-bottom: 1px solid var(--border);
      gap: var(--space-md);
      background: var(--bg-input);
      transition: background 0.15s;
      &:last-child { border-bottom: none; }
      &:hover { background: var(--bg-card-hover); }
    }

    .member-row__left {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      flex: 1;
      min-width: 0;
    }
    .member-name {
      font-size: 0.95rem;
      font-weight: 500;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Team Lead badge — matches demo app style */
    .lead-badge {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 4px;
      font-size: 0.72rem;
      font-weight: 700;
      background: #2563eb;
      color: #fff;
      letter-spacing: 0.03em;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .member-row__actions {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      flex-shrink: 0;
    }

    /* Make Lead button — outlined blue like demo app */
    .btn--make-lead {
      background: transparent;
      border: 1px solid var(--accent);
      color: var(--accent);
      font-weight: 600;
      padding: 0.35rem 0.85rem;
      border-radius: var(--border-radius);
      cursor: pointer;
      transition: all 0.15s;
      font-size: 0.8rem;
      white-space: nowrap;
      &:hover:not(:disabled) {
        background: var(--accent);
        color: #fff;
      }
      &:disabled { opacity: 0.4; cursor: not-allowed; }
    }

    /* Remove button — solid red like demo app */
    .btn--remove {
      background: #ef4444;
      border: none;
      color: #fff;
      font-weight: 600;
      padding: 0.35rem 0.85rem;
      border-radius: var(--border-radius);
      cursor: pointer;
      transition: all 0.15s;
      font-size: 0.8rem;
      white-space: nowrap;
      &:hover:not(:disabled) { background: #dc2626; }
      &:disabled { opacity: 0.4; cursor: not-allowed; }
    }

    /* Done button */
    .done-btn {
      width: 100%;
      height: 48px;
      font-size: 1rem;
      font-weight: 600;
      justify-content: center;
    }
    .done-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  `]
})
export class OnboardingComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly saving = signal(false);
  readonly actionBusy = signal(false);
  readonly members = signal<User[]>([]);

  newName = '';

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

  makeLead(member: User): void {
    this.actionBusy.set(true);
    this.api.updateUser(member.id, { name: member.name, role: 'TeamLead' }).subscribe({
      next: (updated) => {
        // Demote current lead → TeamMember, promote this one → TeamLead
        this.members.update(list => list.map(m => {
          if (m.id === member.id) return { ...m, role: 'TeamLead' };
          if (m.role === 'TeamLead') return { ...m, role: 'TeamMember' };
          return m;
        }));
        this.actionBusy.set(false);
        this.toast.success(`${member.name} is now the Team Lead! 👑`);
      },
      error: (err) => {
        this.toast.error(err.error?.detail ?? 'Failed to update role.');
        this.actionBusy.set(false);
      }
    });
  }

  removeMember(member: User): void {
    this.actionBusy.set(true);
    this.api.deleteUser(member.id).subscribe({
      next: () => {
        this.members.update(list => list.filter(m => m.id !== member.id));
        this.actionBusy.set(false);
        this.toast.success(`${member.name} removed.`);
      },
      error: (err) => {
        this.toast.error(err.error?.detail ?? 'Failed to remove member.');
        this.actionBusy.set(false);
      }
    });
  }

  goToLogin(): void {
    this.router.navigate(['/login'], { replaceUrl: true });
  }
}
