using WeeklyPlanner.Application.DTOs;
using WeeklyPlanner.Domain.Enums;

namespace WeeklyPlanner.Application.Interfaces;

public interface IUserService
{
    Task<IEnumerable<UserDto>> GetAllUsersAsync();
    Task<IEnumerable<UserDto>> GetAllUsersIncludingInactiveAsync();
    Task<UserDto> CreateUserAsync(CreateUserRequest request);
    Task<UserDto> UpdateUserAsync(Guid id, UpdateUserRequest request);
}

public interface IBacklogService
{
    Task<IEnumerable<BacklogItemDto>> GetAllBacklogItemsAsync(CategoryType? category = null);
    Task<IEnumerable<BacklogItemDto>> GetAllBacklogItemsIncludingInactiveAsync(CategoryType? category = null);
    Task<BacklogItemDto> CreateBacklogItemAsync(CreateBacklogItemRequest request);
    Task<BacklogItemDto> UpdateBacklogItemAsync(Guid id, UpdateBacklogItemRequest request);
    Task DeleteBacklogItemAsync(Guid id);
    Task HardDeleteBacklogItemAsync(Guid id);
}

public interface IWeeklyPlanService
{
    Task<IEnumerable<WeeklyPlanDto>> GetAllPlansAsync();
    Task<WeeklyPlanDto?> GetActivePlanAsync();
    Task<WeeklyPlanDto> CreateWeeklyPlanAsync(CreateWeeklyPlanRequest request);
    Task<WeeklyPlanTaskDto> AssignTaskAsync(Guid weeklyPlanId, AssignTaskRequest request);
    Task RemoveTaskAsync(Guid weeklyPlanId, Guid taskId);
    Task FreezePlanAsync(Guid weeklyPlanId);
    Task UpdateProgressAsync(Guid weeklyPlanId, UpdateProgressRequest request);
    Task CompletePlanAsync(Guid weeklyPlanId);
    Task CancelPlanAsync(Guid weeklyPlanId);
}

public interface IDashboardService
{
    Task<DashboardDto> GetDashboardAsync(Guid weeklyPlanId);
    Task<IEnumerable<WeeklyPlanTaskDto>> GetTasksByUserAsync(Guid weeklyPlanId, Guid userId);
}
