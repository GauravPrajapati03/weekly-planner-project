# 📅 Weekly Plan Tracker

> A full-stack team productivity application that helps engineering teams plan, track, and review their weekly work — built with **Angular 19** and **.NET 8** (Clean Architecture), hosted on **Azure**.

---

## 🔗 Live Deployment

| Service | URL |
|---|---|
| 🌐 **Frontend App** | https://jolly-flower-0c7507b00.1.azurestaticapps.net/ |
| ⚙️ **Backend REST API** | https://weekly-planner-project-api.azurewebsites.net/api |
| 📖 **API Documentation (Swagger)** | https://weekly-planner-project-api.azurewebsites.net/swagger/index.html |
| ❤️ **API Health Check** | https://weekly-planner-project-api.azurewebsites.net/health |

---

## 📖 About the App

Weekly Plan Tracker is a browser-only team planning tool designed for engineering teams that follow a weekly work cadence. Every Tuesday, the team lead sets the weekly category budget (Client Focused / Tech Debt / R&D), selects team members, and each member claims items from the shared backlog to fill their 30-hour week. Once all plans are in place, the team lead freezes the plan, members update their daily progress, and at the end of the week the lead marks it complete. Past weeks are archived for historical review.

### Core Workflow

```
Tuesday: Lead sets up the week (dates, category %, members)
       ↓
Members plan their 30 hours by picking backlog items
       ↓
Lead reviews all plans & freezes them (no more changes)
       ↓
Members update task progress daily (Not Started → In Progress → Completed/Blocked)
       ↓
Lead views team progress dashboard & marks week as Completed
       ↓
Past weeks archived for historical review
```

---

## 🛠️ Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| Angular | 19 | SPA framework (standalone components) |
| TypeScript | 5.x | Type-safe scripting |
| Angular Signals | built-in | Reactive state management |
| Vitest | 4.x | Unit testing framework |
| Angular CLI | 19 | Build tooling |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| .NET / ASP.NET Core | 8.0 | REST API framework |
| Entity Framework Core | 8.x | ORM + migrations |
| Azure SQL | — | Relational database |
| Swagger / Swashbuckle | — | API documentation |
| xUnit | — | Unit testing framework |
| Moq | — | Mocking library |
| FluentAssertions | — | Test assertion library |

### Cloud Infrastructure (Azure)
| Service | Purpose |
|---|---|
| Azure Static Web Apps | Hosts the Angular frontend |
| Azure App Service | Hosts the .NET backend API |
| Azure SQL Database | Production relational database |
| GitHub Actions | CI/CD pipeline (auto-deploy on push to `main`) |

---

## 🏗️ Architecture

The backend follows **Clean Architecture** (Onion Architecture) with strict layer separation:

```
┌──────────────────────────────────────────────────────┐
│                  WeeklyPlanner.API                   │  ← HTTP layer (Controllers, Middleware)
├──────────────────────────────────────────────────────┤
│              WeeklyPlanner.Application               │  ← Business logic (Services, DTOs)
├──────────────────────────────────────────────────────┤
│            WeeklyPlanner.Infrastructure              │  ← Data access (EF Core, Repositories)
├──────────────────────────────────────────────────────┤
│               WeeklyPlanner.Domain                   │  ← Core entities, enums, exceptions
└──────────────────────────────────────────────────────┘
```

**Dependency Rule:** Outer layers depend on inner layers. Domain has zero dependencies.

---

## 📁 Project Structure

