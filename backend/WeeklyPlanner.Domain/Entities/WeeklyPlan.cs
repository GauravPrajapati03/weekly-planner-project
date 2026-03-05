using WeeklyPlanner.Domain.Enums;

namespace WeeklyPlanner.Domain.Entities;

/// <summary>
/// Represents one complete planning cycle covering Wednesday through the following Monday.
/// Planning happens on Tuesday. The team lead sets category allocation percentages
/// which determine how many of each member's 30 available hours must go to each category.
///
/// Lifecycle: Planning → Frozen → Completed
/// </summary>
public class WeeklyPlan
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>The Wednesday that starts the work period for this cycle.</summary>
    public DateTime WeekStartDate { get; set; }

    /// <summary>The Monday that ends the work period for this cycle.</summary>
    public DateTime WeekEndDate { get; set; }

    /// <summary>
    /// Percentage of hours allocated to Client Focused work (Category 1).
    /// Must be ≥ 0. Together with TechDebtPercent and RDPercent, must sum to exactly 100.
    /// </summary>
    public decimal ClientPercent { get; set; }

    /// <summary>
    /// Percentage of hours allocated to Technical Debt (Category 2).
    /// Must be ≥ 0.
    /// </summary>
    public decimal TechDebtPercent { get; set; }

    /// <summary>
    /// Percentage of hours allocated to Research and Development (Category 3).
    /// Must be ≥ 0.
    /// </summary>
    public decimal RDPercent { get; set; }

    /// <summary>
    /// Current state of this planning cycle. Controls what operations are permitted.
    /// See PlanStatus enum for transition rules.
    /// </summary>
    public PlanStatus Status { get; set; } = PlanStatus.Planning;

    /// <summary>
    /// Total hours available for planning = selected member count × 30h per person.
    /// Used to compute per-category budget: CategoryBudget = (Percent / 100) × TotalTeamHours.
    /// </summary>
    public decimal TotalTeamHours { get; set; } = 30m;

    /// <summary>
    /// Comma-separated list of User GUIDs that were selected for this planning cycle.
    /// Used to show all expected members in Review even if they have 0 tasks.
    /// </summary>
    public string SelectedMemberIdsJson { get; set; } = "";

    /// <summary>Helper to get/set the selected member IDs as a typed list.</summary>
    public List<Guid> GetSelectedMemberIds() =>
        string.IsNullOrWhiteSpace(SelectedMemberIdsJson)
            ? new List<Guid>()
            : SelectedMemberIdsJson.Split(',', StringSplitOptions.RemoveEmptyEntries)
                .Select(s => Guid.TryParse(s.Trim(), out var g) ? g : Guid.Empty)
                .Where(g => g != Guid.Empty)
                .ToList();

    public void SetSelectedMemberIds(IEnumerable<Guid> ids) =>
        SelectedMemberIdsJson = string.Join(",", ids.Select(g => g.ToString()));

    /// <summary>UTC timestamp when this plan was first created (on the Tuesday planning session).</summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>UTC timestamp when the Team Lead froze the plan. Null while still in Planning state.</summary>
    public DateTime? FrozenAt { get; set; }

    /// <summary>UTC timestamp when the plan was completed (closed out). Null if not yet completed.</summary>
    public DateTime? CompletedAt { get; set; }

    // ── Navigation Properties ──────────────────────────────────────────────
    /// <summary>All task assignments made under this planning cycle.</summary>
    public ICollection<WeeklyPlanTask> Tasks { get; set; } = new List<WeeklyPlanTask>();
}
