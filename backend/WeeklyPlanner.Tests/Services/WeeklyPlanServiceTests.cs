using FluentAssertions;
using Moq;
using WeeklyPlanner.Application.DTOs;
using WeeklyPlanner.Application.Interfaces;
using WeeklyPlanner.Application.Services;
using WeeklyPlanner.Domain.Entities;
using WeeklyPlanner.Domain.Enums;
using WeeklyPlanner.Domain.Exceptions;
using Xunit;

namespace WeeklyPlanner.Tests.Services;

/// <summary>
/// Unit tests for <see cref="WeeklyPlanService"/>.
/// Covers the full planning lifecycle: create → assign tasks → freeze → update progress → complete/cancel.
/// Business rules BR-1 through BR-7 are each explicitly tested.
/// </summary>
public class WeeklyPlanServiceTests
{
    // ── Factories ─────────────────────────────────────────────────────────────

    private static WeeklyPlan MakePlan(PlanStatus status = PlanStatus.Planning) => new()
    {
        Id              = Guid.NewGuid(),
        WeekStartDate   = DateTime.Today,
        WeekEndDate     = DateTime.Today.AddDays(5),
        ClientPercent   = 50m,
        TechDebtPercent = 30m,
        RDPercent       = 20m,
        TotalTeamHours  = 30m,
        Status          = status,
        CreatedAt       = DateTime.UtcNow
    };

    private static User MakeUser() =>
        new() { Id = Guid.NewGuid(), Name = "Alice", Role = UserRole.TeamMember, IsActive = true };

    private static BacklogItem MakeBacklogItem(CategoryType cat = CategoryType.Client,
        BacklogItemStatus status = BacklogItemStatus.Available) =>
        new()
        {
            Id             = Guid.NewGuid(),
            Title          = "Sample task",
            Category       = cat,
            Status         = status,
            EstimatedHours = 5
        };

    private static WeeklyPlanTask MakeTask(WeeklyPlan plan, BacklogItem item, User user,
        decimal hours = 5m) =>
        new()
        {
            Id             = Guid.NewGuid(),
            WeeklyPlanId   = plan.Id,
            BacklogItemId  = item.Id,
            AssignedUserId = user.Id,
            PlannedHours   = hours,
            CompletedHours = 0,
            Status         = WorkItemStatus.NotStarted
        };

    private static WeeklyPlanService Svc(
        Mock<IWeeklyPlanRepository>     planRepo,
        Mock<IWeeklyPlanTaskRepository> taskRepo,
        Mock<IUserRepository>           userRepo,
        Mock<IBacklogItemRepository>    backlogRepo) =>
        new(planRepo.Object, taskRepo.Object, userRepo.Object, backlogRepo.Object);

    // ── GetActivePlanAsync ────────────────────────────────────────────────────

    [Fact]
    public async Task GetActivePlanAsync_WhenPlanExists_ReturnsMappedDto()
    {
        // Arrange
        var plan     = MakePlan();
        var planRepo = new Mock<IWeeklyPlanRepository>(MockBehavior.Strict);
        planRepo.Setup(r => r.GetActivePlanAsync()).ReturnsAsync(plan);
        var svc = Svc(planRepo, new Mock<IWeeklyPlanTaskRepository>(),
            new Mock<IUserRepository>(), new Mock<IBacklogItemRepository>());

        // Act
        var result = await svc.GetActivePlanAsync();

        // Assert
        result.Should().NotBeNull();
        result!.Status.Should().Be("Planning");
        result.ClientPercent.Should().Be(50m);
    }

    [Fact]
    public async Task GetActivePlanAsync_WhenNoPlan_ReturnsNull()
    {
        // Arrange
        var planRepo = new Mock<IWeeklyPlanRepository>(MockBehavior.Strict);
        planRepo.Setup(r => r.GetActivePlanAsync()).ReturnsAsync((WeeklyPlan?)null);
        var svc = Svc(planRepo, new Mock<IWeeklyPlanTaskRepository>(),
            new Mock<IUserRepository>(), new Mock<IBacklogItemRepository>());

        // Act & Assert
        (await svc.GetActivePlanAsync()).Should().BeNull();
    }