```
Weekly Planner Project/
├── backend/
│   ├── WeeklyPlanner.API/              # ASP.NET Core Web API
│   │   ├── Controllers/
│   │   │   ├── AdminController.cs      # Seed & reset endpoints
│   │   │   ├── BacklogController.cs    # Backlog CRUD
│   │   │   ├── UsersController.cs      # User management
│   │   │   └── WeeklyPlanController.cs # Plan lifecycle + dashboard
│   │   ├── Middleware/
│   │   │   └── GlobalExceptionHandler.cs
│   │   ├── Program.cs                  # DI registration, CORS, Swagger
│   │   ├── appsettings.json
│   │   └── appsettings.Production.json
│   │
│   ├── WeeklyPlanner.Application/      # Business logic layer
│   │   ├── DTOs/                       # Request/Response contracts
│   │   ├── Interfaces/                 # Service + repository interfaces
│   │   └── Services/                   # UserService, BacklogService, WeeklyPlanService, DashboardService
│   │
│   ├── WeeklyPlanner.Domain/           # Core domain (no dependencies)
│   │   ├── Entities/                   # BacklogItem, User, WeeklyPlan, WeeklyPlanTask
│   │   ├── Enums/                      # UserRole, CategoryType, WeeklyPlanStatus, BacklogItemStatus
│   │   └── Exceptions/                 # Domain-specific exceptions (ValidationException, NotFoundException)
│   │
│   ├── WeeklyPlanner.Infrastructure/   # Data access layer
│   │   ├── Data/
│   │   │   └── AppDbContext.cs         # EF Core DbContext + Fluent API config
│   │   ├── Repositories/               # IBacklogRepository, IUserRepository, IWeeklyPlanRepository
│   │   └── Migrations/
│   │
│   └── WeeklyPlanner.Tests/            # xUnit test project (80 tests)
│       ├── BacklogServiceTests.cs
│       ├── UserServiceTests.cs
│       ├── WeeklyPlanServiceTests.cs
│       └── DashboardServiceTests.cs
│
└── frontend/
    └── weekly-planner/
        └── src/app/
            ├── core/
            │   ├── guards/             # AuthGuard (redirects unauthenticated users)
            │   ├── models/             # TypeScript interfaces (User, BacklogItem, WeeklyPlan, Dashboard)
            │   └── services/
            │       ├── api.service.ts      # All HTTP calls (single entry point)
            │       ├── auth.service.ts     # Session management (Angular Signals)
            │       ├── theme.service.ts    # Dark/light mode toggle + localStorage
            │       └── toast.service.ts    # Auto-dismissing toast notifications
            │
            ├── pages/                  # 11 routed page components
            │   ├── onboarding/         # First-run user setup
            │   ├── login/              # Who are you? user selection
            │   ├── home/               # Dashboard hub with contextual action cards
            │   ├── manage-backlog/     # Backlog CRUD + archive + search + filters
            │   ├── manage-team/        # Add/edit/deactivate team members
            │   ├── week-setup/         # Create a new weekly plan (Lead only)
            │   ├── plan-my-work/       # Claim backlog items for personal 30h plan
            │   ├── review-freeze/      # Lead reviews all member plans & freezes
            │   ├── team-progress/      # Real-time team progress dashboard (Frozen week)
            │   ├── update-progress/    # Member updates their own task statuses
            │   └── past-weeks/         # Historical completed week archive
            │
            └── shared/
                └── navbar/             # Global navigation with theme toggle + user switch
```

---

## 📄 Page Descriptions

### 🟢 Onboarding (`/onboarding`)
First-run experience. Shown when no users exist in the database. The first name entered automatically becomes the **Team Lead**; all subsequent names are assigned the **Team Member** role. Members can be promoted to lead or removed before setup is complete.

### 👤 Login (`/login`)
A simple "Who are you?" selection screen. Displays all active team members as clickable cards. Selecting a card sets the current session user (no passwords — team-internal tool).

### 🏠 Home (`/home`)
The central hub. Shows **contextual action cards** depending on the current user's role (Lead/Member) and the active weekly plan's status (no plan / Planning / Frozen / Completed). Lead-only actions (set up week, freeze plan, finish week) are hidden from members.

### 📋 Manage Backlog (`/backlog`)
Full CRUD interface for the shared team backlog. Supports:
- Adding items with title, description, category, and estimated hours
- Filtering by category (Client Focused / Tech Debt / R&D) and status (Available / In Progress / Done / Archived)
- Full-text search by title
- Archiving and restoring items
- Category is **locked** after creation (cannot be changed on edit)

### 👥 Manage Team (`/team`)
Team Lead–only page. Add new members, rename existing ones, promote/demote between Team Lead and Team Member roles, and deactivate / reactivate members.

### 🗓️ Week Setup (`/week-setup`) — *Lead only*
Shown on Tuesdays. Lead selects:
- The planning date (must be a Tuesday)
- Category budget percentages (Client % + Tech Debt % + R&D % = exactly 100%)
- Which active team members participate this week
Creates the weekly plan in the backend.

### 🗂️ Plan My Work (`/plan-my-work`)
Each member's personal planning page. Shows the shared backlog with items already claimed by others marked as "taken". Member selects items and sets their personal hours. A progress bar tracks how close they are to the 30-hour target. Category budget cards show team-wide claimed hours.

### 🔍 Review & Freeze (`/review-freeze`) — *Lead only*
Lead reviews the full team's plan before locking it. Shows:
- Per-member hours planned (must be 30h each)
- Category summary vs budget (must match percentages)
- Expandable task list per member
- Warns about unmet conditions; freeze button is enabled only when all conditions are met

### 📊 Team Progress (`/team-progress`)
Read-only dashboard visible to all during a **Frozen** week. Shows real-time:
- Overall team progress bar
- Task counts (total / done / blocked)
- Per-category breakdown (expandable)
- Per-member breakdown (expandable) with task-level details

