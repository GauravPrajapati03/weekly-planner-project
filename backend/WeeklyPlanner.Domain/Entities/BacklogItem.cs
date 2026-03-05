using System.ComponentModel.DataAnnotations.Schema;
using WeeklyPlanner.Domain.Enums;

namespace WeeklyPlanner.Domain.Entities;

/// <summary>
/// A unit of planned work stored in the team's backlog.
/// Backlog items are reusable across multiple planning weeks.
/// They have a lifecycle status (Available → InProgress → Done) that tracks
/// their progression through weekly plans.
/// </summary>
public class BacklogItem
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Short, meaningful title visible in planning views. Required.</summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>Optional detailed description explaining scope and acceptance criteria.</summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>Work category — drives how the team lead's budget percentages apply.</summary>
    public CategoryType Category { get; set; }

    /// <summary>
    /// Lifecycle status of this backlog item.
    /// Available = ready for planning, InProgress = in a frozen plan,
    /// Done = completed in a past week, Archived = manually hidden by lead.
    /// </summary>
    public BacklogItemStatus Status { get; set; } = BacklogItemStatus.Available;

    /// <summary>
    /// Backward-compatible computed property.
    /// Returns true when the item is not archived (i.e., Available, InProgress, or Done).
    /// </summary>
    [NotMapped]
    public bool IsActive => Status != BacklogItemStatus.Archived;

    /// <summary>Optional rough estimate in hours, shown in the backlog list (e.g. "12h est.").</summary>
    public int? EstimatedHours { get; set; }

    /// <summary>UTC timestamp when this backlog item was created. Used for newest-first sort order.</summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // ── Navigation Properties ──────────────────────────────────────────────
    /// <summary>All plan task entries that reference this backlog item.</summary>
    public ICollection<WeeklyPlanTask> PlanTasks { get; set; } = new List<WeeklyPlanTask>();
}
