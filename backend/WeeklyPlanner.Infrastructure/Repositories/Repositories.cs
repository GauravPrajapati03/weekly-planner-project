using Microsoft.EntityFrameworkCore;
using WeeklyPlanner.Application.Interfaces;
using WeeklyPlanner.Domain.Entities;
using WeeklyPlanner.Domain.Enums;
using WeeklyPlanner.Infrastructure.Data;

namespace WeeklyPlanner.Infrastructure.Repositories;

public class UserRepository : IUserRepository
{
    private readonly AppDbContext _db;
    public UserRepository(AppDbContext db) => _db = db;

    public async Task<IEnumerable<User>> GetAllAsync() =>
        await _db.Users.Where(u => u.IsActive).OrderBy(u => u.Name).ToListAsync();

    public async Task<IEnumerable<User>> GetAllIncludingInactiveAsync() =>
        await _db.Users.OrderBy(u => u.Name).ToListAsync();

    public async Task<User?> GetByIdAsync(Guid id) =>
        await _db.Users.FindAsync(id);

    public async Task<User> AddAsync(User user)
    {
        await _db.Users.AddAsync(user);
        return user;
    }

    public async Task SaveChangesAsync() => await _db.SaveChangesAsync();
}

public class BacklogItemRepository : IBacklogItemRepository
{
    private readonly AppDbContext _db;
    public BacklogItemRepository(AppDbContext db) => _db = db;

    public async Task<IEnumerable<BacklogItem>> GetAllAsync(CategoryType? category = null)
    {
        var query = _db.BacklogItems.Where(b => b.Status != BacklogItemStatus.Archived).AsQueryable();
        if (category.HasValue) query = query.Where(b => b.Category == category.Value);
        return await query.OrderByDescending(b => b.CreatedAt).ToListAsync();
    }

    public async Task<IEnumerable<BacklogItem>> GetAllIncludingInactiveAsync(CategoryType? category = null)
    {
        var query = _db.BacklogItems.AsQueryable();
        if (category.HasValue) query = query.Where(b => b.Category == category.Value);
        return await query.OrderByDescending(b => b.CreatedAt).ToListAsync();
    }

    public async Task<BacklogItem?> GetByIdAsync(Guid id) =>
        await _db.BacklogItems.FindAsync(id);

    public async Task<bool> IsUsedInActivePlanAsync(Guid backlogItemId) =>
        await _db.WeeklyPlanTasks
            .AnyAsync(t => t.BacklogItemId == backlogItemId &&
                           t.WeeklyPlan.Status != PlanStatus.Completed);

    public async Task<bool> IsReferencedInAnyPlanAsync(Guid backlogItemId) =>
        await _db.WeeklyPlanTasks.AnyAsync(t => t.BacklogItemId == backlogItemId);

    public async Task<BacklogItem> AddAsync(BacklogItem item)
    {
        await _db.BacklogItems.AddAsync(item);
        return item;
    }

    public void Remove(BacklogItem item) => _db.BacklogItems.Remove(item);
    public async Task SaveChangesAsync() => await _db.SaveChangesAsync();
}

public class WeeklyPlanRepository : IWeeklyPlanRepository
{
    private readonly AppDbContext _db;
    public WeeklyPlanRepository(AppDbContext db) => _db = db;

    public async Task<IEnumerable<WeeklyPlan>> GetAllAsync() =>
        await _db.WeeklyPlans.OrderByDescending(p => p.WeekStartDate).ToListAsync();

    public async Task<WeeklyPlan?> GetByIdAsync(Guid id) =>
        await _db.WeeklyPlans.FindAsync(id);

    public async Task<WeeklyPlan?> GetByIdWithTasksAsync(Guid id) =>
        await _db.WeeklyPlans
            .Include(p => p.Tasks)
            .FirstOrDefaultAsync(p => p.Id == id);

    public async Task<WeeklyPlan?> GetActivePlanAsync() =>
        await _db.WeeklyPlans
            .Where(p => p.Status == PlanStatus.Planning || p.Status == PlanStatus.Frozen)
            .FirstOrDefaultAsync();

    public async Task<bool> AnyActivePlanExistsAsync() =>
        await _db.WeeklyPlans
            .AnyAsync(p => p.Status == PlanStatus.Planning || p.Status == PlanStatus.Frozen);

    public async Task<WeeklyPlan> AddAsync(WeeklyPlan plan)
    {
        await _db.WeeklyPlans.AddAsync(plan);
        return plan;
    }

    public Task DeletePlanWithTasksAsync(WeeklyPlan plan)
    {
        _db.WeeklyPlanTasks.RemoveRange(plan.Tasks);
        _db.WeeklyPlans.Remove(plan);
        return Task.CompletedTask;
    }

    public async Task SaveChangesAsync() => await _db.SaveChangesAsync();
}

public class WeeklyPlanTaskRepository : IWeeklyPlanTaskRepository
{
    private readonly AppDbContext _db;
    public WeeklyPlanTaskRepository(AppDbContext db) => _db = db;

    public async Task<IEnumerable<WeeklyPlanTask>> GetByPlanIdAsync(Guid weeklyPlanId) =>
        await _db.WeeklyPlanTasks
            .Where(t => t.WeeklyPlanId == weeklyPlanId)
            .Include(t => t.BacklogItem)
            .Include(t => t.AssignedUser)
            .ToListAsync();

    public async Task<IEnumerable<WeeklyPlanTask>> GetByPlanIdAndUserIdAsync(Guid weeklyPlanId, Guid userId) =>
        await _db.WeeklyPlanTasks
            .Where(t => t.WeeklyPlanId == weeklyPlanId && t.AssignedUserId == userId)
            .Include(t => t.BacklogItem)
            .Include(t => t.AssignedUser)
            .ToListAsync();

    public async Task<WeeklyPlanTask?> GetByIdAsync(Guid id) =>
        await _db.WeeklyPlanTasks.FindAsync(id);

    public async Task<decimal> GetTotalPlannedHoursForUserAsync(Guid weeklyPlanId, Guid userId) =>
        await _db.WeeklyPlanTasks
            .Where(t => t.WeeklyPlanId == weeklyPlanId && t.AssignedUserId == userId)
            .SumAsync(t => t.PlannedHours);

    public async Task<decimal> GetTotalPlannedHoursForCategoryAsync(Guid weeklyPlanId, CategoryType category) =>
        await _db.WeeklyPlanTasks
            .Where(t => t.WeeklyPlanId == weeklyPlanId && t.BacklogItem.Category == category)
            .SumAsync(t => t.PlannedHours);

    public async Task<WeeklyPlanTask> AddAsync(WeeklyPlanTask task)
    {
        await _db.WeeklyPlanTasks.AddAsync(task);
        return task;
    }

    public void Remove(WeeklyPlanTask task) => _db.WeeklyPlanTasks.Remove(task);

    public async Task SaveChangesAsync() => await _db.SaveChangesAsync();
}
