using Microsoft.AspNetCore.Mvc;
using WeeklyPlanner.Application.DTOs;
using WeeklyPlanner.Application.Interfaces;

namespace WeeklyPlanner.API.Controllers;

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

    // ── Queries ──────────────────────────────────────────────────────────────

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var plans = await _planService.GetAllPlansAsync();
        return Ok(plans);
    }

    [HttpGet("active")]
    public async Task<IActionResult> GetActive()
    {
        var plan = await _planService.GetActivePlanAsync();
        return plan is null ? NoContent() : Ok(plan);
    }

    [HttpGet("{id:guid}/dashboard")]
    public async Task<IActionResult> GetDashboard(Guid id)
    {
        var dashboard = await _dashboardService.GetDashboardAsync(id);
        return Ok(dashboard);
    }

    [HttpGet("{id:guid}/tasks/user/{userId:guid}")]
    public async Task<IActionResult> GetTasksByUser(Guid id, Guid userId)
    {
        var tasks = await _dashboardService.GetTasksByUserAsync(id, userId);
        return Ok(tasks);
    }

    // ── Commands ─────────────────────────────────────────────────────────────

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateWeeklyPlanRequest request)
    {
        var created = await _planService.CreateWeeklyPlanAsync(request);
        return CreatedAtAction(nameof(GetAll), new { id = created.Id }, created);
    }

    [HttpPost("{id:guid}/assign-task")]
    public async Task<IActionResult> AssignTask(Guid id, [FromBody] AssignTaskRequest request)
    {
        var task = await _planService.AssignTaskAsync(id, request);
        return CreatedAtAction(nameof(GetDashboard), new { id }, task);
    }

    [HttpDelete("{id:guid}/tasks/{taskId:guid}")]
    public async Task<IActionResult> RemoveTask(Guid id, Guid taskId)
    {
        await _planService.RemoveTaskAsync(id, taskId);
        return NoContent();
    }

    [HttpPost("{id:guid}/freeze")]
    public async Task<IActionResult> Freeze(Guid id)
    {
        await _planService.FreezePlanAsync(id);
        return NoContent();
    }

    [HttpPut("{id:guid}/update-progress")]
    public async Task<IActionResult> UpdateProgress(Guid id, [FromBody] UpdateProgressRequest request)
    {
        await _planService.UpdateProgressAsync(id, request);
        return NoContent();
    }

    [HttpPost("{id:guid}/complete")]
    public async Task<IActionResult> Complete(Guid id)
    {
        await _planService.CompletePlanAsync(id);
        return NoContent();
    }

    [HttpDelete("{id:guid}/cancel")]
    public async Task<IActionResult> Cancel(Guid id)
    {
        await _planService.CancelPlanAsync(id);
        return NoContent();
    }
}
