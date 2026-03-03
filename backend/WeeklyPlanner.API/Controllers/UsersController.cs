using Microsoft.AspNetCore.Mvc;
using WeeklyPlanner.Application.DTOs;
using WeeklyPlanner.Application.Interfaces;
using WeeklyPlanner.Domain.Exceptions;

namespace WeeklyPlanner.API.Controllers;

/// <summary>
/// Manages team members — creating, listing, and updating users.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;

    public UsersController(IUserService userService) => _userService = userService;

    /// <summary>Returns only ACTIVE team members (used by the Login page to pick who is logged in).</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<UserDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll()
    {
        var users = await _userService.GetAllUsersAsync();
        return Ok(users);
    }

    /// <summary>Returns ALL team members including inactive (used by the Manage Team page).</summary>
    [HttpGet("all")]
    [ProducesResponseType(typeof(IEnumerable<UserDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAllIncludingInactive()
    {
        var users = await _userService.GetAllUsersIncludingInactiveAsync();
        return Ok(users);
    }

    /// <summary>Creates a new team member.</summary>
    [HttpPost]
    [ProducesResponseType(typeof(UserDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create([FromBody] CreateUserRequest request)
    {
        var created = await _userService.CreateUserAsync(request);
        return CreatedAtAction(nameof(GetAll), created);
    }

    /// <summary>Updates a team member — can change name, role (Make Lead), or active status (Deactivate/Activate).</summary>
    [HttpPut("{id:int}")]
    [ProducesResponseType(typeof(UserDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateUserRequest request)
    {
        var updated = await _userService.UpdateUserAsync(id, request);
        return Ok(updated);
    }
}
