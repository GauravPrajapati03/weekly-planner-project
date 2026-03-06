import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { LoginComponent } from './login.component';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models/models';
import { environment } from '../../../environments/environment';

/**
 * Unit tests for LoginComponent.
 * Tests the "Who are you?" landing page: loading users, error handling, and login action.
 */
describe('LoginComponent', () => {
    let fixture: ComponentFixture<LoginComponent>;
    let component: LoginComponent;
    let httpMock: HttpTestingController;
    let authService: AuthService;

    const mockUsers: User[] = [
        { id: 'u1', name: 'Alice', role: 'TeamLead', isActive: true },
        { id: 'u2', name: 'Bob', role: 'TeamMember', isActive: true },
        { id: 'u3', name: 'Carl', role: 'TeamMember', isActive: false }, // inactive
    ];

    beforeEach(async () => {
        TestBed.resetTestingModule();
        await TestBed.configureTestingModule({
            imports: [LoginComponent],
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                provideRouter([])
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(LoginComponent);
        component = fixture.componentInstance;
        httpMock = TestBed.inject(HttpTestingController);
        authService = TestBed.inject(AuthService);
    });

    afterEach(() => httpMock.verify());

    // ── Creation ──────────────────────────────────────────────────────────────

    it('should create', () => {
        // Flush the automatic ngOnInit request
        fixture.detectChanges();
        httpMock.expectOne(`${environment.apiUrl}/users`).flush([]);
        expect(component).toBeTruthy();
    });

    it('should start in loading state', () => {
        expect(component.loading()).toBe(true);
    });

    // ── ngOnInit: success path ─────────────────────────────────────────────────

    it('should load active users on init and filter inactive ones', () => {
        fixture.detectChanges();  // triggers ngOnInit
        httpMock.expectOne(`${environment.apiUrl}/users`).flush(mockUsers);

        // Only active users (isActive: true) should appear in the signal
        expect(component.users()).toHaveLength(2);
        expect(component.users().find(u => u.name === 'Carl')).toBeUndefined();
        expect(component.loading()).toBe(false);
        expect(component.error()).toBe('');
    });

    // ── ngOnInit: error path ───────────────────────────────────────────────────

    it('should show an error message if the API call fails', () => {
        fixture.detectChanges();
        httpMock.expectOne(`${environment.apiUrl}/users`)
            .error(new ProgressEvent('error'), { status: 500 });

        expect(component.error()).toContain('Unable to reach');
        expect(component.loading()).toBe(false);
    });

    // ── select() ──────────────────────────────────────────────────────────────

    it('select() should call authService.setCurrentUser with the clicked user', () => {
        fixture.detectChanges();
        httpMock.expectOne(`${environment.apiUrl}/users`).flush(mockUsers);

        const spy = vi.spyOn(authService, 'setCurrentUser');
        component.select(mockUsers[0]);
        expect(spy).toHaveBeenCalledWith(mockUsers[0]);
    });
});
