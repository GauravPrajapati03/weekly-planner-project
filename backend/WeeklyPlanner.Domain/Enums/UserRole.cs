namespace WeeklyPlanner.Domain.Enums;

/// <summary>
/// Defines the two roles in the system.
/// TeamLead has elevated privileges: can create weeks, set budgets, freeze plans, and view all progress.
/// TeamMember can plan their own 30 hours and update their own task progress.
/// </summary>
public enum UserRole
{
    TeamMember = 0,
    TeamLead = 1
}
