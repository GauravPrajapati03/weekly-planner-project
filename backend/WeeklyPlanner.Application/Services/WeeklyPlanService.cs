using WeeklyPlanner.Application.DTOs;
using WeeklyPlanner.Application.Interfaces;
using WeeklyPlanner.Domain.Entities;
using WeeklyPlanner.Domain.Enums;
using WeeklyPlanner.Domain.Exceptions;

namespace WeeklyPlanner.Application.Services;

/// <summary>
/// Core service orchestrating the full planning cycle lifecycle.
/// Enforces all business rules (BR-1 through BR-7) defined in the functional spec.
/// Total weekly capacity is fixed at 30 hours per person.
/// Category hours = (CategoryPercent / 100) × 30
/// </summary>
public class WeeklyPlanService : IWeeklyPlanService
{
    private const decimal WeeklyHoursPerPerson = 30m;

    private readonly IWeeklyPlanRepository _planRepository;
    private readonly IWeeklyPlanTaskRepository _taskRepository;
    private readonly IUserRepository _userRepository;
    private readonly IBacklogItemRepository _backlogRepository;

    public WeeklyPlanService(
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

    // ── Queries ──────────────────────────────────────────────────────────────

    public async Task<IEnumerable<WeeklyPlanDto>> GetAllPlansAsync()
    {
        var plans = await _planRepository.GetAllAsync();
        return plans.Select(MapToDto);
    }

    public async Task<WeeklyPlanDto?> GetActivePlanAsync()
    {
        var plan = await _planRepository.GetActivePlanAsync();
        return plan is null ? null : MapToDto(plan);
    }

    // ── Commands ─────────────────────────────────────────────────────────────

    public async Task<WeeklyPlanDto> CreateWeeklyPlanAsync(CreateWeeklyPlanRequest request)
    {
        var total = request.ClientPercent + request.TechDebtPercent + request.RDPercent;
        if (total != 100m)
            throw new BusinessRuleException($"Category percentages must sum to 100%. Current total: {total}%.");
        if (request.ClientPercent < 0 || request.TechDebtPercent < 0 || request.RDPercent < 0)
            throw new BusinessRuleException("Category percentages must be greater than or equal to 0.");
        if (await _planRepository.AnyActivePlanExistsAsync())
            throw new BusinessRuleException("A weekly plan is already active. It must be completed before starting a new one.");

        var plan = new WeeklyPlan
        {
            WeekStartDate = request.WeekStartDate.Date,
            WeekEndDate   = request.WeekStartDate.Date.AddDays(5),
            ClientPercent = request.ClientPercent,
            TechDebtPercent = request.TechDebtPercent,
            RDPercent = request.RDPercent,
            TotalTeamHours = request.TotalTeamHours > 0 ? request.TotalTeamHours : WeeklyHoursPerPerson,
            Status = PlanStatus.Planning,
            CreatedAt = DateTime.UtcNow
        };

        if (request.SelectedMemberIds is { Count: > 0 })
            plan.SetSelectedMemberIds(request.SelectedMemberIds);

        var created = await _planRepository.AddAsync(plan);
        await _planRepository.SaveChangesAsync();
        return MapToDto(created);
    }

    public async Task<WeeklyPlanTaskDto> AssignTaskAsync(Guid weeklyPlanId, AssignTaskRequest request)
    {
        var plan = await _planRepository.GetByIdAsync(weeklyPlanId)
            ?? throw new NotFoundException("WeeklyPlan", weeklyPlanId);

        if (plan.Status != PlanStatus.Planning)
            throw new BusinessRuleException("Tasks can only be assigned while the plan is in Planning status.");

        var user = await _userRepository.GetByIdAsync(request.AssignedUserId)
            ?? throw new NotFoundException("User", request.AssignedUserId);

        var backlogItem = await _backlogRepository.GetByIdAsync(request.BacklogItemId)
            ?? throw new NotFoundException("BacklogItem", request.BacklogItemId);

        if (backlogItem.Status != BacklogItemStatus.Available)
            throw new BusinessRuleException($"Cannot assign backlog item '{backlogItem.Title}' — it is currently '{backlogItem.Status}'.");
        if (request.PlannedHours <= 0)
            throw new BusinessRuleException("Planned hours must be greater than 0.");

        var existingUserHours = await _taskRepository.GetTotalPlannedHoursForUserAsync(weeklyPlanId, request.AssignedUserId);
        if (existingUserHours + request.PlannedHours > WeeklyHoursPerPerson)
            throw new BusinessRuleException(
                $"Assigning {request.PlannedHours}h would exceed the 30-hour weekly limit. " +
                $"User already has {existingUserHours}h planned.");

        var categoryBudget = GetCategoryBudget(plan, backlogItem.Category);
        var existingCategoryHours = await _taskRepository.GetTotalPlannedHoursForCategoryAsync(weeklyPlanId, backlogItem.Category);
        if (existingCategoryHours + request.PlannedHours > categoryBudget)
            throw new BusinessRuleException(
                $"Assigning {request.PlannedHours:0.##}h to '{backlogItem.Category}' would exceed its budget of {categoryBudget:0.##}h. " +
                $"Currently used: {existingCategoryHours:0.##}h.");

        var task = new WeeklyPlanTask
        {
            WeeklyPlanId   = weeklyPlanId,
            BacklogItemId  = request.BacklogItemId,
            AssignedUserId = request.AssignedUserId,
            PlannedHours   = request.PlannedHours,
            CompletedHours = 0
        };

        var created = await _taskRepository.AddAsync(task);
        await _taskRepository.SaveChangesAsync();
        return MapTaskToDto(created, backlogItem, user);
    }

    public async Task RemoveTaskAsync(Guid weeklyPlanId, Guid taskId)
    {
        var plan = await _planRepository.GetByIdAsync(weeklyPlanId)
            ?? throw new NotFoundException("WeeklyPlan", weeklyPlanId);

        if (plan.Status != PlanStatus.Planning)
            throw new BusinessRuleException("Tasks can only be removed while the plan is in Planning status.");

        var task = await _taskRepository.GetByIdAsync(taskId)
            ?? throw new NotFoundException("WeeklyPlanTask", taskId);

        if (task.WeeklyPlanId != weeklyPlanId)
            throw new BusinessRuleException("Task does not belong to this plan.");

        _taskRepository.Remove(task);
        await _taskRepository.SaveChangesAsync();
    }

    public async Task FreezePlanAsync(Guid weeklyPlanId)
    {
        var plan = await _planRepository.GetByIdAsync(weeklyPlanId)
            ?? throw new NotFoundException("WeeklyPlan", weeklyPlanId);

        if (plan.Status != PlanStatus.Planning)
            throw new BusinessRuleException("Only a plan in Planning status can be frozen.");

        plan.Status   = PlanStatus.Frozen;
        plan.FrozenAt = DateTime.UtcNow;
        await _planRepository.SaveChangesAsync();
    }

    public async Task UpdateProgressAsync(Guid weeklyPlanId, UpdateProgressRequest request)
    {
        var plan = await _planRepository.GetByIdAsync(weeklyPlanId)
            ?? throw new NotFoundException("WeeklyPlan", weeklyPlanId);

        if (plan.Status != PlanStatus.Frozen)
            throw new BusinessRuleException("Progress can only be updated on a plan that is in Frozen status.");

        var task = await _taskRepository.GetByIdAsync(request.TaskId)
            ?? throw new NotFoundException("WeeklyPlanTask", request.TaskId);

        if (task.WeeklyPlanId != weeklyPlanId)
            throw new BusinessRuleException("Task does not belong to the specified weekly plan.");
        if (request.CompletedHours < 0)
            throw new BusinessRuleException("Completed hours cannot be negative.");

        task.CompletedHours = request.CompletedHours;

        if (request.Status.HasValue)
        {
            var newStatus     = request.Status.Value;
            var currentStatus = task.Status;

            bool validTransition = (currentStatus, newStatus) switch
            {
                (WorkItemStatus.NotStarted, WorkItemStatus.InProgress)  => true,
                (WorkItemStatus.InProgress, WorkItemStatus.Completed)   => true,
                (WorkItemStatus.NotStarted, WorkItemStatus.Completed)   => false,
                (_, WorkItemStatus.Blocked)                             => true,
                (WorkItemStatus.Blocked, WorkItemStatus.InProgress)     => true,
                var (cur, nxt) when cur == nxt                          => true,
                _                                                       => false
            };

            if (!validTransition)
                throw new BusinessRuleException(
                    $"Invalid status transition: {currentStatus} → {newStatus}. " +
                    "Must progress NotStarted→InProgress→Completed. Blocked is allowed from any state.");

            task.Status = newStatus;
        }

        await _taskRepository.SaveChangesAsync();
    }

    public async Task CompletePlanAsync(Guid weeklyPlanId)
    {
        var plan = await _planRepository.GetByIdAsync(weeklyPlanId)
            ?? throw new NotFoundException("WeeklyPlan", weeklyPlanId);

        if (plan.Status != PlanStatus.Frozen)
            throw new BusinessRuleException("Only a frozen plan can be marked as completed.");

        plan.Status      = PlanStatus.Completed;
        plan.CompletedAt = DateTime.UtcNow;
        await _planRepository.SaveChangesAsync();
    }

    public async Task CancelPlanAsync(Guid weeklyPlanId)
    {
        var plan = await _planRepository.GetByIdWithTasksAsync(weeklyPlanId)
            ?? throw new NotFoundException("WeeklyPlan", weeklyPlanId);

        if (plan.Status != PlanStatus.Planning)
            throw new BusinessRuleException("Only a plan in Planning status can be cancelled. A frozen plan cannot be cancelled.");

        await _planRepository.DeletePlanWithTasksAsync(plan);
        await _planRepository.SaveChangesAsync();
    }

    // ── Private Helpers ──────────────────────────────────────────────────────

    private static decimal GetCategoryBudget(WeeklyPlan plan, CategoryType category)
    {
        // Budget = percent × total team hours (not fixed 30h per person)
        var totalHours = plan.TotalTeamHours > 0 ? plan.TotalTeamHours : WeeklyHoursPerPerson;
        return category switch
        {
            CategoryType.Client   => plan.ClientPercent   / 100m * totalHours,
            CategoryType.TechDebt => plan.TechDebtPercent / 100m * totalHours,
            CategoryType.RnD      => plan.RDPercent        / 100m * totalHours,
            _                     => throw new BusinessRuleException($"Unknown category: {category}")
        };
    }

    private static WeeklyPlanDto MapToDto(WeeklyPlan plan) =>
        new(plan.Id, plan.WeekStartDate, plan.WeekEndDate,
            plan.ClientPercent, plan.TechDebtPercent, plan.RDPercent,
            plan.Status.ToString(), plan.CreatedAt, plan.FrozenAt, plan.CompletedAt,
            plan.TotalTeamHours,
            plan.GetSelectedMemberIds().Select(g => g.ToString()).ToList());

    private static WeeklyPlanTaskDto MapTaskToDto(WeeklyPlanTask task, BacklogItem item, User user)
    {
        var progress = task.PlannedHours > 0
            ? Math.Round(task.CompletedHours / task.PlannedHours * 100, 1) : 0;

        return new WeeklyPlanTaskDto(
            task.Id, task.WeeklyPlanId,
            task.BacklogItemId, item.Title, item.Category,
            task.AssignedUserId, user.Name,
            task.PlannedHours, task.CompletedHours, progress,
            task.Status);
    }
}
