using FluentAssertions;
using Moq;
using WeeklyPlanner.Application.Interfaces;
using WeeklyPlanner.Application.Services;
using WeeklyPlanner.Domain.Entities;
using WeeklyPlanner.Domain.Enums;
using WeeklyPlanner.Domain.Exceptions;
using Xunit;

namespace WeeklyPlanner.Tests.Services;

/// <summary>
/// Unit tests for <see cref="DashboardService"/>.
/// Validates aggregate calculations (overall progress, category breakdown, user breakdown)
/// and not-found Guards.
/// </summary>
public class DashboardServiceTests
{
    // ── Factories ─────────────────────────────────────────────────────────────

    private static WeeklyPlan MakePlan() => new()
    {
        Id             = Guid.NewGuid(),
        WeekStartDate  = DateTime.Today,
        WeekEndDate    = DateTime.Today.AddDays(5),
        ClientPercent  = 50m, TechDebtPercent = 30m, RDPercent = 20m,
        TotalTeamHours = 30m, Status = PlanStatus.Frozen,
        CreatedAt      = DateTime.UtcNow
    };

    private static User MakeUser(string name = "Alice") =>
        new() { Id = Guid.NewGuid(), Name = name, Role = UserRole.TeamMember, IsActive = true };

    private static BacklogItem MakeItem(CategoryType cat) =>
        new() { Id = Guid.NewGuid(), Title = "Item", Category = cat,
                Status = BacklogItemStatus.InProgress };

    private static WeeklyPlanTask MakeTask(WeeklyPlan plan, BacklogItem item, User user,
        decimal planned, decimal completed) =>
        new()
        {
            Id = Guid.NewGuid(), WeeklyPlanId = plan.Id,
            BacklogItemId = item.Id, AssignedUserId = user.Id,
            PlannedHours = planned, CompletedHours = completed,
            Status = WorkItemStatus.InProgress
        };

    private static DashboardService BuildSvc(
        Mock<IWeeklyPlanRepository>     pr,
        Mock<IWeeklyPlanTaskRepository> tr,
        Mock<IUserRepository>           ur,
        Mock<IBacklogItemRepository>    br) =>
        new(pr.Object, tr.Object, ur.Object, br.Object);

    // ── GetDashboardAsync ─────────────────────────────────────────────────────

    [Fact]
    public async Task GetDashboardAsync_PlanNotFound_ThrowsNotFoundException()
    {
        // Arrange
        var id = Guid.NewGuid();
        var pr = new Mock<IWeeklyPlanRepository>(MockBehavior.Strict);
        pr.Setup(r => r.GetByIdAsync(id)).ReturnsAsync((WeeklyPlan?)null);
        var svc = BuildSvc(pr, new Mock<IWeeklyPlanTaskRepository>(),
            new Mock<IUserRepository>(), new Mock<IBacklogItemRepository>());

        // Act & Assert
        await svc.Invoking(s => s.GetDashboardAsync(id))
            .Should().ThrowAsync<NotFoundException>();
    }

    [Fact]
    public async Task GetDashboardAsync_NoTasks_ReturnsZeroProgressAndAllThreeCategories()
    {
        // Arrange
        var plan = MakePlan();
        var pr   = new Mock<IWeeklyPlanRepository>(MockBehavior.Strict);
        var tr   = new Mock<IWeeklyPlanTaskRepository>(MockBehavior.Strict);
        var ur   = new Mock<IUserRepository>(MockBehavior.Strict);
        var br   = new Mock<IBacklogItemRepository>(MockBehavior.Strict);

        pr.Setup(r => r.GetByIdAsync(plan.Id)).ReturnsAsync(plan);
        tr.Setup(r => r.GetByPlanIdAsync(plan.Id)).ReturnsAsync(new List<WeeklyPlanTask>());
        ur.Setup(r => r.GetAllAsync()).ReturnsAsync(new List<User>());
        br.Setup(r => r.GetAllAsync(null)).ReturnsAsync(new List<BacklogItem>());
        var svc = BuildSvc(pr, tr, ur, br);

        // Act
        var result = await svc.GetDashboardAsync(plan.Id);

        // Assert — zero totals; all 3 categories always present (even with 0h)
        result.TotalPlannedHours.Should().Be(0m);
        result.OverallProgress.Should().Be(0m);
        result.CategoryBreakdown.Should().HaveCount(3);
        result.UserBreakdown.Should().BeEmpty();
    }

