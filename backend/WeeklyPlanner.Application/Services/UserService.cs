using WeeklyPlanner.Application.DTOs;
using WeeklyPlanner.Application.Interfaces;
using WeeklyPlanner.Domain.Entities;
using WeeklyPlanner.Domain.Enums;
using WeeklyPlanner.Domain.Exceptions;

namespace WeeklyPlanner.Application.Services;

/// <summary>
/// Business rules enforced here:
///   - There must always be exactly ONE TeamLead in the system.
///   - Promoting someone to TeamLead automatically demotes the current lead to TeamMember.
///   - Creating a new user with role TeamLead also auto-demotes the existing lead.
///   - Demoting a lead directly (setting role = TeamMember) is BLOCKED — the lead can only
///     be changed by promoting another member, which transfers the role atomically.
/// </summary>
public class UserService : IUserService
{
    private readonly IUserRepository _userRepository;
    public UserService(IUserRepository userRepository) => _userRepository = userRepository;

    private static UserDto ToDto(User u) => new(u.Id, u.Name, u.Role, u.IsActive);

    public async Task<IEnumerable<UserDto>> GetAllUsersAsync()
    {
        var users = await _userRepository.GetAllAsync();
        return users.Select(ToDto);
    }

    public async Task<IEnumerable<UserDto>> GetAllUsersIncludingInactiveAsync()
    {
        var users = await _userRepository.GetAllIncludingInactiveAsync();
        return users.Select(ToDto);
    }

    public async Task<UserDto> CreateUserAsync(CreateUserRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            throw new BusinessRuleException("User name is required.");

        // If creating a new TeamLead, demote the current lead first.
        if (request.Role == UserRole.TeamLead)
            await DemoteCurrentLeadAsync();

        var user = new User { Name = request.Name.Trim(), Role = request.Role, IsActive = true };
        var created = await _userRepository.AddAsync(user);
        await _userRepository.SaveChangesAsync();
        return ToDto(created);
    }

    public async Task<UserDto> UpdateUserAsync(Guid id, UpdateUserRequest request)
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
        {
            var newRole = request.Role.Value;

            if (newRole == UserRole.TeamLead && user.Role != UserRole.TeamLead)
            {
                // Promote: demote any existing lead first (atomic swap).
                await DemoteCurrentLeadAsync();
                user.Role = UserRole.TeamLead;
            }
            else if (newRole == UserRole.TeamMember && user.Role == UserRole.TeamLead)
            {
                // Cannot directly demote the current lead — this would leave no lead.
                // The lead must be changed by promoting another member.
                throw new BusinessRuleException(
                    "Cannot remove the Team Lead role directly. " +
                    "Promote another member to Team Lead first — this will automatically transfer the role.");
            }
            else
            {
                user.Role = newRole;
            }
        }

        if (request.IsActive is not null) user.IsActive = request.IsActive.Value;

        await _userRepository.SaveChangesAsync();
        return ToDto(user);
    }

    // ── Private Helpers ────────────────────────────────────────────────────────

    /// <summary>
    /// Finds all current TeamLeads and downgrades them to TeamMember.
    /// Does NOT call SaveChangesAsync — caller is responsible for saving.
    /// </summary>
    private async Task DemoteCurrentLeadAsync()
    {
        // GetAllIncludingInactiveAsync so we catch deactivated leads too.
        var allUsers = await _userRepository.GetAllIncludingInactiveAsync();
        foreach (var lead in allUsers.Where(u => u.Role == UserRole.TeamLead))
            lead.Role = UserRole.TeamMember;
        // Note: no SaveChangesAsync here — the caller's SaveChangesAsync will flush both changes.
    }
}
