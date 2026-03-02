# 📘 Weekly Planner Application

---

## 📌 System Overview

### 1. Purpose

The Weekly Planner Application is a full-stack system built using:

- **.NET (C#)** – Backend REST API  
- **Angular (TypeScript)** – Frontend Single Page Application  

The system enables a development team to:

- Plan **30 hours** of weekly work  
- Allocate time across predefined categories  
- Assign backlog items to team members  
- Freeze the weekly plan  
- Track progress  
- Provide dashboard visibility to the team lead  

---

## 2. 👥 Actors & Roles

### 2.1 👨‍💻 Team Member

#### Permissions

- View backlog items  
- Participate in weekly planning  
- Assign backlog items to themselves  
- Update completed hours (after freeze)  
- View personal progress  

#### Restrictions

- Cannot set category percentages  
- Cannot freeze weekly plan  

---

### 2.2 👨‍💼 Team Lead

#### Permissions

- Create weekly plan  
- Set category percentages  
- Freeze weekly plan  
- View dashboard (aggregated progress)  
- View individual task progress  

---

## 3. 📚 Core Domain Concepts

### 3.1 Backlog Item

Represents potential work that may be planned in a weekly cycle.

#### Fields

- **Id** (int)  
- **Title** (string)  
- **Description** (string)  
- **Category** (Client | TechDebt | R&D)  
- **IsActive** (bool)  

#### Notes

- Backlog items are reusable across multiple weeks.  
- Backlog items cannot be deleted if used in an active weekly plan.  

---

### 3.2 Weekly Plan

Represents one planning cycle (**Wednesday to Monday**).

#### Fields

- **Id** (int)  
- **WeekStartDate** (DateTime)  
- **WeekEndDate** (DateTime)  
- **ClientPercent** (decimal)  
- **TechDebtPercent** (decimal)  
- **RDPercent** (decimal)  
- **Status** (Planning | Frozen | Completed)  

#### Business Rule

- Total available planning hours = **30 hours per week**.  

---

### 3.3 Weekly Plan Task

Represents assignment of a backlog item within a weekly plan.

#### Fields

- **Id** (int)  
- **WeeklyPlanId** (int)  
- **BacklogItemId** (int)  
- **AssignedUserId** (int)  
- **PlannedHours** (decimal)  
- **CompletedHours** (decimal)  

---

### 3.4 User

Represents a team member or team lead.

#### Fields

- **Id** (int)  
- **Name** (string)  
- **Role** (TeamMember | TeamLead)  

---


## 4. 📋 Functional Requirements

### FR-1 Backlog Management

The system must allow:

- Create backlog item  
- View backlog items  
- Filter backlog by category  

#### Constraints

- **Title** is required.  
- **Category** must be a valid enum value.  
- Cannot delete backlog item used in active plan.  

---

### FR-2 Weekly Plan Creation

Team Lead can:

- Create weekly plan  
- Set category percentage allocation  

#### Validation

- Percentages must sum to **exactly 100**.  
- Percentages must be **≥ 0**.  
- Only **one active weekly plan** allowed at a time.  

---

### FR-3 Category Allocation Calculation

Category hours are calculated as:
```
CategoryHours = 30 × (CategoryPercent / 100)
```

These values act as **strict capacity limits**.

---

### FR-4 Task Assignment (Planning State Only)

Users can:

- Assign backlog items to weekly plan  
- Specify planned hours  

#### Constraints

- Total planned hours ≤ 30  
- Category planned hours ≤ category allocation  
- Planned hours must be > 0  
- Assigned user must exist  
- Cannot assign tasks when plan is **Frozen**  

---

### FR-5 Freeze Weekly Plan

Only **Team Lead** can freeze a weekly plan.

#### After Freezing

**Not Allowed:**

- Adding new tasks  
- Modifying planned hours  
- Changing percentages  

**Allowed:**

- Updating completed hours  

Freeze is **irreversible**.

---

### FR-6 Progress Tracking

Users can update **CompletedHours** only when plan is **Frozen**.

#### Constraints

- CompletedHours ≥ 0  
- CompletedHours ≤ PlannedHours  

#### Progress Calculation
```
TaskProgress = (CompletedHours / PlannedHours) × 100
```

---

### FR-7 Dashboard (Lead View)

System must provide aggregated data:

- Total Planned Hours  
- Total Completed Hours  
- Overall Progress %  
- Category-wise progress  
- User-wise progress  
- Task-wise progress  

#### Overall Progress Formula
```
OverallProgress = SUM(CompletedHours) / SUM(PlannedHours)
```


---

## 5. 📐 Business Rules

- **BR-1:** Percentage total must equal 100.  
- **BR-2:** Total planned hours ≤ 30.  
- **BR-3:** Category planned hours ≤ allocated category hours.  
- **BR-4:** CompletedHours ≤ PlannedHours.  
- **BR-5:** Frozen plan prevents structural modifications.  
- **BR-6:** Only one active weekly plan allowed at a time.  
- **BR-7:** Planned hours must be positive.  

---

## 6. ⚠️ Edge Cases

- Decimal percentages (rounding must be handled consistently)  
- Negative hour input  
- Zero-hour assignments  
- Freeze empty plan (allowed but documented)  
- Overlapping weekly plans (not allowed)  
- Updating progress before freeze (not allowed)  

---

## 7 🏗 Technical Architecture

### 7.1 Solution Structure

```
WeeklyPlanner.sln
├── WeeklyPlanner.Domain
├── WeeklyPlanner.Application
├── WeeklyPlanner.Infrastructure
├── WeeklyPlanner.API
└── WeeklyPlanner.Tests
```

---

### 7.2 Domain Layer

**Purpose:**  
Contains core business models and rules.

#### Contains

- Entities  
- Enums  
- Domain Exceptions  
- Value Objects  

> ⚠️ No external dependencies allowed.

#### Entities

- User  
- BacklogItem  
- WeeklyPlan  
- WeeklyPlanTask  

#### Enums

- CategoryType  
- PlanStatus  
- UserRole  

---

### 7.3 Application Layer

**Purpose:**  
Contains business logic and application rules.

#### Contains

- Interfaces (e.g., `IWeeklyPlanService`)  
- Business logic  
- DTOs  
- Validation logic  

> ✅ Rules are enforced here.  
> ❌ No direct database access allowed.

---

### 7.4 Infrastructure Layer

**Purpose:**  
Handles data persistence and external implementations.

#### Contains

- EF Core DbContext  
- Repository implementations  
- Database configurations  

Implements interfaces defined in the **Application Layer**.

---

### 7.5 API Layer

**Purpose:**  
Exposes REST endpoints.

#### Contains

- Controllers  
- Middleware  
- Dependency Injection configuration  
- Exception handling  
- Swagger configuration  

> ⚠️ Controllers must remain thin.

---

### 7.6 Tests Project

**Purpose:**  
Ensures system reliability and correctness.

#### Contains

- Unit tests for Application layer  
- Mock repository implementations  
- Validation tests  
- Edge case tests  

#### Requirement

- **100% code coverage for committed code**

---

## 🔌 API Contracts

---

### 8.1 Backlog APIs

#### ➤ Create Backlog Item

**POST** `/api/backlog`

##### Request

```json
{
  "title": "Implement payment API",
  "description": "Stripe integration",
  "category": "Client"
}
```
##### Response
```json
{
  "id": 1,
  "title": "Implement payment API",
  "category": "Client"
}
```

---

#### ➤ Get All Backlog Items

#### GET /api/backlog

##### Response

```json
[
  {
    "id": 1,
    "title": "Implement payment API",
    "category": "Client"
  }
]
```
---
### 8.2 Weekly Plan APIs
---

#### POST /api/weeklyplan

##### Request:
```json
{
  "weekStartDate": "2026-03-04",
  "clientPercent": 40,
  "techDebtPercent": 40,
  "rdPercent": 20
}
```
---
#### POST /api/weeklyplan/{id}/assign-task

##### Request:

```json
{
  "backlogItemId": 5,
  "assignedUserId": 2,
  "plannedHours": 6
}
```
---

#### POST /api/weeklyplan/{id}/freeze

No request body.

---

#### PUT /api/weeklyplan/{id}/update-progress

##### Request:
```json
{
  "taskId": 10,
  "completedHours": 4
}

```
---
#### GET /api/weeklyplan/{id}/dashboard

##### Response:
```json
{
  "totalPlannedHours": 30,
  "totalCompletedHours": 18,
  "overallProgress": 60,
  "categoryBreakdown": [
    { "category": "Client", "progress": 70 },
    { "category": "TechDebt", "progress": 40 }
  ],
  "userBreakdown": [
    { "user": "John", "progress": 65 }
  ]
}
```
---

## 9. 🚀 Non-Functional Requirements

- 100% unit test coverage  
- No failing tests  
- Clean, readable, maintainable code  
- RESTful design  
- Proper error handling  
- Deployed backend & frontend  
- Private GitHub repository  
- Daily commits during office hours only  

---

## 10. 📎 Assumptions

- Total weekly capacity fixed at **30 hours**  
- Freeze is irreversible  
- One active weekly plan at a time  
- Authentication may be simplified if not required  
- UI must provide **dark mode** for better usability  

---

## 11. 📦 Deployment Requirement

### Backend

Deploy to cloud platform (e.g., Azure / Render / similar)

### Frontend

Deploy to static hosting (e.g., Vercel / Azure Static Web App)

> Deployment links must be included in the README.

---