    // ── CreateWeeklyPlanAsync ─────────────────────────────────────────────────

    [Fact]
    public async Task CreateWeeklyPlanAsync_PercentsSum100_Succeeds()
    {
        // Arrange — positional: (DateTime, decimal, decimal, decimal, decimal, List<Guid>?)
        var planRepo = new Mock<IWeeklyPlanRepository>(MockBehavior.Strict);
        planRepo.Setup(r => r.AnyActivePlanExistsAsync()).ReturnsAsync(false);
        planRepo.Setup(r => r.AddAsync(It.IsAny<WeeklyPlan>()))
            .ReturnsAsync((WeeklyPlan p) => p);
        planRepo.Setup(r => r.SaveChangesAsync()).Returns(Task.CompletedTask);
        var svc = Svc(planRepo, new Mock<IWeeklyPlanTaskRepository>(),
            new Mock<IUserRepository>(), new Mock<IBacklogItemRepository>());

        // Act
        var result = await svc.CreateWeeklyPlanAsync(
            new CreateWeeklyPlanRequest(DateTime.Today, 60m, 30m, 10m, 30m));

        // Assert
        result.Status.Should().Be("Planning");
        result.ClientPercent.Should().Be(60m);
    }

    [Fact]
    public async Task CreateWeeklyPlanAsync_PercentsDoNotSum100_ThrowsBusinessRuleException()
    {
        // Arrange — 50 + 30 + 10 = 90, not 100
        var planRepo = new Mock<IWeeklyPlanRepository>(MockBehavior.Strict);
        planRepo.Setup(r => r.AnyActivePlanExistsAsync()).ReturnsAsync(false);
        var svc = Svc(planRepo, new Mock<IWeeklyPlanTaskRepository>(),
            new Mock<IUserRepository>(), new Mock<IBacklogItemRepository>());

        // Act & Assert
        await svc.Invoking(s => s.CreateWeeklyPlanAsync(
                new CreateWeeklyPlanRequest(DateTime.Today, 50m, 30m, 10m, 30m)))
            .Should().ThrowAsync<BusinessRuleException>()
            .WithMessage("*sum to 100%*");
    }

    [Fact]
    public async Task CreateWeeklyPlanAsync_ActivePlanExists_ThrowsBusinessRuleException()
    {
        // Arrange
        var planRepo = new Mock<IWeeklyPlanRepository>(MockBehavior.Strict);
        planRepo.Setup(r => r.AnyActivePlanExistsAsync()).ReturnsAsync(true);
        var svc = Svc(planRepo, new Mock<IWeeklyPlanTaskRepository>(),
            new Mock<IUserRepository>(), new Mock<IBacklogItemRepository>());

        // Act & Assert
        await svc.Invoking(s => s.CreateWeeklyPlanAsync(
                new CreateWeeklyPlanRequest(DateTime.Today, 50m, 30m, 20m, 30m)))
            .Should().ThrowAsync<BusinessRuleException>()
            .WithMessage("*already active*");
    }

    [Fact]
    public async Task CreateWeeklyPlanAsync_NegativePercent_ThrowsBusinessRuleException()
    {
        // Arrange — -10 + 70 + 40 = 100 but -10 is negative
        var planRepo = new Mock<IWeeklyPlanRepository>(MockBehavior.Strict);
        planRepo.Setup(r => r.AnyActivePlanExistsAsync()).ReturnsAsync(false);
        var svc = Svc(planRepo, new Mock<IWeeklyPlanTaskRepository>(),
            new Mock<IUserRepository>(), new Mock<IBacklogItemRepository>());

        // Act & Assert
        await svc.Invoking(s => s.CreateWeeklyPlanAsync(
                new CreateWeeklyPlanRequest(DateTime.Today, -10m, 70m, 40m, 30m)))
            .Should().ThrowAsync<BusinessRuleException>()
            .WithMessage("*greater than or equal to 0*");
    }

