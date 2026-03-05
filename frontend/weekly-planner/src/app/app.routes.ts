import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

/** Application routes — all pages are lazy-loaded for performance. */
export const routes: Routes = [
    // Root → onboarding first time, login after that (onboarding auto-redirects if users exist)
    { path: '', redirectTo: 'onboarding', pathMatch: 'full' },
    {
        path: 'onboarding',
        loadComponent: () =>
            import('./pages/onboarding/onboarding.component').then(m => m.OnboardingComponent),
    },
    {
        path: 'login',
        loadComponent: () =>
            import('./pages/login/login.component').then(m => m.LoginComponent),
    },
    {
        path: 'home',
        canActivate: [authGuard],
        loadComponent: () =>
            import('./pages/home/home.component').then(m => m.HomeComponent),
    },
    {
        path: 'backlog',
        canActivate: [authGuard],
        loadComponent: () =>
            import('./pages/manage-backlog/manage-backlog.component').then(m => m.ManageBacklogComponent),
    },
    {
        path: 'team',
        canActivate: [authGuard],
        loadComponent: () =>
            import('./pages/manage-team/manage-team.component').then(m => m.ManageTeamComponent),
    },
    {
        path: 'week/setup',
        canActivate: [authGuard],
        loadComponent: () =>
            import('./pages/week-setup/week-setup.component').then(m => m.WeekSetupComponent),
    },
    {
        path: 'week/plan',
        canActivate: [authGuard],
        loadComponent: () =>
            import('./pages/plan-my-work/plan-my-work.component').then(m => m.PlanMyWorkComponent),
    },
    {
        path: 'week/review',
        canActivate: [authGuard],
        loadComponent: () =>
            import('./pages/review-freeze/review-freeze.component').then(m => m.ReviewFreezeComponent),
    },
    {
        path: 'week/progress',
        canActivate: [authGuard],
        loadComponent: () =>
            import('./pages/update-progress/update-progress.component').then(m => m.UpdateProgressComponent),
    },
    {
        path: 'week/team-progress',
        canActivate: [authGuard],
        loadComponent: () =>
            import('./pages/team-progress/team-progress.component').then(m => m.TeamProgressComponent),
    },
    {
        path: 'past-weeks',
        canActivate: [authGuard],
        loadComponent: () =>
            import('./pages/past-weeks/past-weeks.component').then(m => m.PastWeeksComponent),
    },
    { path: '**', redirectTo: 'onboarding' },
];
