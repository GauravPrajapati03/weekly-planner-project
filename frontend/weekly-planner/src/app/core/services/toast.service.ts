import { Injectable, signal } from '@angular/core';

export interface Toast {
    id: number;
    message: string;
    type: 'success' | 'error' | 'info';
}

/**
 * ToastService — provides application-wide toast notifications.
 * Auto-dismisses after 3.5 seconds. Bottom-right positioned via global CSS.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
    private _counter = 0;
    readonly toasts = signal<Toast[]>([]);

    success(message: string): void { this.add(message, 'success'); }
    error(message: string): void { this.add(message, 'error'); }
    info(message: string): void { this.add(message, 'info'); }

    dismiss(id: number): void {
        this.toasts.update(t => t.filter(x => x.id !== id));
    }

    private add(message: string, type: Toast['type']): void {
        const id = ++this._counter;
        this.toasts.update(t => [...t, { id, message, type }]);
        setTimeout(() => this.dismiss(id), 3500);
    }
}