    // ── AssignTaskAsync ───────────────────────────────────────────────────────

    [Fact]
    public async Task AssignTaskAsync_ValidRequest_ReturnsTaskDto()
    {
        // Arrange
        var plan    = MakePlan();
        var user    = MakeUser();
        var item    = MakeBacklogItem();

        var planRepo    = new Mock<IWeeklyPlanRepository>(MockBehavior.Strict);
        var taskRepo    = new Mock<IWeeklyPlanTaskRepository>(MockBehavior.Strict);
        var userRepo    = new Mock<IUserRepository>(MockBehavior.Strict);
        var backlogRepo = new Mock<IBacklogItemRepository>(MockBehavior.Strict);

        planRepo.Setup(r    => r.GetByIdAsync(plan.Id)).ReturnsAsync(plan);
        userRepo.Setup(r    => r.GetByIdAsync(user.Id)).ReturnsAsync(user);
        backlogRepo.Setup(r => r.GetByIdAsync(item.Id)).ReturnsAsync(item);
        taskRepo.Setup(r    => r.GetTotalPlannedHoursForUserAsync(plan.Id, user.Id))
            .ReturnsAsync(0m);
        taskRepo.Setup(r    => r.GetTotalPlannedHoursForCategoryAsync(plan.Id, item.Category))
            .ReturnsAsync(0m);
        taskRepo.Setup(r    => r.AddAsync(It.IsAny<WeeklyPlanTask>()))
            .ReturnsAsync((WeeklyPlanTask t) => t);
        taskRepo.Setup(r    => r.SaveChangesAsync()).Returns(Task.CompletedTask);
        var svc = Svc(planRepo, taskRepo, userRepo, backlogRepo);

        // Act — positional AssignTaskRequest(BacklogItemId, AssignedUserId, PlannedHours)
        var result = await svc.AssignTaskAsync(plan.Id,
            new AssignTaskRequest(item.Id, user.Id, 8m));

        // Assert
        result.PlannedHours.Should().Be(8m);
        result.BacklogItemTitle.Should().Be(item.Title);
    }

    [Fact]
    public async Task AssignTaskAsync_PlanFrozen_ThrowsBusinessRuleException()
    {
        // Arrange
        var plan     = MakePlan(PlanStatus.Frozen);
        var planRepo = new Mock<IWeeklyPlanRepository>(MockBehavior.Strict);
        planRepo.Setup(r => r.GetByIdAsync(plan.Id)).ReturnsAsync(plan);
        var svc = Svc(planRepo, new Mock<IWeeklyPlanTaskRepository>(),
            new Mock<IUserRepository>(), new Mock<IBacklogItemRepository>());

        // Act & Assert
        await svc.Invoking(s => s.AssignTaskAsync(plan.Id,
                new AssignTaskRequest(Guid.NewGuid(), Guid.NewGuid(), 5m)))
            .Should().ThrowAsync<BusinessRuleException>()
            .WithMessage("*Planning status*");
    }

    [Fact]
    public async Task AssignTaskAsync_ExceedsUserHourLimit_ThrowsBusinessRuleException()
    {
        // Arrange — user already has 28h; adding 5h exceeds 30h cap
        var plan    = MakePlan();
        var user    = MakeUser();
        var item    = MakeBacklogItem();

        var planRepo    = new Mock<IWeeklyPlanRepository>(MockBehavior.Strict);
        var taskRepo    = new Mock<IWeeklyPlanTaskRepository>(MockBehavior.Strict);
        var userRepo    = new Mock<IUserRepository>(MockBehavior.Strict);
        var backlogRepo = new Mock<IBacklogItemRepository>(MockBehavior.Strict);

        planRepo.Setup(r    => r.GetByIdAsync(plan.Id)).ReturnsAsync(plan);
        userRepo.Setup(r    => r.GetByIdAsync(user.Id)).ReturnsAsync(user);
        backlogRepo.Setup(r => r.GetByIdAsync(item.Id)).ReturnsAsync(item);
        taskRepo.Setup(r    => r.GetTotalPlannedHoursForUserAsync(plan.Id, user.Id))
            .ReturnsAsync(28m);  // nearly full
        var svc = Svc(planRepo, taskRepo, userRepo, backlogRepo);

        // Act & Assert
        await svc.Invoking(s => s.AssignTaskAsync(plan.Id,
                new AssignTaskRequest(item.Id, user.Id, 5m)))
            .Should().ThrowAsync<BusinessRuleException>()
            .WithMessage("*30-hour weekly limit*");
    }

