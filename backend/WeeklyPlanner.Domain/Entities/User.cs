using WeeklyPlanner.Domain.Enums;

namespace WeeklyPlanner.Domain.Entities;

/// <summary>
/// Represents a team member participating in the weekly planning system.
/// Each user has exactly one role: TeamLead or TeamMember.
/// Only one user can hold the TeamLead role at a time.
/// </summary>
public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Full display name of the user (e.g., "Alice Chen").</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>The user's role — determines what actions they can perform.</summary>
    public UserRole Role { get; set; }

    /// <summary>Soft-delete flag. Inactive users cannot be assigned to new plans.</summary>
    public bool IsActive { get; set; } = true;

    // ── Navigation Properties ──────────────────────────────────────────────
    /// <summary>All tasks this user has been assigned across all weekly plans.</summary>
    public ICollection<WeeklyPlanTask> Tasks { get; set; } = new List<WeeklyPlanTask>();
}
