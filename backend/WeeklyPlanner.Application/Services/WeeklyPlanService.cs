using WeeklyPlanner.Application.DTOs;
using WeeklyPlanner.Application.Interfaces;
using WeeklyPlanner.Domain.Entities;
using WeeklyPlanner.Domain.Enums;
using WeeklyPlanner.Domain.Exceptions;

namespace WeeklyPlanner.Application.Services;

/// <summary>
/// Core service orchestrating the full planning cycle lifecycle.
/// Enforces all business rules (BR-1 through BR-7) defined in the functional spec.
///
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

    // ── Queries ────────────────────────────────────────────────────────────

    /// <inheritdoc />
    public async Task<IEnumerable<WeeklyPlanDto>> GetAllPlansAsync()
    {
        var plans = await _planRepository.GetAllAsync();
        return plans.Select(MapToDto);
    }

    /// <inheritdoc />
    public async Task<WeeklyPlanDto?> GetActivePlanAsync()
    {
        var plan = await _planRepository.GetActivePlanAsync();
        return plan is null ? null : MapToDto(plan);
    }

    // ── Commands ───────────────────────────────────────────────────────────

    /// <inheritdoc />
    public async Task<WeeklyPlanDto> CreateWeeklyPlanAsync(CreateWeeklyPlanRequest request)
    {
        // BR-1: Percentages must sum to exactly 100
        var total = request.ClientPercent + request.TechDebtPercent + request.RDPercent;
        if (total != 100m)
            throw new BusinessRuleException(
                $"Category percentages must sum to 100%. Current total: {total}%.");

        // BR-1: Each percentage must be non-negative
        if (request.ClientPercent < 0 || request.TechDebtPercent < 0 || request.RDPercent < 0)
            throw new BusinessRuleException("Category percentages must be greater than or equal to 0.");

        // BR-6: Only one active plan at a time
        if (await _planRepository.AnyActivePlanExistsAsync())
            throw new BusinessRuleException(
                "A weekly plan is already active. It must be completed before starting a new one.");

        var plan = new WeeklyPlan
        {
            WeekStartDate = request.WeekStartDate.Date,
            WeekEndDate = request.WeekStartDate.Date.AddDays(5), // Wednesday + 5 days = Monday
            ClientPercent = request.ClientPercent,
            TechDebtPercent = request.TechDebtPercent,
            RDPercent = request.RDPercent,
            Status = PlanStatus.Planning,
            CreatedAt = DateTime.UtcNow
        };

        var created = await _planRepository.AddAsync(plan);
        await _planRepository.SaveChangesAsync();

        return MapToDto(created);
    }

    /// <inheritdoc />
    public async Task<WeeklyPlanTaskDto> AssignTaskAsync(int weeklyPlanId, AssignTaskRequest request)
    {
        // Load and validate the plan
        var plan = await _planRepository.GetByIdAsync(weeklyPlanId)
            ?? throw new NotFoundException("WeeklyPlan", weeklyPlanId);

        // BR-5: Cannot assign tasks to a frozen plan
        if (plan.Status != PlanStatus.Planning)
            throw new BusinessRuleException(
                "Tasks can only be assigned while the plan is in Planning status.");

        // Validate the user
        var user = await _userRepository.GetByIdAsync(request.AssignedUserId)
            ?? throw new NotFoundException("User", request.AssignedUserId);

        // Validate the backlog item
        var backlogItem = await _backlogRepository.GetByIdAsync(request.BacklogItemId)
            ?? throw new NotFoundException("BacklogItem", request.BacklogItemId);

        if (!backlogItem.IsActive)
            throw new BusinessRuleException("Cannot assign an inactive backlog item.");

        // BR-7: Planned hours must be positive
        if (request.PlannedHours <= 0)
            throw new BusinessRuleException("Planned hours must be greater than 0.");

        // BR-2: Total planned hours per user must not exceed 30
        var existingUserHours = await _taskRepository.GetTotalPlannedHoursForUserAsync(weeklyPlanId, request.AssignedUserId);
        if (existingUserHours + request.PlannedHours > WeeklyHoursPerPerson)
            throw new BusinessRuleException(
                $"Assigning {request.PlannedHours}h would exceed the 30-hour weekly limit. " +
                $"User already has {existingUserHours}h planned.");

        // BR-3: Category planned hours must not exceed the % allocation
        var categoryBudget = GetCategoryBudget(plan, backlogItem.Category);
        var existingCategoryHours = await _taskRepository.GetTotalPlannedHoursForCategoryAsync(weeklyPlanId, backlogItem.Category);
        if (existingCategoryHours + request.PlannedHours > categoryBudget)
            throw new BusinessRuleException(
                $"Assigning {request.PlannedHours}h to '{backlogItem.Category}' would exceed its budget of {categoryBudget}h. " +
                $"Currently used: {existingCategoryHours}h.");

        var task = new WeeklyPlanTask
        {
            WeeklyPlanId = weeklyPlanId,
            BacklogItemId = request.BacklogItemId,
            AssignedUserId = request.AssignedUserId,
            PlannedHours = request.PlannedHours,
            CompletedHours = 0
        };

        var created = await _taskRepository.AddAsync(task);
        await _taskRepository.SaveChangesAsync();

        return MapTaskToDto(created, backlogItem, user);
    }

    /// <inheritdoc />
    public async Task FreezePlanAsync(int weeklyPlanId)
    {
        var plan = await _planRepository.GetByIdAsync(weeklyPlanId)
            ?? throw new NotFoundException("WeeklyPlan", weeklyPlanId);

        if (plan.Status != PlanStatus.Planning)
            throw new BusinessRuleException("Only a plan in Planning status can be frozen.");

        // Transition to Frozen state — irreversible (BR-5)
        plan.Status = PlanStatus.Frozen;
        plan.FrozenAt = DateTime.UtcNow;

        await _planRepository.SaveChangesAsync();
    }

    /// <inheritdoc />
    public async Task UpdateProgressAsync(int weeklyPlanId, UpdateProgressRequest request)
    {
        var plan = await _planRepository.GetByIdAsync(weeklyPlanId)
            ?? throw new NotFoundException("WeeklyPlan", weeklyPlanId);

        // Progress updates are only allowed on frozen plans (FR-6)
        if (plan.Status != PlanStatus.Frozen)
            throw new BusinessRuleException(
                "Progress can only be updated on a plan that is in Frozen status.");

        var task = await _taskRepository.GetByIdAsync(request.TaskId)
            ?? throw new NotFoundException("WeeklyPlanTask", request.TaskId);

        // Ensure this task actually belongs to this plan
        if (task.WeeklyPlanId != weeklyPlanId)
            throw new BusinessRuleException("Task does not belong to the specified weekly plan.");

        // BR-4: CompletedHours must be ≥ 0
        if (request.CompletedHours < 0)
            throw new BusinessRuleException("Completed hours cannot be negative.");

        // BR-4: CompletedHours must be ≤ PlannedHours
        if (request.CompletedHours > task.PlannedHours)
            throw new BusinessRuleException(
                $"Completed hours ({request.CompletedHours}h) cannot exceed planned hours ({task.PlannedHours}h).");

        task.CompletedHours = request.CompletedHours;
        await _taskRepository.SaveChangesAsync();
    }

    /// <inheritdoc />
    public async Task CompletePlanAsync(int weeklyPlanId)
    {
        var plan = await _planRepository.GetByIdAsync(weeklyPlanId)
            ?? throw new NotFoundException("WeeklyPlan", weeklyPlanId);

        if (plan.Status != PlanStatus.Frozen)
            throw new BusinessRuleException("Only a frozen plan can be marked as completed.");

        plan.Status = PlanStatus.Completed;
        plan.CompletedAt = DateTime.UtcNow;

        await _planRepository.SaveChangesAsync();
    }

    /// <inheritdoc />
    public async Task CancelPlanAsync(int weeklyPlanId)
    {
        var plan = await _planRepository.GetByIdWithTasksAsync(weeklyPlanId)
            ?? throw new NotFoundException("WeeklyPlan", weeklyPlanId);

        // Can only cancel a plan that is still in Planning status (not yet frozen)
        if (plan.Status != PlanStatus.Planning)
            throw new BusinessRuleException(
                "Only a plan in Planning status can be cancelled. A frozen plan cannot be cancelled.");

        await _planRepository.DeletePlanWithTasksAsync(plan);
        await _planRepository.SaveChangesAsync();
    }

    // ── Private Helpers ────────────────────────────────────────────────────

    /// <summary>Returns the maximum hours available for a given category based on the plan's % allocation.</summary>
    private static decimal GetCategoryBudget(WeeklyPlan plan, CategoryType category) =>
        category switch
        {
            CategoryType.Client => plan.ClientPercent / 100m * WeeklyHoursPerPerson,
            CategoryType.TechDebt => plan.TechDebtPercent / 100m * WeeklyHoursPerPerson,
            CategoryType.RnD => plan.RDPercent / 100m * WeeklyHoursPerPerson,
            _ => throw new BusinessRuleException($"Unknown category: {category}")
        };

    private static WeeklyPlanDto MapToDto(WeeklyPlan plan) =>
        new(plan.Id, plan.WeekStartDate, plan.WeekEndDate,
            plan.ClientPercent, plan.TechDebtPercent, plan.RDPercent,
            plan.Status.ToString(), plan.CreatedAt, plan.FrozenAt, plan.CompletedAt);

    private static WeeklyPlanTaskDto MapTaskToDto(WeeklyPlanTask task, BacklogItem item, Domain.Entities.User user)
    {
        var progress = task.PlannedHours > 0
            ? Math.Round(task.CompletedHours / task.PlannedHours * 100, 1)
            : 0;

        return new WeeklyPlanTaskDto(
            task.Id, task.WeeklyPlanId,
            task.BacklogItemId, item.Title, item.Category,
            task.AssignedUserId, user.Name,
            task.PlannedHours, task.CompletedHours, progress);
    }
}
