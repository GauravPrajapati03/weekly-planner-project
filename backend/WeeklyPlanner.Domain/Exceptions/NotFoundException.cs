namespace WeeklyPlanner.Domain.Exceptions;

/// <summary>
/// Thrown when a requested entity (User, BacklogItem, WeeklyPlan, etc.) does not exist.
/// Maps to HTTP 404 Not Found.
/// </summary>
public class NotFoundException : DomainException
{
    public NotFoundException(string entityName, int id)
        : base($"{entityName} with ID {id} was not found.") { }
}