### ✏️ Update Progress (`/update-progress`)
Each member's daily update screen. Lists all their planned tasks with current status. An edit modal allows updating completed hours and changing status (Not Started → In Progress → Completed / Blocked).

### 📚 Past Weeks (`/past-weeks`)
Read-only archive of all completed weeks. Select any past week to view its full dashboard snapshot including task breakdown, category performance, and per-member summaries.

---

## 🔌 API Reference

Base URL: `https://weekly-planner-project-api.azurewebsites.net/api`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/users` | Get all active users |
| `GET` | `/users/all` | Get all users including inactive |
| `POST` | `/users` | Create a new user |
| `PUT` | `/users/{id}` | Update user (name, role, isActive) |
| `DELETE` | `/users/{id}` | Delete a user |
| `GET` | `/backlog` | Get available backlog items |
| `GET` | `/backlog/all` | Get all items including archived |
| `POST` | `/backlog` | Create a new backlog item |
| `PUT` | `/backlog/{id}` | Update a backlog item |
| `DELETE` | `/backlog/{id}` | Delete a backlog item |
| `GET` | `/weeklyplan/active` | Get the current active plan |
| `GET` | `/weeklyplan` | Get all weekly plans |
| `POST` | `/weeklyplan` | Create a new weekly plan |
| `POST` | `/weeklyplan/{id}/freeze` | Freeze the active plan |
| `POST` | `/weeklyplan/{id}/complete` | Mark the plan as completed |
| `DELETE` | `/weeklyplan/{id}/cancel` | Cancel / delete a plan |
| `GET` | `/weeklyplan/{id}/dashboard` | Get dashboard data for a plan |
| `GET` | `/weeklyplan/{id}/tasks/user/{uid}` | Get a member's tasks for a plan |
| `PUT` | `/weeklyplan/{id}/update-progress` | Update a task's hours + status |
| `POST` | `/weeklyplan/{id}/claim` | Claim a backlog item into My Plan |
| `DELETE` | `/weeklyplan/{id}/unclaim/{taskId}` | Remove an item from My Plan |
| `POST` | `/admin/seed` | Seed sample data |
| `DELETE` | `/admin/reset` | Reset all application data |
| `GET` | `/health` | API health check |

Full interactive docs available at the [Swagger UI](https://weekly-planner-project-api.azurewebsites.net/swagger/index.html).

---

## 🚀 Running Locally

### Prerequisites

| Tool | Version |
|---|---|
| Node.js | 18+ |
| Angular CLI | `npm install -g @angular/cli` |
| .NET SDK | 8.0 |
| SQL Server | LocalDB / SQL Server Express (or use Azure SQL) |

---

### 1. Clone the Repository

```bash
git clone https://github.com/GauravPrajapati03/weekly-planner-project.git
cd weekly-planner-project
```

---

### 2. Backend Setup

```bash
cd backend
```

**Configure the database connection** — create `appsettings.local.json` inside `WeeklyPlanner.API/`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=(localdb)\\mssqllocaldb;Database=WeeklyPlannerDB;Trusted_Connection=True;"
  }
}
```

> **Note:** `appsettings.local.json` is `.gitignore`-d to keep secrets out of source control.

**Run the API:**

```bash
dotnet run --project WeeklyPlanner.API
```

API will be available at: `http://localhost:5244`
Swagger UI: `http://localhost:5244/swagger`

**Point the frontend at your local API** — edit `frontend/weekly-planner/src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5244/api'   // ← uncomment this
  // apiUrl: 'https://weekly-planner-project-api.azurewebsites.net/api'
};
```

---

### 3. Frontend Setup

```bash
cd frontend/weekly-planner
npm install
ng serve
```

App will be available at: `http://localhost:4200`

> **⚠️ Important:** Before committing, make sure `environment.ts` points back to the **Azure API URL**, not localhost, so the deployed app continues to work.

---

## ✅ Running Tests

### Backend Tests (xUnit)

```bash
cd backend/WeeklyPlanner.Tests
dotnet test
```

Expected output:
```
Test summary: total: 80, failed: 0, succeeded: 80, skipped: 0
```

**What is tested:**
- `UserServiceTests` — CRUD operations, role validation, active/inactive toggling
- `BacklogServiceTests` — Create, update, archive, status transitions
- `WeeklyPlanServiceTests` — Plan lifecycle (create → freeze → complete → cancel)
- `DashboardServiceTests` — Progress calculations, category breakdown, member breakdown

---

### Frontend Tests (Vitest via Angular CLI)

```bash
cd frontend/weekly-planner
ng test
```

Expected output:
```
Test Files  18 passed (18)
Tests       238 passed (238)
```

**What is tested (238 tests across 18 spec files):**