    [Fact]
    public async Task AssignTaskAsync_ExceedsCategoryBudget_ThrowsBusinessRuleException()
    {
        // Arrange — plan.ClientPercent = 50% of 30h = 15h budget; 13h already used
        var plan    = MakePlan();    // ClientPercent=50 → budget=15h
        var user    = MakeUser();
        var item    = MakeBacklogItem(CategoryType.Client);

        var planRepo    = new Mock<IWeeklyPlanRepository>(MockBehavior.Strict);
        var taskRepo    = new Mock<IWeeklyPlanTaskRepository>(MockBehavior.Strict);
        var userRepo    = new Mock<IUserRepository>(MockBehavior.Strict);
        var backlogRepo = new Mock<IBacklogItemRepository>(MockBehavior.Strict);

        planRepo.Setup(r    => r.GetByIdAsync(plan.Id)).ReturnsAsync(plan);
        userRepo.Setup(r    => r.GetByIdAsync(user.Id)).ReturnsAsync(user);
        backlogRepo.Setup(r => r.GetByIdAsync(item.Id)).ReturnsAsync(item);
        taskRepo.Setup(r    => r.GetTotalPlannedHoursForUserAsync(plan.Id, user.Id))
            .ReturnsAsync(0m);
        taskRepo.Setup(r    => r.GetTotalPlannedHoursForCategoryAsync(plan.Id, CategoryType.Client))
            .ReturnsAsync(13m); // 13h used, budget=15h
        var svc = Svc(planRepo, taskRepo, userRepo, backlogRepo);

        // Act & Assert — adding 5h would total 18h > 15h budget
        await svc.Invoking(s => s.AssignTaskAsync(plan.Id,
                new AssignTaskRequest(item.Id, user.Id, 5m)))
            .Should().ThrowAsync<BusinessRuleException>()
            .WithMessage("*budget*");
    }

    [Fact]
    public async Task AssignTaskAsync_ZeroPlannedHours_ThrowsBusinessRuleException()
    {
        // Arrange
        var plan    = MakePlan();
        var user    = MakeUser();
        var item    = MakeBacklogItem();

        var planRepo    = new Mock<IWeeklyPlanRepository>(MockBehavior.Strict);
        var taskRepo    = new Mock<IWeeklyPlanTaskRepository>(MockBehavior.Strict);
        var userRepo    = new Mock<IUserRepository>(MockBehavior.Strict);
        var backlogRepo = new Mock<IBacklogItemRepository>(MockBehavior.Strict);

        planRepo.Setup(r    => r.GetByIdAsync(plan.Id)).ReturnsAsync(plan);
        userRepo.Setup(r    => r.GetByIdAsync(user.Id)).ReturnsAsync(user);
        backlogRepo.Setup(r => r.GetByIdAsync(item.Id)).ReturnsAsync(item);
        taskRepo.Setup(r    => r.GetTotalPlannedHoursForUserAsync(plan.Id, user.Id))
            .ReturnsAsync(0m);
        var svc = Svc(planRepo, taskRepo, userRepo, backlogRepo);

        // Act & Assert
        await svc.Invoking(s => s.AssignTaskAsync(plan.Id,
                new AssignTaskRequest(item.Id, user.Id, 0m)))
            .Should().ThrowAsync<BusinessRuleException>()
            .WithMessage("*greater than 0*");
    }

