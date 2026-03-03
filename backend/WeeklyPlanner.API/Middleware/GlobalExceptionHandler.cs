using Microsoft.AspNetCore.Mvc;
using WeeklyPlanner.Domain.Exceptions;

namespace WeeklyPlanner.API.Middleware;

/// <summary>
/// Global exception handling middleware.
/// Catches DomainException subclasses and returns structured ProblemDetails responses.
/// Catches any unexpected exceptions and returns a generic 500 without leaking stack traces.
/// </summary>
public class GlobalExceptionHandler : IMiddleware
{
    private readonly ILogger<GlobalExceptionHandler> _logger;

    public GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger) => _logger = logger;

    public async Task InvokeAsync(HttpContext context, RequestDelegate next)
    {
        try
        {
            await next(context);
        }
        catch (NotFoundException ex)
        {
            _logger.LogWarning("Not found: {Message}", ex.Message);
            context.Response.StatusCode = StatusCodes.Status404NotFound;
            await WriteErrorAsync(context, ex.Message, StatusCodes.Status404NotFound);
        }
        catch (BusinessRuleException ex)
        {
            _logger.LogWarning("Business rule violation: {Message}", ex.Message);
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            await WriteErrorAsync(context, ex.Message, StatusCodes.Status400BadRequest);
        }
        catch (DomainException ex)
        {
            _logger.LogWarning("Domain exception: {Message}", ex.Message);
            context.Response.StatusCode = StatusCodes.Status422UnprocessableEntity;
            await WriteErrorAsync(context, ex.Message, StatusCodes.Status422UnprocessableEntity);
        }
        catch (Exception ex)
        {
            // Log full details server-side but never expose internals to the client
            _logger.LogError(ex, "Unhandled exception occurred");
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            await WriteErrorAsync(context, "An unexpected error occurred. Please try again later.",
                StatusCodes.Status500InternalServerError);
        }
    }

    private static async Task WriteErrorAsync(HttpContext context, string detail, int statusCode)
    {
        context.Response.ContentType = "application/problem+json";
        var problem = new ProblemDetails
        {
            Status = statusCode,
            Title = GetTitle(statusCode),
            Detail = detail
        };
        await context.Response.WriteAsJsonAsync(problem);
    }

    private static string GetTitle(int statusCode) => statusCode switch
    {
        400 => "Bad Request",
        404 => "Not Found",
        422 => "Unprocessable Entity",
        _ => "Internal Server Error"
    };
}
