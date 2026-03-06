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
/// Unit tests for <see cref="BacklogService"/>.
/// Covers CRUD, status transitions, and all business rule validations.
/// </summary>
public class BacklogServiceTests
{
    // ── Helpers ──────────────────────────────────────────────────────────────

    private static Mock<IBacklogItemRepository> MockRepo() => new(MockBehavior.Strict);

    private static BacklogItem MakeItem(BacklogItemStatus status = BacklogItemStatus.Available) =>
        new()
        {
            Id             = Guid.NewGuid(),
            Title          = "Fix login bug",
            Description    = "Users can't log in",
            Category       = CategoryType.Client,
            EstimatedHours = 4,      // int? — not decimal
            Status         = status
        };

    // ── GetAllBacklogItemsAsync ───────────────────────────────────────────────

    [Fact]
    public async Task GetAllBacklogItemsAsync_ReturnsFilteredItems()
    {
        // Arrange
        var items = new List<BacklogItem> { MakeItem(), MakeItem() };
        var repo  = MockRepo();
        repo.Setup(r => r.GetAllAsync(null)).ReturnsAsync(items);
        var svc = new BacklogService(repo.Object);

        // Act
        var result = (await svc.GetAllBacklogItemsAsync()).ToList();

        // Assert
        result.Should().HaveCount(2);
    }

    [Fact]
    public async Task GetAllBacklogItemsAsync_WithCategory_FiltersCorrectly()
    {
        // Arrange
        var repo = MockRepo();
        repo.Setup(r => r.GetAllAsync(CategoryType.Client))
            .ReturnsAsync(new List<BacklogItem> { MakeItem() });
        var svc = new BacklogService(repo.Object);

        // Act
        var result = (await svc.GetAllBacklogItemsAsync(CategoryType.Client)).ToList();

        // Assert
        result.Should().HaveCount(1);
        result[0].Category.Should().Be(CategoryType.Client);
    }

    [Fact]
    public async Task GetAllBacklogItemsIncludingInactiveAsync_ReturnsAllItems()
    {
        // Arrange
        var repo = MockRepo();
        repo.Setup(r => r.GetAllIncludingInactiveAsync(null))
            .ReturnsAsync(new List<BacklogItem> { MakeItem(), MakeItem(BacklogItemStatus.Archived) });
        var svc = new BacklogService(repo.Object);

        // Act
        var result = (await svc.GetAllBacklogItemsIncludingInactiveAsync()).ToList();

        // Assert
        result.Should().HaveCount(2);
    }

    // ── CreateBacklogItemAsync ────────────────────────────────────────────────

