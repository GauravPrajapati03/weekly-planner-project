import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastService } from './core/services/toast.service';
import { CommonModule } from '@angular/common';

/**
 * Root application component.
 * Hosts the router outlet and the global toast notification display.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  template: `
    <router-outlet />

    <!-- Global Toast Notifications -->
    <div class="toast-container">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="toast toast--{{ toast.type }}">
          <span class="toast-icon">
            @if (toast.type === 'success') { ✅ }
            @else if (toast.type === 'error') { ❌ }
            @else { ℹ️ }
          </span>
          <span>{{ toast.message }}</span>
          <button class="btn btn--ghost btn--sm" (click)="toastService.dismiss(toast.id)"
            style="margin-left:auto; padding: 0 0.4rem;">✕</button>
        </div>
      }
    </div>
  `,
})
export class App {
  readonly toastService = inject(ToastService);
}
