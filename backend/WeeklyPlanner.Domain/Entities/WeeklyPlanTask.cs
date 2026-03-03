using WeeklyPlanner.Domain.Enums;

namespace WeeklyPlanner.Domain.Entities;

/// <summary>
/// Represents a single backlog item assigned to a specific user within a weekly plan.
/// During Planning: PlannedHours is set and can be modified.
/// After Freeze:    Only CompletedHours and Status can be updated to track actual progress.
///
/// Business constraints (enforced in the Application layer):
/// - PlannedHours must be > 0
/// - Total PlannedHours per user per week must not exceed 30
/// - Total PlannedHours per category must not exceed the plan's percentage allocation
/// - CompletedHours must be ≥ 0 (may exceed PlannedHours — overrun is allowed with a warning)
/// - Status transitions: NotStarted→InProgress→Completed; any→Blocked; Blocked→InProgress
/// </summary>
public class WeeklyPlanTask
{
    public int Id { get; set; }

    /// <summary>The weekly plan this task belongs to.</summary>
    public int WeeklyPlanId { get; set; }

    /// <summary>The backlog item being worked on.</summary>
    public int BacklogItemId { get; set; }

    /// <summary>The team member responsible for this task.</summary>
    public int AssignedUserId { get; set; }

    /// <summary>
    /// Number of hours this user commits to spending on this task during the week.
    /// Locked after the plan is frozen.
    /// </summary>
    public decimal PlannedHours { get; set; }

    /// <summary>
    /// Actual hours the user has reported spending on this task.
    /// Can only be updated while the plan is in Frozen state.
    /// May exceed PlannedHours (overrun) — tracked with a warning.
    /// </summary>
    public decimal CompletedHours { get; set; } = 0;

    /// <summary>
    /// Current progress status of this task.
    /// Default: NotStarted. Updated by the assigned member during the Frozen phase.
    /// </summary>
    public WorkItemStatus Status { get; set; } = WorkItemStatus.NotStarted;

    // ── Navigation Properties ──────────────────────────────────────────────
    public WeeklyPlan WeeklyPlan { get; set; } = null!;
    public BacklogItem BacklogItem { get; set; } = null!;
    public User AssignedUser { get; set; } = null!;
}
