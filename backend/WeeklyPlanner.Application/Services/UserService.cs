using WeeklyPlanner.Application.DTOs;
using WeeklyPlanner.Application.Interfaces;
using WeeklyPlanner.Domain.Entities;
using WeeklyPlanner.Domain.Exceptions;

namespace WeeklyPlanner.Application.Services;

/// <summary>
/// Handles all team member management operations.
/// </summary>
public class UserService : IUserService
{
    private readonly IUserRepository _userRepository;

    public UserService(IUserRepository userRepository)
    {
        _userRepository = userRepository;
    }

    private static UserDto ToDto(User u) => new(u.Id, u.Name, u.Role, u.IsActive);

    /// <inheritdoc />
    public async Task<IEnumerable<UserDto>> GetAllUsersAsync()
    {
        var users = await _userRepository.GetAllAsync();
        return users.Select(ToDto);
    }

    /// <inheritdoc />
    public async Task<IEnumerable<UserDto>> GetAllUsersIncludingInactiveAsync()
    {
        var users = await _userRepository.GetAllIncludingInactiveAsync();
        return users.Select(ToDto);
    }

    /// <inheritdoc />
    public async Task<UserDto> CreateUserAsync(CreateUserRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            throw new BusinessRuleException("User name is required.");

        var user = new User
        {
            Name = request.Name.Trim(),
            Role = request.Role,
            IsActive = true
        };

        var created = await _userRepository.AddAsync(user);
        await _userRepository.SaveChangesAsync();

        return ToDto(created);
    }

    /// <inheritdoc />
    public async Task<UserDto> UpdateUserAsync(int id, UpdateUserRequest request)
    {
        var user = await _userRepository.GetByIdAsync(id)
            ?? throw new NotFoundException("User", id);

        if (request.Name is not null)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
                throw new BusinessRuleException("User name cannot be empty.");
            user.Name = request.Name.Trim();
        }

        if (request.Role is not null)
            user.Role = request.Role.Value;

        if (request.IsActive is not null)
            user.IsActive = request.IsActive.Value;

        await _userRepository.SaveChangesAsync();
        return ToDto(user);
    }
}
