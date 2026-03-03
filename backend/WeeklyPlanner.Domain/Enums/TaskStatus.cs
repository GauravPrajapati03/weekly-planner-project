namespace WeeklyPlanner.Domain.Enums;

/// <summary>
/// Represents the progress state of a single work item (task assignment).
/// Named WorkItemStatus to avoid conflict with System.Threading.Tasks.TaskStatus.
///
/// Transition rules (enforced in Application layer):
///   NotStarted  → InProgress  (valid)
///   InProgress  → Completed   (valid)
///   NotStarted  → Completed   (INVALID — must pass through InProgress first)
///   Any         → Blocked     (valid from any state)
///   Blocked     → InProgress  (valid — resumes work)
/// </summary>
public enum WorkItemStatus
{
    NotStarted = 0,
    InProgress = 1,
    Completed  = 2,
    Blocked    = 3
}
