namespace WeeklyPlanner.Domain.Entities;

/// <summary>
/// Represents a single backlog item assigned to a specific user within a weekly plan.
/// During Planning: PlannedHours is set and can be modified.
/// After Freeze: Only CompletedHours can be updated to track actual progress.
///
/// Business constraints (enforced in the Application layer):
/// - PlannedHours must be > 0
/// - Total PlannedHours per user per week must not exceed 30
/// - Total PlannedHours per category must not exceed the plan's percentage allocation
/// - CompletedHours must be ≥ 0 and ≤ PlannedHours
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
    /// Default is 0 (no progress reported yet).
    /// </summary>
    public decimal CompletedHours { get; set; } = 0;

    // ── Navigation Properties ──────────────────────────────────────────────
    public WeeklyPlan WeeklyPlan { get; set; } = null!;
    public BacklogItem BacklogItem { get; set; } = null!;
    public User AssignedUser { get; set; } = null!;
}