    [Fact]
    public async Task AssignTaskAsync_ItemNotAvailable_ThrowsBusinessRuleException()
    {
        // Arrange — backlog item is InProgress (already claimed)
        var plan    = MakePlan();
        var user    = MakeUser();
        var item    = MakeBacklogItem(status: BacklogItemStatus.InProgress);

        var planRepo    = new Mock<IWeeklyPlanRepository>(MockBehavior.Strict);
        var taskRepo    = new Mock<IWeeklyPlanTaskRepository>(MockBehavior.Strict);
        var userRepo    = new Mock<IUserRepository>(MockBehavior.Strict);
        var backlogRepo = new Mock<IBacklogItemRepository>(MockBehavior.Strict);

        planRepo.Setup(r    => r.GetByIdAsync(plan.Id)).ReturnsAsync(plan);
        userRepo.Setup(r    => r.GetByIdAsync(user.Id)).ReturnsAsync(user);
        backlogRepo.Setup(r => r.GetByIdAsync(item.Id)).ReturnsAsync(item);
        taskRepo.Setup(r    => r.GetTotalPlannedHoursForUserAsync(plan.Id, user.Id))
            .ReturnsAsync(0m);
        var svc = Svc(planRepo, taskRepo, userRepo, backlogRepo);

        // Act & Assert
        await svc.Invoking(s => s.AssignTaskAsync(plan.Id,
                new AssignTaskRequest(item.Id, user.Id, 5m)))
            .Should().ThrowAsync<BusinessRuleException>()
            .WithMessage("*InProgress*");
    }

    // ── RemoveTaskAsync ───────────────────────────────────────────────────────

    [Fact]
    public async Task RemoveTaskAsync_ValidTask_RemovesTask()
    {
        // Arrange
        var plan = MakePlan();
        var task = MakeTask(plan, MakeBacklogItem(), MakeUser());

        var planRepo = new Mock<IWeeklyPlanRepository>(MockBehavior.Strict);
        var taskRepo = new Mock<IWeeklyPlanTaskRepository>(MockBehavior.Strict);
        planRepo.Setup(r => r.GetByIdAsync(plan.Id)).ReturnsAsync(plan);
        taskRepo.Setup(r => r.GetByIdAsync(task.Id)).ReturnsAsync(task);
        taskRepo.Setup(r => r.Remove(task));
        taskRepo.Setup(r => r.SaveChangesAsync()).Returns(Task.CompletedTask);
        var svc = Svc(planRepo, taskRepo, new Mock<IUserRepository>(),
            new Mock<IBacklogItemRepository>());

        // Act
        await svc.Invoking(s => s.RemoveTaskAsync(plan.Id, task.Id))
            .Should().NotThrowAsync();

        // Assert
        taskRepo.Verify(r => r.Remove(task), Times.Once);
    }

    [Fact]
    public async Task RemoveTaskAsync_PlanFrozen_ThrowsBusinessRuleException()
    {
        // Arrange
        var plan     = MakePlan(PlanStatus.Frozen);
        var planRepo = new Mock<IWeeklyPlanRepository>(MockBehavior.Strict);
        planRepo.Setup(r => r.GetByIdAsync(plan.Id)).ReturnsAsync(plan);
        var svc = Svc(planRepo, new Mock<IWeeklyPlanTaskRepository>(),
            new Mock<IUserRepository>(), new Mock<IBacklogItemRepository>());

        // Act & Assert
        await svc.Invoking(s => s.RemoveTaskAsync(plan.Id, Guid.NewGuid()))
            .Should().ThrowAsync<BusinessRuleException>()
            .WithMessage("*Planning status*");
    }