    [Fact]
    public async Task GetDashboardAsync_WithTasks_CalculatesAggregatesCorrectly()
    {
        // Arrange — Alice: 10 planned / 5 completed; Bob: 20 planned / 20 completed
        var plan  = MakePlan();
        var alice = MakeUser("Alice");
        var bob   = MakeUser("Bob");
        var item1 = MakeItem(CategoryType.Client);
        var item2 = MakeItem(CategoryType.TechDebt);

        var tasks = new List<WeeklyPlanTask>
        {
            MakeTask(plan, item1, alice, planned: 10m, completed: 5m),
            MakeTask(plan, item2, bob,   planned: 20m, completed: 20m)
        };

        var pr = new Mock<IWeeklyPlanRepository>(MockBehavior.Strict);
        var tr = new Mock<IWeeklyPlanTaskRepository>(MockBehavior.Strict);
        var ur = new Mock<IUserRepository>(MockBehavior.Strict);
        var br = new Mock<IBacklogItemRepository>(MockBehavior.Strict);

        pr.Setup(r => r.GetByIdAsync(plan.Id)).ReturnsAsync(plan);
        tr.Setup(r => r.GetByPlanIdAsync(plan.Id)).ReturnsAsync(tasks);
        ur.Setup(r => r.GetAllAsync()).ReturnsAsync(new List<User> { alice, bob });
        br.Setup(r => r.GetAllAsync(null)).ReturnsAsync(new List<BacklogItem> { item1, item2 });
        var svc = BuildSvc(pr, tr, ur, br);

        // Act
        var result = await svc.GetDashboardAsync(plan.Id);

        // Assert — overall: 25 / 30 = 83.3%
        result.TotalPlannedHours.Should().Be(30m);
        result.TotalCompletedHours.Should().Be(25m);
        result.OverallProgress.Should().Be(Math.Round(25m / 30m * 100, 1));

        // Category breakdown
        result.CategoryBreakdown.Should().HaveCount(3);
        var clientCat = result.CategoryBreakdown.First(c => c.Category == "Client");
        clientCat.PlannedHours.Should().Be(10m);
        clientCat.CompletedHours.Should().Be(5m);

        // User breakdown
        result.UserBreakdown.Should().HaveCount(2);
        var aliceProg = result.UserBreakdown.First(u => u.UserName == "Alice");
        aliceProg.PlannedHours.Should().Be(10m);
        aliceProg.ProgressPercent.Should().Be(50m);
    }

    [Fact]
    public async Task GetDashboardAsync_AllThreeCategoriesAlwaysReturned()
    {
        // Arrange — only RnD has tasks; Client and TechDebt should still appear with 0h
        var plan  = MakePlan();
        var alice = MakeUser("Alice");
        var item  = MakeItem(CategoryType.RnD);

        var pr = new Mock<IWeeklyPlanRepository>(MockBehavior.Strict);
        var tr = new Mock<IWeeklyPlanTaskRepository>(MockBehavior.Strict);
        var ur = new Mock<IUserRepository>(MockBehavior.Strict);
        var br = new Mock<IBacklogItemRepository>(MockBehavior.Strict);

        pr.Setup(r => r.GetByIdAsync(plan.Id)).ReturnsAsync(plan);
        tr.Setup(r => r.GetByPlanIdAsync(plan.Id))
            .ReturnsAsync(new List<WeeklyPlanTask> { MakeTask(plan, item, alice, 10m, 3m) });
        ur.Setup(r => r.GetAllAsync()).ReturnsAsync(new List<User> { alice });
        br.Setup(r => r.GetAllAsync(null)).ReturnsAsync(new List<BacklogItem> { item });
        var svc = BuildSvc(pr, tr, ur, br);

        // Act
        var result = await svc.GetDashboardAsync(plan.Id);

        // Assert
        result.CategoryBreakdown.Should().HaveCount(3);
        result.CategoryBreakdown.Should().Contain(c => c.Category == "Client"   && c.PlannedHours == 0m);
        result.CategoryBreakdown.Should().Contain(c => c.Category == "TechDebt" && c.PlannedHours == 0m);
        result.CategoryBreakdown.Should().Contain(c => c.Category == "RnD"      && c.PlannedHours == 10m);
    }

