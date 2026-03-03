using WeeklyPlanner.Domain.Enums;

namespace WeeklyPlanner.Domain.Entities;

/// <summary>
/// A unit of planned work stored in the team's backlog.
/// Backlog items are reusable across multiple planning weeks.
/// They can be soft-deleted (IsActive = false) but cannot be hard-deleted
/// if they are referenced by any active weekly plan task.
/// </summary>
public class BacklogItem
{
    public int Id { get; set; }

    /// <summary>Short, meaningful title visible in planning views. Required.</summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>Optional detailed description explaining scope and acceptance criteria.</summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>Work category — drives how the team lead's budget percentages apply.</summary>
    public CategoryType Category { get; set; }

    /// <summary>
    /// Soft-delete flag. When false, the item no longer appears in planning views
    /// but its historical data in completed weeks is preserved.
    /// </summary>
    public bool IsActive { get; set; } = true;

    /// <summary>Optional rough estimate in hours, shown in the backlog list (e.g. "12h est.").</summary>
    public int? EstimatedHours { get; set; }

    // ── Navigation Properties ──────────────────────────────────────────────
    /// <summary>All plan task entries that reference this backlog item.</summary>
    public ICollection<WeeklyPlanTask> PlanTasks { get; set; } = new List<WeeklyPlanTask>();
}
