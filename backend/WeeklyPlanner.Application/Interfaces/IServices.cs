using WeeklyPlanner.Application.DTOs;
using WeeklyPlanner.Domain.Enums;

namespace WeeklyPlanner.Application.Interfaces;

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE INTERFACES
// These define the contract for all application-level business operations.
// Controllers depend only on these interfaces (not on concrete service classes).
// ─────────────────────────────────────────────────────────────────────────────

public interface IUserService
{
    Task<IEnumerable<UserDto>> GetAllUsersAsync();          // active only (login picker)
    Task<IEnumerable<UserDto>> GetAllUsersIncludingInactiveAsync(); // all (team management)
    Task<UserDto> CreateUserAsync(CreateUserRequest request);
    Task<UserDto> UpdateUserAsync(int id, UpdateUserRequest request);
}

public interface IBacklogService
{
    Task<IEnumerable<BacklogItemDto>> GetAllBacklogItemsAsync(CategoryType? category = null);
    Task<IEnumerable<BacklogItemDto>> GetAllBacklogItemsIncludingInactiveAsync(CategoryType? category = null);
    Task<BacklogItemDto> CreateBacklogItemAsync(CreateBacklogItemRequest request);
    Task<BacklogItemDto> UpdateBacklogItemAsync(int id, UpdateBacklogItemRequest request);
    Task DeleteBacklogItemAsync(int id);             // soft-delete (archive)
    Task HardDeleteBacklogItemAsync(int id);         // permanent delete
}

public interface IWeeklyPlanService
{
    Task<IEnumerable<WeeklyPlanDto>> GetAllPlansAsync();
    Task<WeeklyPlanDto?> GetActivePlanAsync();
    Task<WeeklyPlanDto> CreateWeeklyPlanAsync(CreateWeeklyPlanRequest request);
    Task<WeeklyPlanTaskDto> AssignTaskAsync(int weeklyPlanId, AssignTaskRequest request);
    Task FreezePlanAsync(int weeklyPlanId);
    Task UpdateProgressAsync(int weeklyPlanId, UpdateProgressRequest request);
    Task CompletePlanAsync(int weeklyPlanId);
    /// <summary>Cancels (deletes) an active Planning-status plan and all its tasks. Team Lead only.</summary>
    Task CancelPlanAsync(int weeklyPlanId);
}

public interface IDashboardService
{
    Task<DashboardDto> GetDashboardAsync(int weeklyPlanId);
    Task<IEnumerable<WeeklyPlanTaskDto>> GetTasksByUserAsync(int weeklyPlanId, int userId);
}
