namespace WeeklyPlanner.Domain.Exceptions;

/// <summary>
/// Base exception for all domain-level business rule violations.
/// These are expected exceptional conditions (not bugs) that the Application
/// layer catches and translates into appropriate HTTP responses (400/409 etc.).
/// </summary>
public class DomainException : Exception
{
    public DomainException(string message) : base(message) { }
}
