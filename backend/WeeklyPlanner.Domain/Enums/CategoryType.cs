namespace WeeklyPlanner.Domain.Enums;

/// <summary>
/// The three work categories used to classify backlog items and budget weekly capacity.
/// Category 1 = Client Focused work
/// Category 2 = Technical Debt reduction
/// Category 3 = Research and Development
/// </summary>
public enum CategoryType
{
    Client = 1,
    TechDebt = 2,
    RnD = 3
}