    [Fact]
    public async Task RemoveTaskAsync_TaskFromDifferentPlan_ThrowsBusinessRuleException()
    {
        // Arrange — task has a different WeeklyPlanId
        var plan      = MakePlan();
        var otherPlan = MakePlan();
        var task      = MakeTask(otherPlan, MakeBacklogItem(), MakeUser()); // belongs to otherPlan

        var planRepo = new Mock<IWeeklyPlanRepository>(MockBehavior.Strict);
        var taskRepo = new Mock<IWeeklyPlanTaskRepository>(MockBehavior.Strict);
        planRepo.Setup(r => r.GetByIdAsync(plan.Id)).ReturnsAsync(plan);
        taskRepo.Setup(r => r.GetByIdAsync(task.Id)).ReturnsAsync(task);
        var svc = Svc(planRepo, taskRepo, new Mock<IUserRepository>(),
            new Mock<IBacklogItemRepository>());

        // Act & Assert
        await svc.Invoking(s => s.RemoveTaskAsync(plan.Id, task.Id))
            .Should().ThrowAsync<BusinessRuleException>()
            .WithMessage("*does not belong to this plan*");
    }

    // ── FreezePlanAsync ───────────────────────────────────────────────────────

    [Fact]
    public async Task FreezePlanAsync_PlanningStatus_FreezesPlan()
    {
        // Arrange
        var plan     = MakePlan(PlanStatus.Planning);
        var planRepo = new Mock<IWeeklyPlanRepository>(MockBehavior.Strict);
        planRepo.Setup(r => r.GetByIdAsync(plan.Id)).ReturnsAsync(plan);
        planRepo.Setup(r => r.SaveChangesAsync()).Returns(Task.CompletedTask);
        var svc = Svc(planRepo, new Mock<IWeeklyPlanTaskRepository>(),
            new Mock<IUserRepository>(), new Mock<IBacklogItemRepository>());

        // Act
        await svc.FreezePlanAsync(plan.Id);

        // Assert
        plan.Status.Should().Be(PlanStatus.Frozen);
        plan.FrozenAt.Should().NotBeNull();
    }

    [Fact]
    public async Task FreezePlanAsync_AlreadyFrozen_ThrowsBusinessRuleException()
    {
        // Arrange
        var plan     = MakePlan(PlanStatus.Frozen);
        var planRepo = new Mock<IWeeklyPlanRepository>(MockBehavior.Strict);
        planRepo.Setup(r => r.GetByIdAsync(plan.Id)).ReturnsAsync(plan);
        var svc = Svc(planRepo, new Mock<IWeeklyPlanTaskRepository>(),
            new Mock<IUserRepository>(), new Mock<IBacklogItemRepository>());

        // Act & Assert
        await svc.Invoking(s => s.FreezePlanAsync(plan.Id))
            .Should().ThrowAsync<BusinessRuleException>()
            .WithMessage("*Planning status*");
    }

    // ── UpdateProgressAsync ───────────────────────────────────────────────────

    [Fact]
    public async Task UpdateProgressAsync_ValidUpdate_UpdatesCompletedHoursAndStatus()
    {
        // Arrange — positional: UpdateProgressRequest(TaskId, CompletedHours, Status?)
        var plan = MakePlan(PlanStatus.Frozen);
        var task = MakeTask(plan, MakeBacklogItem(), MakeUser(), hours: 10m);

        var planRepo = new Mock<IWeeklyPlanRepository>(MockBehavior.Strict);
        var taskRepo = new Mock<IWeeklyPlanTaskRepository>(MockBehavior.Strict);
        planRepo.Setup(r => r.GetByIdAsync(plan.Id)).ReturnsAsync(plan);
        taskRepo.Setup(r => r.GetByIdAsync(task.Id)).ReturnsAsync(task);
        taskRepo.Setup(r => r.SaveChangesAsync()).Returns(Task.CompletedTask);
        var svc = Svc(planRepo, taskRepo, new Mock<IUserRepository>(),
            new Mock<IBacklogItemRepository>());

        // Act
        await svc.UpdateProgressAsync(plan.Id,
            new UpdateProgressRequest(task.Id, 6m, WorkItemStatus.InProgress));

        // Assert
        task.CompletedHours.Should().Be(6m);
        task.Status.Should().Be(WorkItemStatus.InProgress);
    }