    // ── GetTasksByUserAsync ───────────────────────────────────────────────────

    [Fact]
    public async Task GetTasksByUserAsync_PlanNotFound_ThrowsNotFoundException()
    {
        // Arrange
        var id = Guid.NewGuid();
        var pr = new Mock<IWeeklyPlanRepository>(MockBehavior.Strict);
        pr.Setup(r => r.GetByIdAsync(id)).ReturnsAsync((WeeklyPlan?)null);
        var svc = BuildSvc(pr, new Mock<IWeeklyPlanTaskRepository>(),
            new Mock<IUserRepository>(), new Mock<IBacklogItemRepository>());

        // Act & Assert
        await svc.Invoking(s => s.GetTasksByUserAsync(id, Guid.NewGuid()))
            .Should().ThrowAsync<NotFoundException>();
    }

    [Fact]
    public async Task GetTasksByUserAsync_ValidRequest_ReturnsUserTasksWithProgress()
    {
        // Arrange
        var plan  = MakePlan();
        var alice = MakeUser("Alice");
        var item  = MakeItem(CategoryType.Client);
        var task  = MakeTask(plan, item, alice, planned: 8m, completed: 3m);

        var pr = new Mock<IWeeklyPlanRepository>(MockBehavior.Strict);
        var tr = new Mock<IWeeklyPlanTaskRepository>(MockBehavior.Strict);
        var ur = new Mock<IUserRepository>(MockBehavior.Strict);
        var br = new Mock<IBacklogItemRepository>(MockBehavior.Strict);

        pr.Setup(r => r.GetByIdAsync(plan.Id)).ReturnsAsync(plan);
        tr.Setup(r => r.GetByPlanIdAndUserIdAsync(plan.Id, alice.Id))
            .ReturnsAsync(new List<WeeklyPlanTask> { task });
        ur.Setup(r => r.GetAllAsync()).ReturnsAsync(new List<User> { alice });
        br.Setup(r => r.GetAllAsync(null)).ReturnsAsync(new List<BacklogItem> { item });
        var svc = BuildSvc(pr, tr, ur, br);

        // Act
        var result = (await svc.GetTasksByUserAsync(plan.Id, alice.Id)).ToList();

        // Assert
        result.Should().HaveCount(1);
        result[0].PlannedHours.Should().Be(8m);
        result[0].CompletedHours.Should().Be(3m);
        result[0].ProgressPercent.Should().Be(Math.Round(3m / 8m * 100, 1));
    }

    [Fact]
    public async Task GetTasksByUserAsync_UnknownBacklogItem_FallsBackToUnknownTitle()
    {
        // Arrange — backlog item not present in the lookup dict (edge case / data inconsistency)
        var plan  = MakePlan();
        var alice = MakeUser("Alice");
        var item  = MakeItem(CategoryType.Client);
        var task  = MakeTask(plan, item, alice, planned: 5m, completed: 0m);

        var pr = new Mock<IWeeklyPlanRepository>(MockBehavior.Strict);
        var tr = new Mock<IWeeklyPlanTaskRepository>(MockBehavior.Strict);
        var ur = new Mock<IUserRepository>(MockBehavior.Strict);
        var br = new Mock<IBacklogItemRepository>(MockBehavior.Strict);

        pr.Setup(r => r.GetByIdAsync(plan.Id)).ReturnsAsync(plan);
        tr.Setup(r => r.GetByPlanIdAndUserIdAsync(plan.Id, alice.Id))
            .ReturnsAsync(new List<WeeklyPlanTask> { task });
        ur.Setup(r => r.GetAllAsync()).ReturnsAsync(new List<User> { alice });
        br.Setup(r => r.GetAllAsync(null))
            .ReturnsAsync(new List<BacklogItem>());  // empty — item not found
        var svc = BuildSvc(pr, tr, ur, br);

        // Act
        var result = (await svc.GetTasksByUserAsync(plan.Id, alice.Id)).ToList();

        // Assert — must not throw; falls back gracefully to "Unknown"
        result.Should().HaveCount(1);
        result[0].BacklogItemTitle.Should().Be("Unknown");
    }
}
