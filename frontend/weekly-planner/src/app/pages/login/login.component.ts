import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models/models';
import { CommonModule } from '@angular/common';

/**
 * Login Page — "Who are you?" screen.
 * Fetches all active team members and displays them as large clickable cards.
 * On click: sets authenticated user and navigates to Home.
 */
@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="login-page">
      <div class="login-card">
        <div class="login-logo">📋</div>
        <h1 class="login-title">Weekly Plan Tracker</h1>
        <p class="login-subtitle">Who are you? Click your name to get started.</p>

        @if (loading()) {
          <div class="text-center mt-lg">
            <div class="spinner"></div>
            <p class="text-muted mt-md">Loading team...</p>
          </div>
        } @else if (error()) {
          <div class="alert alert--error">{{ error() }}</div>
        } @else {
          <div class="user-grid">
            @for (user of users(); track user.id) {
              <button class="user-btn" (click)="select(user)">
                <span class="user-avatar">{{ initials(user.name) }}</span>
                <span class="user-name">{{ user.name }}</span>
                @if (user.role === 'TeamLead') {
                  <span class="badge badge--info" style="font-size:0.65rem;">Lead</span>
                }
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
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-xl);
      background-image: radial-gradient(ellipse at 20% 30%, rgba(79,142,247,0.08) 0%, transparent 60%),
                        radial-gradient(ellipse at 80% 70%, rgba(168,85,247,0.06) 0%, transparent 60%);
    }

    .login-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--border-radius-lg);
      padding: var(--space-2xl);
      max-width: 560px;
      width: 100%;
      text-align: center;
      box-shadow: var(--shadow-modal);
    }

    .login-logo {
      font-size: 3rem;
      margin-bottom: var(--space-md);
      display: block;
    }

    .login-title {
      font-size: 1.75rem;
      margin-bottom: var(--space-sm);
      background: linear-gradient(135deg, #fff, var(--accent));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .login-subtitle {
      color: var(--text-secondary);
      margin-bottom: var(--space-xl);
      font-size: 0.95rem;
    }

    .user-grid {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
    }

    .user-btn {
      display: flex;
      align-items: center;
      gap: var(--space-md);
      padding: var(--space-md) var(--space-lg);
      background: var(--bg-input);
      border: 1px solid var(--border);
      border-radius: var(--border-radius);
      cursor: pointer;
      transition: all 0.2s ease;
      text-align: left;
      color: var(--text-primary);
      font-family: var(--font-sans);
      font-size: 1rem;
      font-weight: 500;

      &:hover {
        border-color: var(--accent);
        background: var(--bg-card-hover);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px var(--accent-glow);
      }
    }

    .user-avatar {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--accent), #6366f1);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.85rem;
      font-weight: 700;
      flex-shrink: 0;
      color: #fff;
    }

    .user-name { flex: 1; }
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
        // If already logged in, redirect to home
        if (this.auth.currentUser()) {
            this.router.navigate(['/home']);
            return;
        }

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

    initials(name: string): string {
        return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    }
}
