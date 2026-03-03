namespace WeeklyPlanner.Domain.Enums;

/// <summary>
/// Represents the lifecycle state of a weekly planning cycle.
/// Planning  → Tasks can be assigned and modified.
/// Frozen    → Plan is locked; only CompletedHours can be updated.
/// Completed → Week is closed out and archived.
/// </summary>
public enum PlanStatus
{
    Planning = 0,
    Frozen = 1,
    Completed = 2
}
