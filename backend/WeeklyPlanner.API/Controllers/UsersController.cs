using Microsoft.AspNetCore.Mvc;
using WeeklyPlanner.Application.DTOs;
using WeeklyPlanner.Application.Interfaces;

namespace WeeklyPlanner.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;
    public UsersController(IUserService userService) => _userService = userService;

    /// <summary>Returns only ACTIVE team members (login picker).</summary>
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var users = await _userService.GetAllUsersAsync();
        return Ok(users);
    }

    /// <summary>Returns ALL team members including inactive (Manage Team page).</summary>
    [HttpGet("all")]
    public async Task<IActionResult> GetAllIncludingInactive()
    {
        var users = await _userService.GetAllUsersIncludingInactiveAsync();
        return Ok(users);
    }

    /// <summary>Creates a new team member.</summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateUserRequest request)
    {
        var created = await _userService.CreateUserAsync(request);
        return CreatedAtAction(nameof(GetAll), created);
    }

    /// <summary>Updates a team member — name, role (Make Lead), or active status (Deactivate/Activate).</summary>
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateUserRequest request)
    {
        var updated = await _userService.UpdateUserAsync(id, request);
        return Ok(updated);
    }
}
