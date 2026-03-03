import { Component, inject } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CommonModule } from '@angular/common';

/**
 * Navbar — fixed top bar shown on every page.
 * Shows: logo, current user name, Switch User, and Home buttons.
 */
@Component({
    selector: 'app-navbar',
    standalone: true,
    imports: [RouterLink, CommonModule],
    template: `
    <nav class="navbar">
      <div class="navbar__brand">
        <a routerLink="/home" class="navbar__logo">
          <span class="navbar__logo-icon">📋</span>
          <span class="navbar__logo-text">Weekly Plan Tracker</span>
        </a>
      </div>

      <div class="navbar__center">
        @if (auth.currentUser()) {
          <span class="navbar__user-chip">
            <span class="user-dot" [class.user-dot--lead]="auth.isLead"></span>
            {{ auth.currentUser()?.name }}
            @if (auth.isLead) {
              <span class="badge badge--info" style="font-size:0.65rem; padding: 0.1rem 0.45rem;">Lead</span>
            }
          </span>
        }
      </div>

      <div class="navbar__actions">
        <button class="btn btn--ghost btn--sm" (click)="switchUser()">🔄 Switch</button>
        <a routerLink="/home" class="btn btn--ghost btn--sm">🏠 Home</a>
      </div>
    </nav>
  `,
    styles: [`
    .navbar {
      position: fixed;
      top: 0; left: 0; right: 0;
      height: 60px;
      background: var(--bg-navbar);
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      padding: 0 var(--space-xl);
      gap: var(--space-lg);
      z-index: 900;
      backdrop-filter: blur(10px);
    }

    .navbar__brand { flex: 0 0 auto; }

    .navbar__logo {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      text-decoration: none;
      color: var(--text-primary);
      font-weight: 700;
      font-size: 1rem;
      letter-spacing: -0.01em;
      transition: opacity 0.2s;
      &:hover { opacity: 0.8; }
    }

    .navbar__logo-icon { font-size: 1.2rem; }

    .navbar__center {
      flex: 1;
      display: flex;
      justify-content: center;
    }

    .navbar__user-chip {
      display: flex;
      align-items: center;
      gap: var(--space-sm);
      background: rgba(255,255,255,0.05);
      border: 1px solid var(--border);
      border-radius: 999px;
      padding: 0.25rem 0.85rem;
      font-size: 0.85rem;
      color: var(--text-primary);
    }

    .user-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--text-muted);
      &.user-dot--lead { background: var(--accent); box-shadow: 0 0 6px var(--accent); }
    }

    .navbar__actions {
      display: flex;
      gap: var(--space-sm);
    }

    @media (max-width: 600px) {
      .navbar__logo-text { display: none; }
      .navbar { padding: 0 var(--space-md); }
    }
  `]
})
export class NavbarComponent {
    readonly auth = inject(AuthService);
    private readonly router = inject(Router);

    switchUser(): void {
        this.auth.clearUser();
        this.router.navigate(['/login']);
    }
}