| Spec File | Tests | Coverage |
|---|---|---|
| `auth.service.spec.ts` | 11 | Session signals, isLead, clearUser |
| `auth.guard.spec.ts` | 4 | Auth redirect when unauthenticated |
| `theme.service.spec.ts` | 11 | Dark/light toggle, localStorage persistence |
| `toast.service.spec.ts` | 11 | Add/dismiss toasts, auto-dismiss timer |
| `api.service.spec.ts` | 27 | All 23 HTTP endpoints via mock HTTP |
| `navbar.component.spec.ts` | 8 | isOnHome, switchUser, theme toggle |
| `login.component.spec.ts` | 5 | User loading, filter inactive, select |
| `onboarding.component.spec.ts` | 9 | Add member, make lead, remove member |
| `manage-backlog.component.spec.ts` | 22 | Add/edit/archive, search, filter tabs |
| `week-setup.component.spec.ts` | 17 | isTuesday, recalc%, canSubmit, create |
| `home.component.spec.ts` | 20 | All plan states, finishWeek, cancelPlan |
| `review-freeze.component.spec.ts` | 15 | memberRows, categoryRows, freeze, cancel |
| `team-progress.component.spec.ts` | 13 | Stats, toggleDetail, completeWeek |
| `update-progress.component.spec.ts` | 18 | Modal open/close/save, status transitions |
| `manage-team.component.spec.ts` | 11 | CRUD, makeLead, toggleActive, initials |
| `past-weeks.component.spec.ts` | 15 | Completed plans, selectPlan, task stats |
| `plan-my-work.component.spec.ts` | 20 | Claim/unclaim, hours validation, progress |
| `app.spec.ts` | 1 | App bootstrap smoke test |

**Test patterns used:**
- `HttpTestingController` — every HTTP call is intercepted with mock data; no real API is ever called
- `vi.spyOn(router, 'navigate').mockResolvedValue(true)` — router navigation assertions
- `vi.useFakeTimers()` / `vi.advanceTimersByTime()` — timer-dependent tests (toast auto-dismiss)
- `TestBed.resetTestingModule()` — ensures a clean DI context per test to prevent "already instantiated" conflicts
- `fixture.whenStable()` — waits for async operations (Promise.all) before asserting signals

---

## 🔄 CI/CD Pipeline

Automated deployments are configured with **GitHub Actions** (`.github/workflows/`).

| Trigger | Action |
|---|---|
| Push to `main` | Deploy frontend to Azure Static Web Apps |
| Push to `main` | Deploy backend to Azure App Service |
| Pull Request | Build + test validation |

The pipeline runs `dotnet test` and `ng test` before every deployment. A failing test blocks the merge.

---

## 🌿 Git Branching Strategy

```
main         ← Production branch (protected) — deploys to Azure on every push
  └── dev    ← Integration branch — PRs merged here first
        └── feature/xxx  ← Individual feature branches
```

**Workflow:**
1. Create a feature branch off `dev`
2. Open a PR into `dev`
3. After review and tests pass → merge to `dev`
4. Open a PR from `dev` → `main` to deploy to production

---

## 🔒 Environment Variables & Secrets

No secrets are stored in source control. The following are configured via Azure App Service **environment variables** (Application Settings):

| Variable | Description |
|---|---|
| `ConnectionStrings__DefaultConnection` | Azure SQL connection string |
| `ASPNETCORE_ENVIRONMENT` | Set to `Production` in Azure |

For local development, use `appsettings.local.json` (gitignored).

---

## 🏷️ Key Design Decisions

| Decision | Rationale |
|---|---|
| Standalone Angular components | No NgModules — cleaner DI and lazy loading |
| Angular Signals (not RxJS) | Simpler reactive state without observable chain complexity |
| Single `ApiService` | All HTTP calls in one place — easy to mock in tests |
| `BacklogItemStatus` enum | Replaces boolean `IsActive` — supports Available / InProgress / Done / Archived states |
| Category locked after creation | Matches demo app behaviour — prevents data integrity issues in active plans |
| Promise.all for parallel API calls | Dashboard loads plan + users simultaneously to reduce latency |
| Clean Architecture backend | Domain layer has zero external dependencies — fully unit-testable without a database |

---

## 📊 Test Coverage Summary

| Layer | Tests | Status |
|---|---|---|
| Frontend (Vitest) | **238 / 238** | ✅ All passing |
| Backend (xUnit) | **80 / 80** | ✅ All passing |
| **Total** | **318** | ✅ 100% passing |

---

## 👨‍💻 Author

**Gaurav Prajapati**
Built as part of the ThinkBridge / ThinkSchool engineering exercise.

---

## 📝 License

This project is for educational and internal evaluation purposes only.