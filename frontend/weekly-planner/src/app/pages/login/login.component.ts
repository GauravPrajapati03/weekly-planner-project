import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models/models';
import { CommonModule } from '@angular/common';

/**
 * Login Page — "Who are you?" screen.
 * Fetches all active team members and displays them as clickable cards
 * in a grid layout (like the demo app). Each card shows the name centered
 * with a role badge below.
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="login-page">
      <div class="login-container">
        <h1 class="page-title">Who are you?</h1>
        <p class="page-subtitle">Click your name to get started.</p>

        @if (loading()) {
          <div class="text-center mt-lg">
            <div class="spinner"></div>
            <p class="text-muted mt-md">Loading team...</p>
          </div>
        } @else if (error()) {
          <div class="alert alert--error">{{ error() }}</div>
        } @else {
          <div class="user-card-grid">
            @for (user of users(); track user.id) {
              <button class="user-card" (click)="select(user)">
                <span class="user-card__name">{{ user.name }}</span>
                <span class="user-card__role"
                  [class.user-card__role--lead]="user.role === 'TeamLead'"
                  [class.user-card__role--member]="user.role !== 'TeamLead'">
                  {{ user.role === 'TeamLead' ? 'Team Lead' : 'Team Member' }}
                </span>
              </button>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .login-page {
      min-height: 100vh;
      background: var(--bg-base);
      padding: var(--space-2xl) var(--space-xl);
    }

    .login-container {
      max-width: 960px;
      margin: 0 auto;
    }

    .page-title {
      font-size: 2rem;
      font-weight: 800;
      margin-bottom: var(--space-xs);
    }

    .page-subtitle {
      color: var(--text-secondary);
      margin-bottom: var(--space-xl);
      font-size: 1rem;
    }

    .user-card-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: var(--space-md);
    }

    .user-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--space-sm);
      padding: var(--space-xl) var(--space-lg);
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--border-radius-lg);
      cursor: pointer;
      transition: all 0.2s ease;
      color: var(--text-primary);
      font-family: var(--font-sans);
      text-align: center;
      min-height: 120px;

      &:hover {
        border-color: var(--accent);
        background: var(--bg-card-hover);
        transform: translateY(-2px);
        box-shadow: 0 4px 16px rgba(79, 142, 247, 0.15);
      }
    }

    .user-card__name {
      font-size: 1.05rem;
      font-weight: 600;
    }

    .user-card__role {
      font-size: 0.72rem;
      font-weight: 700;
      padding: 3px 12px;
      border-radius: 4px;
      letter-spacing: 0.03em;
    }

    .user-card__role--lead {
      background: rgba(249, 115, 22, 0.2);
      color: #fb923c;
      border: 1px solid rgba(249, 115, 22, 0.4);
    }

    .user-card__role--member {
      background: rgba(79, 142, 247, 0.15);
      color: #60a5fa;
      border: 1px solid rgba(79, 142, 247, 0.3);
    }
  `]
})
export class LoginComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly users = signal<User[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');

  ngOnInit(): void {
    this.api.getUsers().subscribe({
      next: (users) => {
        this.users.set(users.filter(u => u.isActive));
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Unable to reach the server. Make sure the backend is running.');
        this.loading.set(false);
      }
    });
  }

  select(user: User): void {
    this.auth.setCurrentUser(user);
    this.router.navigate(['/home']);
  }
}
