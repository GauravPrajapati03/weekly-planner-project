import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { CommonModule } from '@angular/common';

/**
 * Navbar — fixed top bar shown on every page.
 * Shows: logo, current user name, theme toggle, Switch User, and Home buttons.
 * Home button is hidden when already on the /home page.
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
        <!-- Theme toggle button -->
        <button
          class="theme-toggle"
          (click)="theme.toggle()"
          [attr.aria-label]="theme.isDark ? 'Switch to light mode' : 'Switch to dark mode'"
          [title]="theme.isDark ? 'Switch to light mode' : 'Switch to dark mode'">
          <span class="theme-icon">{{ theme.isDark ? '☀️' : '🌙' }}</span>
          <span class="theme-label">{{ theme.isDark ? 'Light' : 'Dark' }}</span>
        </button>

        <button class="btn btn--ghost btn--sm" (click)="switchUser()">🔄 Switch</button>

        <!-- Home button only shown when NOT on the home page -->
        @if (!isOnHome()) {
          <a routerLink="/home" class="btn btn--ghost btn--sm">🏠 Home</a>
        }
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
      align-items: center;
      gap: var(--space-sm);
    }

    /* Theme toggle */
    .theme-toggle {
      display: flex;
      align-items: center;
      gap: 5px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 999px;
      padding: 0.3rem 0.75rem;
      cursor: pointer;
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--text-secondary);
      transition: all 0.2s ease;
      white-space: nowrap;
      &:hover {
        border-color: var(--accent);
        color: var(--text-primary);
        background: var(--bg-card-hover);
      }
    }
    .theme-icon { font-size: 1rem; line-height: 1; }
    .theme-label { font-size: 0.75rem; }

    @media (max-width: 640px) {
      .navbar__logo-text { display: none; }
      .theme-label { display: none; }
      .navbar { padding: 0 var(--space-md); }
    }
  `]
})
export class NavbarComponent {
  readonly auth = inject(AuthService);
  readonly theme = inject(ThemeService);
  private readonly router = inject(Router);

  /** True when the current URL is the home page — hides the Home button */
  isOnHome(): boolean {
    return this.router.url === '/home' || this.router.url.startsWith('/home?');
  }

  switchUser(): void {
    this.auth.clearUser();
    this.router.navigate(['/login']);
  }
}
