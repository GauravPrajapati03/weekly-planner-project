namespace WeeklyPlanner.Domain.Enums;

/// <summary>
/// Lifecycle status of a backlog item.
///
/// Transition rules (enforced in Application layer):
///   Available  → InProgress  (auto: when plan containing this item is frozen)
///   Available  → Archived    (manual: lead archives the item)
///   InProgress → Done        (auto: when the weekly plan is completed)
///   InProgress → Available   (auto: when the weekly plan is cancelled)
///   Archived   → Available   (manual: lead unarchives the item)
///   Done       → Available   (manual: lead moves it back to backlog)
/// </summary>
public enum BacklogItemStatus
{
    /// <summary>Ready to be picked for weekly planning.</summary>
    Available = 0,

    /// <summary>Currently assigned in an active (frozen) weekly plan.</summary>
    InProgress = 1,

    /// <summary>Work was completed in a past week.</summary>
    Done = 2,

    /// <summary>Manually archived by the team lead; hidden from planning views.</summary>
    Archived = 3
}
