using Microsoft.AspNetCore.Mvc;
using WeeklyPlanner.Application.DTOs;
using WeeklyPlanner.Application.Interfaces;
using WeeklyPlanner.Domain.Enums;

namespace WeeklyPlanner.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BacklogController : ControllerBase
{
    private readonly IBacklogService _backlogService;
    public BacklogController(IBacklogService backlogService) => _backlogService = backlogService;

    /// <summary>Returns active backlog items. Optionally filter by category.</summary>
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] CategoryType? category)
    {
        var items = await _backlogService.GetAllBacklogItemsAsync(category);
        return Ok(items);
    }

    /// <summary>Returns ALL backlog items including archived ones (Manage Backlog page).</summary>
    [HttpGet("all")]
    public async Task<IActionResult> GetAllIncludingInactive([FromQuery] CategoryType? category)
    {
        var items = await _backlogService.GetAllBacklogItemsIncludingInactiveAsync(category);
        return Ok(items);
    }

    /// <summary>Creates a new backlog item.</summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateBacklogItemRequest request)
    {
        var created = await _backlogService.CreateBacklogItemAsync(request);
        return CreatedAtAction(nameof(GetAll), created);
    }

    /// <summary>Updates an existing backlog item.</summary>
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateBacklogItemRequest request)
    {
        var updated = await _backlogService.UpdateBacklogItemAsync(id, request);
        return Ok(updated);
    }

    /// <summary>Archives (soft-deletes) a backlog item.</summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await _backlogService.DeleteBacklogItemAsync(id);
        return NoContent();
    }

    /// <summary>Permanently and irreversibly deletes a backlog item.</summary>
    [HttpDelete("{id:guid}/permanent")]
    public async Task<IActionResult> DeletePermanently(Guid id)
    {
        await _backlogService.HardDeleteBacklogItemAsync(id);
        return NoContent();
    }
}