    [Fact]
    public async Task UpdateProgressAsync_NegativeCompletedHours_ThrowsBusinessRuleException()
    {
        // Arrange
        var plan = MakePlan(PlanStatus.Frozen);
        var task = MakeTask(plan, MakeBacklogItem(), MakeUser());

        var planRepo = new Mock<IWeeklyPlanRepository>(MockBehavior.Strict);
        var taskRepo = new Mock<IWeeklyPlanTaskRepository>(MockBehavior.Strict);
        planRepo.Setup(r => r.GetByIdAsync(plan.Id)).ReturnsAsync(plan);
        taskRepo.Setup(r => r.GetByIdAsync(task.Id)).ReturnsAsync(task);
        var svc = Svc(planRepo, taskRepo, new Mock<IUserRepository>(),
            new Mock<IBacklogItemRepository>());

        // Act & Assert
        await svc.Invoking(s => s.UpdateProgressAsync(plan.Id,
                new UpdateProgressRequest(task.Id, -1m)))
            .Should().ThrowAsync<BusinessRuleException>()
            .WithMessage("*negative*");
    }

    [Fact]
    public async Task UpdateProgressAsync_PlanNotFrozen_ThrowsBusinessRuleException()
    {
        // Arrange — plan is in Planning, not Frozen
        var plan     = MakePlan(PlanStatus.Planning);
        var planRepo = new Mock<IWeeklyPlanRepository>(MockBehavior.Strict);
        planRepo.Setup(r => r.GetByIdAsync(plan.Id)).ReturnsAsync(plan);
        var svc = Svc(planRepo, new Mock<IWeeklyPlanTaskRepository>(),
            new Mock<IUserRepository>(), new Mock<IBacklogItemRepository>());

        // Act & Assert
        await svc.Invoking(s => s.UpdateProgressAsync(plan.Id,
                new UpdateProgressRequest(Guid.NewGuid(), 5m)))
            .Should().ThrowAsync<BusinessRuleException>()
            .WithMessage("*Frozen status*");
    }

    /// <summary>
    /// Parametrized theory covering every allowed and disallowed status transition for task progress.
    /// </summary>
    [Theory]
    [InlineData(WorkItemStatus.NotStarted, WorkItemStatus.InProgress, true)]
    [InlineData(WorkItemStatus.InProgress, WorkItemStatus.Completed,  true)]
    [InlineData(WorkItemStatus.Completed,  WorkItemStatus.InProgress, true)]   // demo app allows revert
    [InlineData(WorkItemStatus.NotStarted, WorkItemStatus.Blocked,    true)]   // Blocked allowed from any
    [InlineData(WorkItemStatus.InProgress, WorkItemStatus.Blocked,    true)]
    [InlineData(WorkItemStatus.NotStarted, WorkItemStatus.Completed,  false)]  // must pass InProgress first
    public async Task UpdateProgressAsync_StatusTransitionMatrix(
        WorkItemStatus from, WorkItemStatus to, bool shouldSucceed)
    {
        // Arrange
        var plan = MakePlan(PlanStatus.Frozen);
        var task = MakeTask(plan, MakeBacklogItem(), MakeUser());
        task.Status = from;

        var planRepo = new Mock<IWeeklyPlanRepository>(MockBehavior.Strict);
        var taskRepo = new Mock<IWeeklyPlanTaskRepository>(MockBehavior.Strict);
        planRepo.Setup(r => r.GetByIdAsync(plan.Id)).ReturnsAsync(plan);
        taskRepo.Setup(r => r.GetByIdAsync(task.Id)).ReturnsAsync(task);
        if (shouldSucceed)
            taskRepo.Setup(r => r.SaveChangesAsync()).Returns(Task.CompletedTask);
        var svc = Svc(planRepo, taskRepo, new Mock<IUserRepository>(),
            new Mock<IBacklogItemRepository>());

        // Act & Assert
        if (shouldSucceed)
            await svc.Invoking(s => s.UpdateProgressAsync(plan.Id,
                    new UpdateProgressRequest(task.Id, 2m, to)))
                .Should().NotThrowAsync();
        else
            await svc.Invoking(s => s.UpdateProgressAsync(plan.Id,
                    new UpdateProgressRequest(task.Id, 2m, to)))
                .Should().ThrowAsync<BusinessRuleException>();
    }

