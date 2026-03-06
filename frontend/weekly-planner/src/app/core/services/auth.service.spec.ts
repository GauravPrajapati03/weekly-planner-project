import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { User } from '../models/models';

/**
 * Unit tests for AuthService.
 * Session management service using Angular signals with Vitest.
 */
describe('AuthService', () => {
    let service: AuthService;

    const mockLead: User = {
        id: 'lead-1',
        name: 'Alice',
        role: 'TeamLead',
        isActive: true
    };

    const mockMember: User = {
        id: 'member-1',
        name: 'Bob',
        role: 'TeamMember',
        isActive: true
    };

    beforeEach(() => {
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({});
        service = TestBed.inject(AuthService);
    });

    // ── Initial state ─────────────────────────────────────────────────────────

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should start with no current user', () => {
        expect(service.currentUser()).toBeNull();
    });

    it('should start with isLead === false when no user is set', () => {
        expect(service.isLead).toBe(false);
    });

    // ── setCurrentUser ────────────────────────────────────────────────────────

    it('setCurrentUser() should update the currentUser signal', () => {
        service.setCurrentUser(mockLead);
        expect(service.currentUser()).toEqual(mockLead);
    });

    it('setCurrentUser() with TeamLead should make isLead return true', () => {
        service.setCurrentUser(mockLead);
        expect(service.isLead).toBe(true);
    });

    it('setCurrentUser() with TeamMember should keep isLead false', () => {
        service.setCurrentUser(mockMember);
        expect(service.isLead).toBe(false);
    });

    it('setCurrentUser() twice should update to the latest user', () => {
        service.setCurrentUser(mockLead);
        service.setCurrentUser(mockMember);
        expect(service.currentUser()).toEqual(mockMember);
    });

    // ── clearUser ─────────────────────────────────────────────────────────────

    it('clearUser() should reset currentUser to null', () => {
        service.setCurrentUser(mockLead);
        service.clearUser();
        expect(service.currentUser()).toBeNull();
    });

    it('clearUser() should make isLead return false', () => {
        service.setCurrentUser(mockLead);
        service.clearUser();
        expect(service.isLead).toBe(false);
    });

    it('clearUser() when already null should not throw', () => {
        expect(() => service.clearUser()).not.toThrow();
        expect(service.currentUser()).toBeNull();
    });

    // ── isLead reactive behaviour ─────────────────────────────────────────────

    it('isLead should react correctly to sequential user changes', () => {
        service.setCurrentUser(mockMember);
        expect(service.isLead).toBe(false);

        service.setCurrentUser(mockLead);
        expect(service.isLead).toBe(true);

        service.clearUser();
        expect(service.isLead).toBe(false);
    });
});
