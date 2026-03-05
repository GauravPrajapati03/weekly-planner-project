import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { User } from '../../core/models/models';
import { NavbarComponent } from '../../shared/navbar/navbar.component';

@Component({
  selector: 'app-manage-team',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent],
  template: `
    <app-navbar />
    <div class="page">
      <div class="container">
        <h2 class="mb-lg">👥 Manage Team Members</h2>

        <!-- Add Member Form — always visible at top like the demo -->
        <div class="card mb-lg" style="border-left: 3px solid var(--accent);">
          <h4 class="mb-md">Add a New Member</h4>
          <p class="text-sm text-secondary mb-md">New members join as Team Member. Use "Make Lead" below to transfer the lead role.</p>
          <div class="flex gap-md items-end" style="flex-wrap:wrap;">
            <div class="form-group" style="flex: 2; min-width: 200px; margin:0;">
              <label class="form-label">Name *</label>
              <input id="new-member-name" class="form-control" [(ngModel)]="newName"
                placeholder="Type a name here"
                (keyup.enter)="save()" />
            </div>
            <button class="btn btn--primary" style="height:44px;"
              [disabled]="saving()" (click)="save()">
              @if (saving()) { <span class="spinner"></span> } @else { Save This Person }
            </button>
          </div>
        </div>

        <!-- Users list -->
        @if (loading()) {
          <div class="text-center mt-xl"><div class="spinner"></div></div>
        } @else if (allUsers().length === 0) {
          <div class="card text-center" style="padding: var(--space-2xl);">
            <p class="text-muted" style="font-size: 1rem;">No team members added yet.</p>
          </div>
        } @else {
          <div class="members-list">
            @for (user of allUsers(); track user.id) {
              <div class="member-row" [class.member-row--inactive]="!user.isActive">

                <!-- Left: avatar + name + badges -->
                <div class="flex items-center gap-md" style="flex:1; min-width:0;">
                  <div class="user-avatar" [class.user-avatar--inactive]="!user.isActive">
                    {{ initials(user.name) }}
                  </div>
                  <div>
                    <!-- Inline edit mode -->
                    @if (editingId() === user.id) {
                      <input class="form-control" style="max-width:220px; padding:0.35rem 0.6rem;"
                        [(ngModel)]="editName"
                        (keyup.enter)="saveEdit(user)"
                        (keyup.escape)="editingId.set(null)" />
                    } @else {
                      <strong style="font-size:1rem;">{{ user.name }}</strong>
                    }
                    <div class="flex gap-sm mt-md" style="flex-wrap:wrap; gap: 6px;">
                      @if (user.role === 'TeamLead') {
                        <span class="badge badge--info" style="font-size:0.65rem; padding:2px 8px;">Lead</span>
                      }
                      @if (!user.isActive) {
                        <span class="badge badge--neutral" style="font-size:0.65rem; padding:2px 8px;">Inactive</span>
                      }
                    </div>
                  </div>
                </div>

                <!-- Right: action buttons -->
                <div class="flex gap-sm" style="flex-wrap:wrap;">
                  @if (editingId() === user.id) {
                    <!-- editing state -->
                    <button class="btn btn--success btn--sm" (click)="saveEdit(user)">✓ Save</button>
                    <button class="btn btn--secondary btn--sm" (click)="editingId.set(null)">Cancel</button>
                  } @else {
                    <!-- normal state -->
                    <button class="btn btn--secondary btn--sm"
                      (click)="startEdit(user)">
                      Edit Name
                    </button>

                    @if (user.role !== 'TeamLead') {
                      <!-- Can only promote a member; demotion happens automatically -->
                      <button class="btn btn--secondary btn--sm"
                        [disabled]="updatingId() === user.id"
                        (click)="makeLead(user)">
                        @if (updatingId() === user.id) { <span class="spinner"></span> } @else { Make Lead }
                      </button>
                    }
                    <!-- No "Remove Lead" button: the lead can only be TRANSFERRED, not removed -->

                    @if (user.isActive) {
                      <button class="btn btn--danger btn--sm"
                        [disabled]="updatingId() === user.id"
                        (click)="toggleActive(user)">
                        @if (updatingId() === user.id) { <span class="spinner"></span> } @else { Deactivate }
                      </button>
                    } @else {
                      <button class="btn btn--success btn--sm"
                        [disabled]="updatingId() === user.id"
                        (click)="toggleActive(user)">
                        @if (updatingId() === user.id) { <span class="spinner"></span> } @else { Activate }
                      </button>
                    }
                  }
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .members-list { display: flex; flex-direction: column; gap: var(--space-sm); }

    .member-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-md);
      padding: var(--space-md) var(--space-lg);
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--border-radius-lg);
      box-shadow: var(--shadow-card);
      flex-wrap: wrap;
      transition: all 0.2s ease;
    }

    .member-row--inactive {
      opacity: 0.55;
      border-style: dashed;
    }

    .user-avatar {
      width: 40px; height: 40px; border-radius: 50%;
      background: linear-gradient(135deg, var(--accent), #6366f1);
      display: flex; align-items: center; justify-content: center;
      font-size: 0.8rem; font-weight: 700; color: #fff; flex-shrink: 0;
    }

    .user-avatar--inactive {
      background: var(--bg-input);
      color: var(--text-muted);
    }

    .btn--danger {
      background: rgba(239,68,68,0.15);
      color: #ef4444;
      border: 1px solid rgba(239,68,68,0.3);
    }
    .btn--danger:hover:not(:disabled) {
      background: rgba(239,68,68,0.25);
    }
    .btn--danger:disabled { opacity: 0.5; cursor: not-allowed; }
  `]
})
export class ManageTeamComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly updatingId = signal<string | null>(null);
  readonly editingId = signal<string | null>(null);
  readonly allUsers = signal<User[]>([]);

  newName = '';
  editName = '';

  ngOnInit(): void {
    this.loadUsers();
  }

  private loadUsers(): void {
    this.api.getAllUsers().subscribe({
      next: (users) => { this.allUsers.set(users); this.loading.set(false); },
      error: () => { this.toast.error('Failed to load team members.'); this.loading.set(false); }
    });
  }

  save(): void {
    if (!this.newName.trim()) { this.toast.error('Name is required.'); return; }
    this.saving.set(true);
    // New members always join as TeamMember — use "Make Lead" to promote.
    this.api.createUser({ name: this.newName.trim(), role: 'TeamMember' }).subscribe({
      next: (user) => {
        this.allUsers.update(list => [...list, user]);
        this.newName = '';
        this.saving.set(false);
        this.toast.success(`${user.name} added to the team! 🎉`);
      },
      error: (err) => {
        this.toast.error(err.error?.detail ?? 'Failed to add member.');
        this.saving.set(false);
      }
    });
  }

  startEdit(user: User): void {
    this.editName = user.name;
    this.editingId.set(user.id);
  }

  saveEdit(user: User): void {
    if (!this.editName.trim()) { this.toast.error('Name cannot be empty.'); return; }
    this.updatingId.set(user.id);
    this.api.updateUser(user.id, { name: this.editName.trim() }).subscribe({
      next: (updated) => {
        this.allUsers.update(list => list.map(u => u.id === updated.id ? updated : u));
        this.editingId.set(null);
        this.updatingId.set(null);
        this.toast.success(`Name updated to "${updated.name}".`);
      },
      error: (err) => {
        this.toast.error(err.error?.detail ?? 'Update failed.');
        this.updatingId.set(null);
      }
    });
  }

  makeLead(user: User): void {
    this.updatingId.set(user.id);
    this.api.updateUser(user.id, { role: 'TeamLead' }).subscribe({
      next: (updated) => {
        // Reload ALL users — the backend also demoted the previous lead, so we
        // must refresh the full list to reflect both changes.
        this.api.getAllUsers().subscribe({
          next: (freshUsers) => {
            this.allUsers.set(freshUsers);
            // If the currently logged-in user's role just changed, update AuthService too.
            const me = this.auth.currentUser();
            if (me) {
              const meUpdated = freshUsers.find(u => u.id === me.id);
              if (meUpdated && meUpdated.role !== me.role) {
                this.auth.setCurrentUser(meUpdated);
              }
            }
            this.updatingId.set(null);
            this.toast.success(`${updated.name} is now Team Lead! 👑 Previous lead has been set to Member.`);
          },
          error: () => { this.loadUsers(); this.updatingId.set(null); }
        });
      },
      error: (err) => { this.toast.error(err.error?.detail ?? 'Update failed.'); this.updatingId.set(null); }
    });
  }

  toggleActive(user: User): void {
    this.updatingId.set(user.id);
    this.api.updateUser(user.id, { isActive: !user.isActive }).subscribe({
      next: (updated) => {
        this.allUsers.update(list => list.map(u => u.id === updated.id ? updated : u));
        this.updatingId.set(null);
        const msg = updated.isActive ? `${updated.name} reactivated.` : `${updated.name} deactivated.`;
        this.toast.success(msg);
      },
      error: () => { this.toast.error('Update failed.'); this.updatingId.set(null); }
    });
  }

  initials(name: string): string {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }
}
