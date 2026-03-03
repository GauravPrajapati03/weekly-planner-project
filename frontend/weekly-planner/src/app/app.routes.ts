import { Routes } from '@angular/router';

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
        loadComponent: () =>
            import('./pages/home/home.component').then(m => m.HomeComponent),
    },
    {
        path: 'backlog',
        loadComponent: () =>
            import('./pages/manage-backlog/manage-backlog.component').then(m => m.ManageBacklogComponent),
    },
    {
        path: 'team',
        loadComponent: () =>
            import('./pages/manage-team/manage-team.component').then(m => m.ManageTeamComponent),
    },
    {
        path: 'week/setup',
        loadComponent: () =>
            import('./pages/week-setup/week-setup.component').then(m => m.WeekSetupComponent),
    },
    {
        path: 'week/plan',
        loadComponent: () =>
            import('./pages/plan-my-work/plan-my-work.component').then(m => m.PlanMyWorkComponent),
    },
    {
        path: 'week/review',
        loadComponent: () =>
            import('./pages/review-freeze/review-freeze.component').then(m => m.ReviewFreezeComponent),
    },
    {
        path: 'week/progress',
        loadComponent: () =>
            import('./pages/update-progress/update-progress.component').then(m => m.UpdateProgressComponent),
    },
    {
        path: 'week/team-progress',
        loadComponent: () =>
            import('./pages/team-progress/team-progress.component').then(m => m.TeamProgressComponent),
    },
    {
        path: 'past-weeks',
        loadComponent: () =>
            import('./pages/past-weeks/past-weeks.component').then(m => m.PastWeeksComponent),
    },
    { path: '**', redirectTo: 'onboarding' },
];

