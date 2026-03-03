using WeeklyPlanner.Domain.Enums;


namespace WeeklyPlanner.Application.DTOs;

// ─────────────────────────────────────────────────────────────────────────────
// USER DTOs
// ─────────────────────────────────────────────────────────────────────────────

/// <summary>Read model returned to clients for a team member.</summary>
public record UserDto(int Id, string Name, UserRole Role, bool IsActive);

/// <summary>Request model for creating a new team member.</summary>
public record CreateUserRequest(string Name, UserRole Role);

/// <summary>Request model for updating a team member's name, role, or active status.</summary>
public record UpdateUserRequest(string? Name, UserRole? Role, bool? IsActive);

// ─────────────────────────────────────────────────────────────────────────────
// BACKLOG DTOs
// ─────────────────────────────────────────────────────────────────────────────

/// <summary>Read model returned to clients for a backlog item.</summary>
public record BacklogItemDto(int Id, string Title, string Description, CategoryType Category, bool IsActive, int? EstimatedHours);

/// <summary>Request model for creating a new backlog item.</summary>
public record CreateBacklogItemRequest(string Title, string Description, CategoryType Category, int? EstimatedHours = null);

/// <summary>Request model for updating an existing backlog item (edit, unarchive, etc.).</summary>
public record UpdateBacklogItemRequest(string? Title, string? Description, CategoryType? Category, int? EstimatedHours, bool? IsActive = null);

// ─────────────────────────────────────────────────────────────────────────────
// WEEKLY PLAN DTOs
// ─────────────────────────────────────────────────────────────────────────────

/// <summary>Read model returned to clients for a weekly plan summary.</summary>
public record WeeklyPlanDto(
    int Id,
    DateTime WeekStartDate,
    DateTime WeekEndDate,
    decimal ClientPercent,
    decimal TechDebtPercent,
    decimal RDPercent,
    string Status,
    DateTime CreatedAt,
    DateTime? FrozenAt,
    DateTime? CompletedAt
);

/// <summary>Request model for creating a new weekly planning cycle (Team Lead only).</summary>
public record CreateWeeklyPlanRequest(
    DateTime WeekStartDate,
    decimal ClientPercent,
    decimal TechDebtPercent,
    decimal RDPercent
);

// ─────────────────────────────────────────────────────────────────────────────
// TASK ASSIGNMENT DTOs
// ─────────────────────────────────────────────────────────────────────────────

/// <summary>Read model for a task assignment within a plan, including backlog and user details.</summary>
public record WeeklyPlanTaskDto(
    int Id,
    int WeeklyPlanId,
    int BacklogItemId,
    string BacklogItemTitle,
    CategoryType Category,
    int AssignedUserId,
    string AssignedUserName,
    decimal PlannedHours,
    decimal CompletedHours,
    decimal ProgressPercent,
    WorkItemStatus Status
);

/// <summary>Request model for assigning a backlog item to a user within a weekly plan.</summary>
public record AssignTaskRequest(
    int BacklogItemId,
    int AssignedUserId,
    decimal PlannedHours
);

/// <summary>Request model for updating a task's completed hours and status (post-freeze progress tracking).</summary>
public record UpdateProgressRequest(int TaskId, decimal CompletedHours, WorkItemStatus? Status = null);

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD DTOs
// ─────────────────────────────────────────────────────────────────────────────

/// <summary>Aggregated dashboard data for a weekly plan — used by the Team Lead progress view.</summary>
public record DashboardDto(
    decimal TotalPlannedHours,
    decimal TotalCompletedHours,
    decimal OverallProgress,
    IEnumerable<CategoryProgressDto> CategoryBreakdown,
    IEnumerable<UserProgressDto> UserBreakdown,
    IEnumerable<WeeklyPlanTaskDto> Tasks
);

/// <summary>Progress summary for one category within a weekly plan.</summary>
public record CategoryProgressDto(
    string Category,
    decimal PlannedHours,
    decimal CompletedHours,
    decimal ProgressPercent
);

/// <summary>Progress summary for one user within a weekly plan.</summary>
public record UserProgressDto(
    int UserId,
    string UserName,
    decimal PlannedHours,
    decimal CompletedHours,
    decimal ProgressPercent,
    IEnumerable<WeeklyPlanTaskDto> Tasks
);
/// <summary>Root export/import payload representing the full app state.</summary>
public record AppExportDto(
    IEnumerable<AppExportUserDto>     Users,
    IEnumerable<AppExportBacklogDto>  BacklogItems,
    IEnumerable<AppExportPlanDto>     WeeklyPlans,
    IEnumerable<AppExportTaskDto>     WeeklyPlanTasks,
    DateTime ExportedAt
);

public record AppExportUserDto(int Id, string Name, UserRole Role, bool IsActive);

public record AppExportBacklogDto(
    int Id, string Title, string Description,
    CategoryType Category, bool IsActive, int? EstimatedHours);

public record AppExportPlanDto(
    int Id, DateTime WeekStartDate, DateTime WeekEndDate,
    decimal ClientPercent, decimal TechDebtPercent, decimal RDPercent,
    PlanStatus Status, DateTime CreatedAt, DateTime? FrozenAt, DateTime? CompletedAt);

public record AppExportTaskDto(
    int Id, int WeeklyPlanId, int BacklogItemId, int AssignedUserId,
    decimal PlannedHours, decimal CompletedHours, WorkItemStatus Status);
