using Microsoft.AspNetCore.Mvc;
using WeeklyPlanner.Application.DTOs;
using WeeklyPlanner.Application.Interfaces;
using WeeklyPlanner.Domain.Enums;
using WeeklyPlanner.Domain.Exceptions;

namespace WeeklyPlanner.API.Controllers;

/// <summary>
/// Manages the team backlog — the pool of work items available for planning.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class BacklogController : ControllerBase
{
    private readonly IBacklogService _backlogService;

    public BacklogController(IBacklogService backlogService) => _backlogService = backlogService;

    /// <summary>Returns active backlog items. Optionally filter by category.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<BacklogItemDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll([FromQuery] CategoryType? category)
    {
        var items = await _backlogService.GetAllBacklogItemsAsync(category);
        return Ok(items);
    }

    /// <summary>Returns ALL backlog items including archived ones — used by the Manage Backlog page.</summary>
    [HttpGet("all")]
    [ProducesResponseType(typeof(IEnumerable<BacklogItemDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAllIncludingInactive([FromQuery] CategoryType? category)
    {
        var items = await _backlogService.GetAllBacklogItemsIncludingInactiveAsync(category);
        return Ok(items);
    }

    /// <summary>Creates a new backlog item. Title and Category are required.</summary>
    [HttpPost]
    [ProducesResponseType(typeof(BacklogItemDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create([FromBody] CreateBacklogItemRequest request)
    {
        var created = await _backlogService.CreateBacklogItemAsync(request);
        return CreatedAtAction(nameof(GetAll), created);
    }

    /// <summary>Updates an existing backlog item — title, description, category, or estimated hours.</summary>
    [HttpPut("{id:int}")]
    [ProducesResponseType(typeof(BacklogItemDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateBacklogItemRequest request)
    {
        var updated = await _backlogService.UpdateBacklogItemAsync(id, request);
        return Ok(updated);
    }

    /// <summary>Archives (soft-deletes) a backlog item. Fails if used in an active plan.</summary>
    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Delete(int id)
    {
        await _backlogService.DeleteBacklogItemAsync(id);
        return NoContent();
    }

    /// <summary>
    /// Permanently and irreversibly deletes a backlog item.
    /// Fails if the item has ever been referenced in any plan (use Archive instead).
    /// </summary>
    [HttpDelete("{id:int}/permanent")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> DeletePermanently(int id)
    {
        await _backlogService.HardDeleteBacklogItemAsync(id);
        return NoContent();
    }
}

