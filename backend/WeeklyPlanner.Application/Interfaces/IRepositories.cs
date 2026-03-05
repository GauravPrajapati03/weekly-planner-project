using WeeklyPlanner.Domain.Entities;
using WeeklyPlanner.Domain.Enums;

namespace WeeklyPlanner.Application.Interfaces;

public interface IUserRepository
{
    Task<IEnumerable<User>> GetAllAsync();
    Task<IEnumerable<User>> GetAllIncludingInactiveAsync();
    Task<User?> GetByIdAsync(Guid id);
    Task<User> AddAsync(User user);
    Task SaveChangesAsync();
}

public interface IBacklogItemRepository
{
    Task<IEnumerable<BacklogItem>> GetAllAsync(CategoryType? category = null);
    Task<IEnumerable<BacklogItem>> GetAllIncludingInactiveAsync(CategoryType? category = null);
    Task<BacklogItem?> GetByIdAsync(Guid id);
    Task<bool> IsUsedInActivePlanAsync(Guid backlogItemId);
    Task<bool> IsReferencedInAnyPlanAsync(Guid backlogItemId);
    Task<BacklogItem> AddAsync(BacklogItem item);
    void Remove(BacklogItem item);
    Task SaveChangesAsync();
}

public interface IWeeklyPlanRepository
{
    Task<IEnumerable<WeeklyPlan>> GetAllAsync();
    Task<WeeklyPlan?> GetByIdAsync(Guid id);
    Task<WeeklyPlan?> GetByIdWithTasksAsync(Guid id);
    Task<WeeklyPlan?> GetActivePlanAsync();
    Task<bool> AnyActivePlanExistsAsync();
    Task<WeeklyPlan> AddAsync(WeeklyPlan plan);
    Task DeletePlanWithTasksAsync(WeeklyPlan plan);
    Task SaveChangesAsync();
}

public interface IWeeklyPlanTaskRepository
{
    Task<IEnumerable<WeeklyPlanTask>> GetByPlanIdAsync(Guid weeklyPlanId);
    Task<IEnumerable<WeeklyPlanTask>> GetByPlanIdAndUserIdAsync(Guid weeklyPlanId, Guid userId);
    Task<WeeklyPlanTask?> GetByIdAsync(Guid id);
    Task<decimal> GetTotalPlannedHoursForUserAsync(Guid weeklyPlanId, Guid userId);
    Task<decimal> GetTotalPlannedHoursForCategoryAsync(Guid weeklyPlanId, CategoryType category);
    Task<WeeklyPlanTask> AddAsync(WeeklyPlanTask task);
    void Remove(WeeklyPlanTask task);
    Task SaveChangesAsync();
}