    [Fact]
    public async Task CreateBacklogItemAsync_ValidRequest_ReturnsTrimmedDto()
    {
        // Arrange — positional record constructor: (Title, Description, Category, EstimatedHours?)
        var repo = MockRepo();
        repo.Setup(r => r.AddAsync(It.IsAny<BacklogItem>()))
            .ReturnsAsync((BacklogItem b) => b);
        repo.Setup(r => r.SaveChangesAsync()).Returns(Task.CompletedTask);
        var svc = new BacklogService(repo.Object);

        // Act
        var result = await svc.CreateBacklogItemAsync(
            new CreateBacklogItemRequest("  Build API  ", "desc", CategoryType.TechDebt, 8));

        // Assert
        result.Title.Should().Be("Build API");   // trimmed
        result.Category.Should().Be(CategoryType.TechDebt);
        result.Status.Should().Be("Available");
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task CreateBacklogItemAsync_EmptyTitle_ThrowsBusinessRuleException(string title)
    {
        // Arrange
        var svc = new BacklogService(MockRepo().Object);

        // Act & Assert
        await svc.Invoking(s => s.CreateBacklogItemAsync(
                new CreateBacklogItemRequest(title, "", CategoryType.Client)))
            .Should().ThrowAsync<BusinessRuleException>()
            .WithMessage("*title is required*");
    }

    [Fact]
    public async Task CreateBacklogItemAsync_ZeroEstimatedHours_ThrowsBusinessRuleException()
    {
        // Arrange
        var svc = new BacklogService(MockRepo().Object);

        // Act & Assert
        await svc.Invoking(s => s.CreateBacklogItemAsync(
                new CreateBacklogItemRequest("Item", "", CategoryType.Client, 0)))
            .Should().ThrowAsync<BusinessRuleException>()
            .WithMessage("*greater than 0*");
    }

    [Fact]
    public async Task CreateBacklogItemAsync_NegativeEstimatedHours_ThrowsBusinessRuleException()
    {
        // Arrange
        var svc = new BacklogService(MockRepo().Object);

        // Act & Assert
        await svc.Invoking(s => s.CreateBacklogItemAsync(
                new CreateBacklogItemRequest("Item", "", CategoryType.Client, -5)))
            .Should().ThrowAsync<BusinessRuleException>();
    }

    // ── UpdateBacklogItemAsync ────────────────────────────────────────────────

    [Fact]
    public async Task UpdateBacklogItemAsync_ChangeTitleAndDescription_UpdatesSuccessfully()
    {
        // Arrange — positional: (Title?, Description?, Category?, EstimatedHours?, Status?)
        var item = MakeItem();
        var repo = MockRepo();
        repo.Setup(r => r.GetByIdAsync(item.Id)).ReturnsAsync(item);
        repo.Setup(r => r.SaveChangesAsync()).Returns(Task.CompletedTask);
        var svc = new BacklogService(repo.Object);

        // Act
        var result = await svc.UpdateBacklogItemAsync(item.Id,
            new UpdateBacklogItemRequest("Renamed", "Updated desc", null, null));

        // Assert
        result.Title.Should().Be("Renamed");
    }

    [Fact]
    public async Task UpdateBacklogItemAsync_ChangeCategoryWhileInProgress_ThrowsBusinessRuleException()
    {
        // Arrange
        var item = MakeItem(BacklogItemStatus.InProgress);
        var repo = MockRepo();
        repo.Setup(r => r.GetByIdAsync(item.Id)).ReturnsAsync(item);
        var svc = new BacklogService(repo.Object);

        // Act & Assert
        await svc.Invoking(s => s.UpdateBacklogItemAsync(item.Id,
                new UpdateBacklogItemRequest(null, null, CategoryType.RnD, null)))
            .Should().ThrowAsync<BusinessRuleException>()
            .WithMessage("*Cannot change category*");
    }

    [Fact]
    public async Task UpdateBacklogItemAsync_InvalidStatusTransition_ThrowsBusinessRuleException()
    {
        // Arrange — InProgress → Archived is not a valid transition
        var item = MakeItem(BacklogItemStatus.InProgress);
        var repo = MockRepo();
        repo.Setup(r => r.GetByIdAsync(item.Id)).ReturnsAsync(item);
        var svc = new BacklogService(repo.Object);

        // Act & Assert
        await svc.Invoking(s => s.UpdateBacklogItemAsync(item.Id,
                new UpdateBacklogItemRequest(null, null, null, null, BacklogItemStatus.Archived)))
            .Should().ThrowAsync<BusinessRuleException>()
            .WithMessage("*Cannot transition*");
    }

    [Fact]
    public async Task UpdateBacklogItemAsync_Available_To_Archived_Succeeds()
    {
        // Arrange
        var item = MakeItem(BacklogItemStatus.Available);
        var repo = MockRepo();
        repo.Setup(r => r.GetByIdAsync(item.Id)).ReturnsAsync(item);
        repo.Setup(r => r.SaveChangesAsync()).Returns(Task.CompletedTask);
        var svc = new BacklogService(repo.Object);

        // Act
        var result = await svc.UpdateBacklogItemAsync(item.Id,
            new UpdateBacklogItemRequest(null, null, null, null, BacklogItemStatus.Archived));

        // Assert
        result.Status.Should().Be("Archived");
    }

    [Fact]
    public async Task UpdateBacklogItemAsync_NotFound_ThrowsNotFoundException()
    {
        // Arrange
        var id   = Guid.NewGuid();
        var repo = MockRepo();
        repo.Setup(r => r.GetByIdAsync(id)).ReturnsAsync((BacklogItem?)null);
        var svc = new BacklogService(repo.Object);

        // Act & Assert
        await svc.Invoking(s => s.UpdateBacklogItemAsync(id,
                new UpdateBacklogItemRequest(null, null, null, null)))
            .Should().ThrowAsync<NotFoundException>();
    }

    // ── DeleteBacklogItemAsync (soft archive) ─────────────────────────────────

    [Fact]
    public async Task DeleteBacklogItemAsync_Available_ArchivesItem()
    {
        // Arrange
        var item = MakeItem(BacklogItemStatus.Available);
        var repo = MockRepo();
        repo.Setup(r => r.GetByIdAsync(item.Id)).ReturnsAsync(item);
        repo.Setup(r => r.IsUsedInActivePlanAsync(item.Id)).ReturnsAsync(false);
        repo.Setup(r => r.SaveChangesAsync()).Returns(Task.CompletedTask);
        var svc = new BacklogService(repo.Object);

        // Act
        await svc.DeleteBacklogItemAsync(item.Id);

        // Assert — in-memory entity status updated
        item.Status.Should().Be(BacklogItemStatus.Archived);
    }

    [Fact]
    public async Task DeleteBacklogItemAsync_ItemInProgress_ThrowsBusinessRuleException()
    {
        // Arrange — InProgress items cannot be archived
        var item = MakeItem(BacklogItemStatus.InProgress);
        var repo = MockRepo();
        repo.Setup(r => r.GetByIdAsync(item.Id)).ReturnsAsync(item);
        var svc = new BacklogService(repo.Object);

        // Act & Assert
        await svc.Invoking(s => s.DeleteBacklogItemAsync(item.Id))
            .Should().ThrowAsync<BusinessRuleException>()
            .WithMessage("*in an active weekly plan*");
    }

    [Fact]
    public async Task DeleteBacklogItemAsync_UsedInActivePlan_ThrowsBusinessRuleException()
    {
        // Arrange
        var item = MakeItem(BacklogItemStatus.Available);
        var repo = MockRepo();
        repo.Setup(r => r.GetByIdAsync(item.Id)).ReturnsAsync(item);
        repo.Setup(r => r.IsUsedInActivePlanAsync(item.Id)).ReturnsAsync(true);
        var svc = new BacklogService(repo.Object);

        // Act & Assert
        await svc.Invoking(s => s.DeleteBacklogItemAsync(item.Id))
            .Should().ThrowAsync<BusinessRuleException>()
            .WithMessage("*active weekly plan*");
    }

    // ── HardDeleteBacklogItemAsync ────────────────────────────────────────────

    [Fact]
    public async Task HardDeleteBacklogItemAsync_NeverUsed_DeletesPermanently()
    {
        // Arrange
        var item = MakeItem();
        var repo = MockRepo();
        repo.Setup(r => r.GetByIdAsync(item.Id)).ReturnsAsync(item);
        repo.Setup(r => r.IsReferencedInAnyPlanAsync(item.Id)).ReturnsAsync(false);
        repo.Setup(r => r.Remove(item));
        repo.Setup(r => r.SaveChangesAsync()).Returns(Task.CompletedTask);
        var svc = new BacklogService(repo.Object);

        // Act
        await svc.HardDeleteBacklogItemAsync(item.Id);

        // Assert — Remove called exactly once
        repo.Verify(r => r.Remove(item), Times.Once);
    }

    [Fact]
    public async Task HardDeleteBacklogItemAsync_ReferencedInPlan_ThrowsBusinessRuleException()
    {
        // Arrange
        var item = MakeItem();
        var repo = MockRepo();
        repo.Setup(r => r.GetByIdAsync(item.Id)).ReturnsAsync(item);
        repo.Setup(r => r.IsReferencedInAnyPlanAsync(item.Id)).ReturnsAsync(true);
        var svc = new BacklogService(repo.Object);

        // Act & Assert
        await svc.Invoking(s => s.HardDeleteBacklogItemAsync(item.Id))
            .Should().ThrowAsync<BusinessRuleException>()
            .WithMessage("*Archive it instead*");
    }

    // ── Status transition matrix (Theory) ────────────────────────────────────

    [Theory]
    [InlineData(BacklogItemStatus.Available,   BacklogItemStatus.Archived,   true)]
    [InlineData(BacklogItemStatus.Archived,    BacklogItemStatus.Available,  true)]
    [InlineData(BacklogItemStatus.Done,        BacklogItemStatus.Available,  true)]
    [InlineData(BacklogItemStatus.Available,   BacklogItemStatus.InProgress, true)]
    [InlineData(BacklogItemStatus.InProgress,  BacklogItemStatus.Done,       true)]
    [InlineData(BacklogItemStatus.InProgress,  BacklogItemStatus.Available,  true)]
    [InlineData(BacklogItemStatus.Available,   BacklogItemStatus.Done,       false)]   // invalid
    [InlineData(BacklogItemStatus.Done,        BacklogItemStatus.Archived,   false)]   // invalid
    public async Task UpdateBacklogItemAsync_StatusTransitionMatrix(
        BacklogItemStatus from, BacklogItemStatus to, bool shouldSucceed)
    {
        // Arrange
        var item = MakeItem(from);
        var repo = MockRepo();
        repo.Setup(r => r.GetByIdAsync(item.Id)).ReturnsAsync(item);
        if (shouldSucceed)
            repo.Setup(r => r.SaveChangesAsync()).Returns(Task.CompletedTask);
        var svc = new BacklogService(repo.Object);

        // Act & Assert
        if (shouldSucceed)
        {
            await svc.Invoking(s => s.UpdateBacklogItemAsync(item.Id,
                    new UpdateBacklogItemRequest(null, null, null, null, to)))
                .Should().NotThrowAsync();
        }
        else
        {
            await svc.Invoking(s => s.UpdateBacklogItemAsync(item.Id,
                    new UpdateBacklogItemRequest(null, null, null, null, to)))
                .Should().ThrowAsync<BusinessRuleException>();
        }
    }
}
