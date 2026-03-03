using WeeklyPlanner.Application.DTOs;
using WeeklyPlanner.Application.Interfaces;
using WeeklyPlanner.Domain.Entities;
using WeeklyPlanner.Domain.Enums;
using WeeklyPlanner.Domain.Exceptions;

namespace WeeklyPlanner.Application.Services;

/// <summary>
/// Aggregates weekly plan data for the Team Lead dashboard view.
/// Calculates overall progress, category breakdown, and per-user progress.
///
/// Formula: Progress % = (TotalCompletedHours / TotalPlannedHours) × 100
/// </summary>
public class DashboardService : IDashboardService
{
    private readonly IWeeklyPlanRepository _planRepository;
    private readonly IWeeklyPlanTaskRepository _taskRepository;
    private readonly IUserRepository _userRepository;
    private readonly IBacklogItemRepository _backlogRepository;

    public DashboardService(
        IWeeklyPlanRepository planRepository,
        IWeeklyPlanTaskRepository taskRepository,
        IUserRepository userRepository,
        IBacklogItemRepository backlogRepository)
    {
        _planRepository = planRepository;
        _taskRepository = taskRepository;
        _userRepository = userRepository;
        _backlogRepository = backlogRepository;
    }

    /// <inheritdoc />
    public async Task<DashboardDto> GetDashboardAsync(int weeklyPlanId)
    {
        // Verify the plan exists
        _ = await _planRepository.GetByIdAsync(weeklyPlanId)
            ?? throw new NotFoundException("WeeklyPlan", weeklyPlanId);

        // Load all tasks with their related entities for this plan
        var tasks = (await _taskRepository.GetByPlanIdAsync(weeklyPlanId)).ToList();

        // Load related entities in bulk to avoid N+1
        var users = (await _userRepository.GetAllAsync()).ToDictionary(u => u.Id);
        var backlogItems = (await _backlogRepository.GetAllAsync()).ToDictionary(b => b.Id);

        // Map tasks to DTOs
        var taskDtos = tasks.Select(t => MapTaskToDto(t, backlogItems, users)).ToList();

        // Overall progress
        var totalPlanned = tasks.Sum(t => t.PlannedHours);
        var totalCompleted = tasks.Sum(t => t.CompletedHours);
        var overallProgress = totalPlanned > 0
            ? Math.Round(totalCompleted / totalPlanned * 100, 1)
            : 0;

        // Category breakdown — group tasks by their backlog item's category
        var categoryBreakdown = Enum.GetValues<CategoryType>()
            .Select(cat =>
            {
                var catTasks = tasks.Where(t =>
                    backlogItems.ContainsKey(t.BacklogItemId) &&
                    backlogItems[t.BacklogItemId].Category == cat).ToList();

                var catPlanned = catTasks.Sum(t => t.PlannedHours);
                var catCompleted = catTasks.Sum(t => t.CompletedHours);
                var catProgress = catPlanned > 0
                    ? Math.Round(catCompleted / catPlanned * 100, 1)
                    : 0;

                return new CategoryProgressDto(cat.ToString(), catPlanned, catCompleted, catProgress);
            })
            .Where(c => c.PlannedHours > 0) // Only show categories with planned work
            .ToList();

        // User breakdown — group tasks by assigned user
        var userBreakdown = tasks
            .GroupBy(t => t.AssignedUserId)
            .Select(group =>
            {
                var userId = group.Key;
                var userName = users.ContainsKey(userId) ? users[userId].Name : "Unknown";
                var userPlanned = group.Sum(t => t.PlannedHours);
                var userCompleted = group.Sum(t => t.CompletedHours);
                var userProgress = userPlanned > 0
                    ? Math.Round(userCompleted / userPlanned * 100, 1)
                    : 0;

                var userTasks = group.Select(t => MapTaskToDto(t, backlogItems, users)).ToList();

                return new UserProgressDto(userId, userName, userPlanned, userCompleted, userProgress, userTasks);
            })
            .ToList();

        return new DashboardDto(totalPlanned, totalCompleted, overallProgress, categoryBreakdown, userBreakdown, taskDtos);
    }

    /// <inheritdoc />
    public async Task<IEnumerable<WeeklyPlanTaskDto>> GetTasksByUserAsync(int weeklyPlanId, int userId)
    {
        _ = await _planRepository.GetByIdAsync(weeklyPlanId)
            ?? throw new NotFoundException("WeeklyPlan", weeklyPlanId);

        var tasks = await _taskRepository.GetByPlanIdAndUserIdAsync(weeklyPlanId, userId);
        var backlogItems = (await _backlogRepository.GetAllAsync()).ToDictionary(b => b.Id);
        var users = (await _userRepository.GetAllAsync()).ToDictionary(u => u.Id);

        return tasks.Select(t => MapTaskToDto(t, backlogItems, users));
    }

    // ── Private Helpers ────────────────────────────────────────────────────

    private static WeeklyPlanTaskDto MapTaskToDto(
        WeeklyPlanTask task,
        Dictionary<int, BacklogItem> backlogItems,
        Dictionary<int, User> users)
    {
        var itemTitle = backlogItems.ContainsKey(task.BacklogItemId)
            ? backlogItems[task.BacklogItemId].Title : "Unknown";
        var category = backlogItems.ContainsKey(task.BacklogItemId)
            ? backlogItems[task.BacklogItemId].Category : CategoryType.Client;
        var userName = users.ContainsKey(task.AssignedUserId)
            ? users[task.AssignedUserId].Name : "Unknown";

        var progress = task.PlannedHours > 0
            ? Math.Round(task.CompletedHours / task.PlannedHours * 100, 1) : 0;

        return new WeeklyPlanTaskDto(
            task.Id, task.WeeklyPlanId,
            task.BacklogItemId, itemTitle, category,
            task.AssignedUserId, userName,
            task.PlannedHours, task.CompletedHours, progress,
            task.Status);
    }
}
