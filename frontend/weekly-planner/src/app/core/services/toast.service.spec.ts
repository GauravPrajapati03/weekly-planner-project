import { TestBed } from '@angular/core/testing';
import { ToastService } from './toast.service';

/**
 * Unit tests for ToastService.
 * Uses vi.useFakeTimers() for the auto-dismiss timer (Vitest; no zone.js).
 */
describe('ToastService', () => {
    let service: ToastService;

    beforeEach(() => {
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({});
        service = TestBed.inject(ToastService);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should start with an empty toast list', () => {
        expect(service.toasts()).toEqual([]);
    });

    // ── success() ─────────────────────────────────────────────────────────────

    it('success() should add a success toast', () => {
        service.success('Great job!');
        expect(service.toasts()).toHaveLength(1);
        expect(service.toasts()[0].message).toBe('Great job!');
        expect(service.toasts()[0].type).toBe('success');
    });

    // ── error() ───────────────────────────────────────────────────────────────

    it('error() should add an error toast', () => {
        service.error('Something went wrong.');
        expect(service.toasts()[0].type).toBe('error');
        expect(service.toasts()[0].message).toBe('Something went wrong.');
    });

    // ── info() ────────────────────────────────────────────────────────────────

    it('info() should add an info toast', () => {
        service.info('FYI: plan frozen.');
        expect(service.toasts()[0].type).toBe('info');
        expect(service.toasts()[0].message).toBe('FYI: plan frozen.');
    });

    // ── IDs are unique and incrementing ───────────────────────────────────────

    it('each toast should receive a unique incrementing id', () => {
        service.success('First');
        service.success('Second');
        const [a, b] = service.toasts();
        expect(a.id).toBeLessThan(b.id);
        expect(a.id).not.toBe(b.id);
    });

    // ── dismiss() ─────────────────────────────────────────────────────────────

    it('dismiss() should remove the toast with the matching id', () => {
        service.success('A');
        service.success('B');
        const id = service.toasts()[0].id;
        service.dismiss(id);
        expect(service.toasts()).toHaveLength(1);
        expect(service.toasts()[0].message).toBe('B');
    });

    it('dismiss() with unknown id should leave the list unchanged', () => {
        service.success('Keep me');
        service.dismiss(9999);
        expect(service.toasts()).toHaveLength(1);
    });

    // ── auto-dismiss after 3500ms ─────────────────────────────────────────────

    it('toasts should auto-dismiss after 3500ms', () => {
        vi.useFakeTimers();
        service.success('Auto-dismiss me');
        expect(service.toasts()).toHaveLength(1);

        vi.advanceTimersByTime(3500);

        expect(service.toasts()).toHaveLength(0);
    });

    it('toast should NOT auto-dismiss before 3500ms', () => {
        vi.useFakeTimers();
        service.success('Still here');
        vi.advanceTimersByTime(3000); // only 3 seconds
        expect(service.toasts()).toHaveLength(1);
        vi.advanceTimersByTime(500);  // remaining 500ms
        expect(service.toasts()).toHaveLength(0);
    });

    it('multiple toasts each auto-dismiss independently', () => {
        vi.useFakeTimers();
        service.success('First');
        vi.advanceTimersByTime(2000);
        service.success('Second');  // added 2s after first
        vi.advanceTimersByTime(1500); // 3.5s since first → first dismissed, second still has 2s left
        expect(service.toasts()).toHaveLength(1);
        expect(service.toasts()[0].message).toBe('Second');
        vi.advanceTimersByTime(2000); // second auto-dismissed
        expect(service.toasts()).toHaveLength(0);
    });
});
