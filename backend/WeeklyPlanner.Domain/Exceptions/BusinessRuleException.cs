namespace WeeklyPlanner.Domain.Exceptions;

/// <summary>
/// Thrown when a business rule is violated — for example:
/// - Category percentages don't sum to 100 (BR-1)
/// - Assigned hours would exceed 30 (BR-2)
/// - Modifying a frozen plan (BR-5)
/// - Attempting to create a second active plan (BR-6)
/// Maps to HTTP 400 Bad Request or 422 Unprocessable Entity.
/// </summary>
public class BusinessRuleException : DomainException
{
    public BusinessRuleException(string message) : base(message) { }
}