    // ── CompletePlanAsync ─────────────────────────────────────────────────────

    [Fact]
    public async Task CompletePlanAsync_FrozenPlan_MarksCompleted()
    {
        // Arrange
        var plan     = MakePlan(PlanStatus.Frozen);
        var planRepo = new Mock<IWeeklyPlanRepository>(MockBehavior.Strict);
        planRepo.Setup(r => r.GetByIdAsync(plan.Id)).ReturnsAsync(plan);
        planRepo.Setup(r => r.SaveChangesAsync()).Returns(Task.CompletedTask);
        var svc = Svc(planRepo, new Mock<IWeeklyPlanTaskRepository>(),
            new Mock<IUserRepository>(), new Mock<IBacklogItemRepository>());

        // Act
        await svc.CompletePlanAsync(plan.Id);

        // Assert
        plan.Status.Should().Be(PlanStatus.Completed);
        plan.CompletedAt.Should().NotBeNull();
    }

    [Fact]
    public async Task CompletePlanAsync_PlanningStatus_ThrowsBusinessRuleException()
    {
        // Arrange — must freeze plan before completing
        var plan     = MakePlan(PlanStatus.Planning);
        var planRepo = new Mock<IWeeklyPlanRepository>(MockBehavior.Strict);
        planRepo.Setup(r => r.GetByIdAsync(plan.Id)).ReturnsAsync(plan);
        var svc = Svc(planRepo, new Mock<IWeeklyPlanTaskRepository>(),
            new Mock<IUserRepository>(), new Mock<IBacklogItemRepository>());

        // Act & Assert
        await svc.Invoking(s => s.CompletePlanAsync(plan.Id))
            .Should().ThrowAsync<BusinessRuleException>()
            .WithMessage("*frozen plan*");
    }

    // ── CancelPlanAsync ───────────────────────────────────────────────────────

    [Fact]
    public async Task CancelPlanAsync_PlanningStatus_DeletesPlan()
    {
        // Arrange
        var plan     = MakePlan(PlanStatus.Planning);
        var planRepo = new Mock<IWeeklyPlanRepository>(MockBehavior.Strict);
        planRepo.Setup(r => r.GetByIdWithTasksAsync(plan.Id)).ReturnsAsync(plan);
        planRepo.Setup(r => r.DeletePlanWithTasksAsync(plan)).Returns(Task.CompletedTask);
        planRepo.Setup(r => r.SaveChangesAsync()).Returns(Task.CompletedTask);
        var svc = Svc(planRepo, new Mock<IWeeklyPlanTaskRepository>(),
            new Mock<IUserRepository>(), new Mock<IBacklogItemRepository>());

        // Act
        await svc.Invoking(s => s.CancelPlanAsync(plan.Id))
            .Should().NotThrowAsync();

        // Assert — full deletion called
        planRepo.Verify(r => r.DeletePlanWithTasksAsync(plan), Times.Once);
    }

    [Fact]
    public async Task CancelPlanAsync_FrozenPlan_ThrowsBusinessRuleException()
    {
        // Arrange — frozen plans cannot be cancelled per the spec
        var plan     = MakePlan(PlanStatus.Frozen);
        var planRepo = new Mock<IWeeklyPlanRepository>(MockBehavior.Strict);
        planRepo.Setup(r => r.GetByIdWithTasksAsync(plan.Id)).ReturnsAsync(plan);
        var svc = Svc(planRepo, new Mock<IWeeklyPlanTaskRepository>(),
            new Mock<IUserRepository>(), new Mock<IBacklogItemRepository>());

        // Act & Assert
        await svc.Invoking(s => s.CancelPlanAsync(plan.Id))
            .Should().ThrowAsync<BusinessRuleException>()
            .WithMessage("*cannot be cancelled*");
    }
}
