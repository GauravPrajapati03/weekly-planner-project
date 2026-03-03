using Microsoft.AspNetCore.Mvc;
using WeeklyPlanner.Application.DTOs;
using WeeklyPlanner.Application.Interfaces;
using WeeklyPlanner.Domain.Exceptions;

namespace WeeklyPlanner.API.Controllers;

/// <summary>
/// Manages the full weekly planning lifecycle:
/// create → assign tasks → freeze → update progress → complete.
/// Also exposes the Lead dashboard for aggregated team progress.
/// </summary>
[ApiController]
[Route("api/weeklyplan")]
public class WeeklyPlanController : ControllerBase
{
    private readonly IWeeklyPlanService _planService;
    private readonly IDashboardService _dashboardService;

    public WeeklyPlanController(IWeeklyPlanService planService, IDashboardService dashboardService)
    {
        _planService = planService;
        _dashboardService = dashboardService;
    }

    // ── Queries ────────────────────────────────────────────────────────────

    /// <summary>Returns all weekly plans (past and current), ordered by most recent first.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<WeeklyPlanDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll()
    {
        var plans = await _planService.GetAllPlansAsync();
        return Ok(plans);
    }

    /// <summary>
    /// Returns the currently active weekly plan (status = Planning or Frozen).
    /// Returns null if no active plan exists.
    /// </summary>
    [HttpGet("active")]
    [ProducesResponseType(typeof(WeeklyPlanDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> GetActive()
    {
        var plan = await _planService.GetActivePlanAsync();
        return plan is null ? NoContent() : Ok(plan);
    }

    /// <summary>
    /// Returns the aggregated team dashboard for a specific weekly plan.
    /// Includes total/category/user-level progress breakdowns.
    /// </summary>
    [HttpGet("{id:int}/dashboard")]
    [ProducesResponseType(typeof(DashboardDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetDashboard(int id)
    {
        var dashboard = await _dashboardService.GetDashboardAsync(id);
        return Ok(dashboard);
    }

    /// <summary>
    /// Returns all tasks assigned to a specific user within a plan.
    /// Used by team members to see only their own tasks.
    /// </summary>
    [HttpGet("{id:int}/tasks/user/{userId:int}")]
    [ProducesResponseType(typeof(IEnumerable<WeeklyPlanTaskDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetTasksByUser(int id, int userId)
    {
        var tasks = await _dashboardService.GetTasksByUserAsync(id, userId);
        return Ok(tasks);
    }

    // ── Commands ───────────────────────────────────────────────────────────

    /// <summary>
    /// Creates a new weekly planning cycle. Team Lead only.
    /// Percentages (Client + TechDebt + RD) must sum to exactly 100.
    /// Only one active plan is allowed at a time.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(WeeklyPlanDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create([FromBody] CreateWeeklyPlanRequest request)
    {
        var created = await _planService.CreateWeeklyPlanAsync(request);
        return CreatedAtAction(nameof(GetAll), new { id = created.Id }, created);
    }

    /// <summary>
    /// Assigns a backlog item to a user within a weekly plan.
    /// Validates 30h cap per user (BR-2) and category budget cap (BR-3).
    /// Only allowed while plan is in Planning status.
    /// </summary>
    [HttpPost("{id:int}/assign-task")]
    [ProducesResponseType(typeof(WeeklyPlanTaskDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AssignTask(int id, [FromBody] AssignTaskRequest request)
    {
        var task = await _planService.AssignTaskAsync(id, request);
        return CreatedAtAction(nameof(GetDashboard), new { id }, task);
    }

    /// <summary>
    /// Freezes the weekly plan. Team Lead only. Irreversible.
    /// After freezing, no structural changes can be made — only progress updates.
    /// </summary>
    [HttpPost("{id:int}/freeze")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Freeze(int id)
    {
        await _planService.FreezePlanAsync(id);
        return NoContent();
    }

    /// <summary>
    /// Updates the completed hours for a specific task. Only allowed on frozen plans (FR-6).
    /// CompletedHours must be ≥ 0 and ≤ PlannedHours (BR-4).
    /// </summary>
    [HttpPut("{id:int}/update-progress")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateProgress(int id, [FromBody] UpdateProgressRequest request)
    {
        await _planService.UpdateProgressAsync(id, request);
        return NoContent();
    }

    /// <summary>
    /// Marks a frozen weekly plan as completed, closing out the cycle.
    /// Team Lead only.
    /// </summary>
    [HttpPost("{id:int}/complete")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Complete(int id)
    {
        await _planService.CompletePlanAsync(id);
        return NoContent();
    }

    /// <summary>
    /// Cancels and permanently deletes the active week's plan and all its tasks.
    /// Team Lead only. Only works on plans in Planning status (not frozen).
    /// This erases all plans so the team can start over.
    /// </summary>
    [HttpDelete("{id:int}/cancel")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Cancel(int id)
    {
        await _planService.CancelPlanAsync(id);
        return NoContent();
    }
}
