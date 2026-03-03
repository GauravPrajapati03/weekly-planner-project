using WeeklyPlanner.Domain.Entities;
using WeeklyPlanner.Domain.Enums;

namespace WeeklyPlanner.Application.Interfaces;

// ─────────────────────────────────────────────────────────────────────────────
// REPOSITORY INTERFACES
// These live in Application so the Domain stays dependency-free.
// Infrastructure implements these; Application depends only on abstractions.
// ─────────────────────────────────────────────────────────────────────────────

public interface IUserRepository
{
    Task<IEnumerable<User>> GetAllAsync();             // active only
    Task<IEnumerable<User>> GetAllIncludingInactiveAsync(); // all users
    Task<User?> GetByIdAsync(int id);
    Task<User> AddAsync(User user);
    Task SaveChangesAsync();
}

public interface IBacklogItemRepository
{
    Task<IEnumerable<BacklogItem>> GetAllAsync(CategoryType? category = null);           // active only
    Task<IEnumerable<BacklogItem>> GetAllIncludingInactiveAsync(CategoryType? category = null); // all
    Task<BacklogItem?> GetByIdAsync(int id);
    Task<bool> IsUsedInActivePlanAsync(int backlogItemId);
    Task<bool> IsReferencedInAnyPlanAsync(int backlogItemId);  // ever used in ANY plan
    Task<BacklogItem> AddAsync(BacklogItem item);
    void Remove(BacklogItem item);
    Task SaveChangesAsync();
}

public interface IWeeklyPlanRepository
{
    Task<IEnumerable<WeeklyPlan>> GetAllAsync();
    Task<WeeklyPlan?> GetByIdAsync(int id);
    Task<WeeklyPlan?> GetByIdWithTasksAsync(int id);
    Task<WeeklyPlan?> GetActivePlanAsync();
    Task<bool> AnyActivePlanExistsAsync();
    Task<WeeklyPlan> AddAsync(WeeklyPlan plan);
    Task DeletePlanWithTasksAsync(WeeklyPlan plan);
    Task SaveChangesAsync();
}

public interface IWeeklyPlanTaskRepository
{
    Task<IEnumerable<WeeklyPlanTask>> GetByPlanIdAsync(int weeklyPlanId);
    Task<IEnumerable<WeeklyPlanTask>> GetByPlanIdAndUserIdAsync(int weeklyPlanId, int userId);
    Task<WeeklyPlanTask?> GetByIdAsync(int id);
    Task<decimal> GetTotalPlannedHoursForUserAsync(int weeklyPlanId, int userId);
    Task<decimal> GetTotalPlannedHoursForCategoryAsync(int weeklyPlanId, CategoryType category);
    Task<WeeklyPlanTask> AddAsync(WeeklyPlanTask task);
    Task SaveChangesAsync();
}
