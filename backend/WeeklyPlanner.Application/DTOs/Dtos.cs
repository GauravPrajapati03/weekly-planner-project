using WeeklyPlanner.Domain.Enums;

namespace WeeklyPlanner.Application.DTOs;

// ── USER ──────────────────────────────────────────────────────────────────────
public record UserDto(Guid Id, string Name, UserRole Role, bool IsActive);
public record CreateUserRequest(string Name, UserRole Role);
public record UpdateUserRequest(string? Name, UserRole? Role, bool? IsActive);

// ── BACKLOG ───────────────────────────────────────────────────────────────────

/// <summary>Backlog item returned to the client. Status is the string form of BacklogItemStatus.</summary>
public record BacklogItemDto(
    Guid Id,
    string Title,
    string Description,
    CategoryType Category,
    string Status,
    bool IsActive,
    int? EstimatedHours);

public record CreateBacklogItemRequest(
    string Title,
    string Description,
    CategoryType Category,
    int? EstimatedHours = null);

/// <summary>Partial update request. Status can be set to change the lifecycle state.</summary>
public record UpdateBacklogItemRequest(
    string? Title,
    string? Description,
    CategoryType? Category,
    int? EstimatedHours,
    BacklogItemStatus? Status = null);

// ── WEEKLY PLAN ───────────────────────────────────────────────────────────────
public record WeeklyPlanDto(
    Guid Id,
    DateTime WeekStartDate,
    DateTime WeekEndDate,
    decimal ClientPercent,
    decimal TechDebtPercent,
    decimal RDPercent,
    string Status,
    DateTime CreatedAt,
    DateTime? FrozenAt,
    DateTime? CompletedAt,
    decimal TotalTeamHours,
    List<string> SelectedMemberIds
);

public record CreateWeeklyPlanRequest(
    DateTime WeekStartDate,
    decimal ClientPercent,
    decimal TechDebtPercent,
    decimal RDPercent,
    decimal TotalTeamHours,
    List<Guid>? SelectedMemberIds = null
);

// ── TASK ASSIGNMENT ───────────────────────────────────────────────────────────
public record WeeklyPlanTaskDto(
    Guid Id,
    Guid WeeklyPlanId,
    Guid BacklogItemId,
    string BacklogItemTitle,
    CategoryType Category,
    Guid AssignedUserId,
    string AssignedUserName,
    decimal PlannedHours,
    decimal CompletedHours,
    decimal ProgressPercent,
    WorkItemStatus Status
);

public record AssignTaskRequest(
    Guid BacklogItemId,
    Guid AssignedUserId,
    decimal PlannedHours
);

public record UpdateProgressRequest(Guid TaskId, decimal CompletedHours, WorkItemStatus? Status = null);

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
public record DashboardDto(
    decimal TotalPlannedHours,
    decimal TotalCompletedHours,
    decimal OverallProgress,
    IEnumerable<CategoryProgressDto> CategoryBreakdown,
    IEnumerable<UserProgressDto> UserBreakdown,
    IEnumerable<WeeklyPlanTaskDto> Tasks
);

public record CategoryProgressDto(
    string Category,
    decimal PlannedHours,
    decimal CompletedHours,
    decimal ProgressPercent
);

public record UserProgressDto(
    Guid UserId,
    string UserName,
    decimal PlannedHours,
    decimal CompletedHours,
    decimal ProgressPercent,
    IEnumerable<WeeklyPlanTaskDto> Tasks
);

// ── EXPORT / IMPORT ───────────────────────────────────────────────────────────
public record AppExportDto(
    IEnumerable<AppExportUserDto>    Users,
    IEnumerable<AppExportBacklogDto> BacklogItems,
    IEnumerable<AppExportPlanDto>    WeeklyPlans,
    IEnumerable<AppExportTaskDto>    WeeklyPlanTasks,
    DateTime ExportedAt
);

public record AppExportUserDto(Guid Id, string Name, UserRole Role, bool IsActive);

public record AppExportBacklogDto(
    Guid Id, string Title, string Description,
    CategoryType Category, string Status, int? EstimatedHours);

public record AppExportPlanDto(
    Guid Id, DateTime WeekStartDate, DateTime WeekEndDate,
    decimal ClientPercent, decimal TechDebtPercent, decimal RDPercent,
    PlanStatus Status, DateTime CreatedAt, DateTime? FrozenAt, DateTime? CompletedAt);

public record AppExportTaskDto(
    Guid Id, Guid WeeklyPlanId, Guid BacklogItemId, Guid AssignedUserId,
    decimal PlannedHours, decimal CompletedHours, WorkItemStatus Status);
