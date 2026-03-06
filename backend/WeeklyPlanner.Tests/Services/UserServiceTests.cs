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
/// Unit tests for <see cref="UserService"/>.
/// Covers all public methods and every business-rule branch.
/// Repositories are mocked so no database is needed.
/// </summary>
public class UserServiceTests
{
    // ── Helpers ──────────────────────────────────────────────────────────────

    private static Mock<IUserRepository> MockRepo() => new(MockBehavior.Strict);

    private static User MakeLead(string name = "Alice") =>
        new() { Id = Guid.NewGuid(), Name = name, Role = UserRole.TeamLead, IsActive = true };

    private static User MakeMember(string name = "Bob") =>
        new() { Id = Guid.NewGuid(), Name = name, Role = UserRole.TeamMember, IsActive = true };

    // ── GetAllUsersAsync ──────────────────────────────────────────────────────

    [Fact]
    public async Task GetAllUsersAsync_ReturnsAllActiveUsers()
    {
        // Arrange
        var users = new List<User> { MakeLead(), MakeMember() };
        var repo  = MockRepo();
        repo.Setup(r => r.GetAllAsync()).ReturnsAsync(users);
        var svc = new UserService(repo.Object);

        // Act
        var result = (await svc.GetAllUsersAsync()).ToList();

        // Assert
        result.Should().HaveCount(2);
        result[0].Name.Should().Be("Alice");
        result[1].Name.Should().Be("Bob");
    }

    // ── GetAllUsersIncludingInactiveAsync ─────────────────────────────────────

    [Fact]
    public async Task GetAllUsersIncludingInactiveAsync_IncludesInactiveUsers()
    {
        // Arrange
        var inactive = MakeMember("Inactive");
        inactive.IsActive = false;
        var users = new List<User> { MakeLead(), inactive };
        var repo  = MockRepo();
        repo.Setup(r => r.GetAllIncludingInactiveAsync()).ReturnsAsync(users);
        var svc = new UserService(repo.Object);

        // Act
        var result = (await svc.GetAllUsersIncludingInactiveAsync()).ToList();

        // Assert
        result.Should().HaveCount(2);
        result.Should().Contain(u => u.Name == "Inactive");
    }

    // ── CreateUserAsync ───────────────────────────────────────────────────────

    [Fact]
    public async Task CreateUserAsync_ValidMember_ReturnsTrimmedDto()
    {
        // Arrange
        var repo = MockRepo();
        repo.Setup(r => r.AddAsync(It.IsAny<User>()))
            .ReturnsAsync((User u) => u);
        repo.Setup(r => r.SaveChangesAsync()).Returns(Task.CompletedTask);
        var svc = new UserService(repo.Object);

        // Act — name should be trimmed
        var result = await svc.CreateUserAsync(new CreateUserRequest("  Charlie  ", UserRole.TeamMember));

        // Assert
        result.Name.Should().Be("Charlie");
        result.Role.Should().Be(UserRole.TeamMember);
    }

    [Fact]
    public async Task CreateUserAsync_NewTeamLead_DemotesExistingLead()
    {
        // Arrange
        var existingLead = MakeLead("OldLead");
        var repo = MockRepo();
        repo.Setup(r => r.GetAllIncludingInactiveAsync())
            .ReturnsAsync(new List<User> { existingLead });
        repo.Setup(r => r.AddAsync(It.IsAny<User>()))
            .ReturnsAsync((User u) => u);
        repo.Setup(r => r.SaveChangesAsync()).Returns(Task.CompletedTask);
        var svc = new UserService(repo.Object);

        // Act
        await svc.CreateUserAsync(new CreateUserRequest("NewLead", UserRole.TeamLead));

        // Assert — old lead should be demoted in memory before save
        existingLead.Role.Should().Be(UserRole.TeamMember);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task CreateUserAsync_EmptyName_ThrowsBusinessRuleException(string name)
    {
        // Arrange
        var svc = new UserService(MockRepo().Object);

        // Act & Assert
        await svc.Invoking(s => s.CreateUserAsync(new CreateUserRequest(name, UserRole.TeamMember)))
            .Should().ThrowAsync<BusinessRuleException>()
            .WithMessage("*required*");
    }

    // ── UpdateUserAsync ───────────────────────────────────────────────────────

    [Fact]
    public async Task UpdateUserAsync_ChangeName_UpdatesSuccessfully()
    {
        // Arrange
        var user = MakeMember("Bob");
        var repo = MockRepo();
        repo.Setup(r => r.GetByIdAsync(user.Id)).ReturnsAsync(user);
        repo.Setup(r => r.SaveChangesAsync()).Returns(Task.CompletedTask);
        var svc = new UserService(repo.Object);

        // Act
        var result = await svc.UpdateUserAsync(user.Id, new UpdateUserRequest("Robert", null, null));

        // Assert
        result.Name.Should().Be("Robert");
    }

    [Fact]
    public async Task UpdateUserAsync_PromoteToLead_DemotesCurrentLead()
    {
        // Arrange
        var currentLead = MakeLead("Alice");
        var member      = MakeMember("Bob");
        var repo        = MockRepo();
        repo.Setup(r => r.GetByIdAsync(member.Id)).ReturnsAsync(member);
        repo.Setup(r => r.GetAllIncludingInactiveAsync())
            .ReturnsAsync(new List<User> { currentLead, member });
        repo.Setup(r => r.SaveChangesAsync()).Returns(Task.CompletedTask);
        var svc = new UserService(repo.Object);

        // Act
        var result = await svc.UpdateUserAsync(member.Id,
            new UpdateUserRequest(null, UserRole.TeamLead, null));

        // Assert — Bob promoted, Alice demoted
        result.Role.Should().Be(UserRole.TeamLead);
        currentLead.Role.Should().Be(UserRole.TeamMember);
    }

    [Fact]
    public async Task UpdateUserAsync_DirectlyDemotingLead_ThrowsBusinessRuleException()
    {
        // Arrange — cannot directly set a TeamLead's role to TeamMember
        var lead = MakeLead("Alice");
        var repo = MockRepo();
        repo.Setup(r => r.GetByIdAsync(lead.Id)).ReturnsAsync(lead);
        var svc = new UserService(repo.Object);

        // Act & Assert
        await svc.Invoking(s => s.UpdateUserAsync(lead.Id,
                new UpdateUserRequest(null, UserRole.TeamMember, null)))
            .Should().ThrowAsync<BusinessRuleException>()
            .WithMessage("*Cannot remove the Team Lead role directly*");
    }

    [Fact]
    public async Task UpdateUserAsync_EmptyName_ThrowsBusinessRuleException()
    {
        // Arrange
        var user = MakeMember();
        var repo = MockRepo();
        repo.Setup(r => r.GetByIdAsync(user.Id)).ReturnsAsync(user);
        var svc = new UserService(repo.Object);

        // Act & Assert
        await svc.Invoking(s => s.UpdateUserAsync(user.Id,
                new UpdateUserRequest("  ", null, null)))
            .Should().ThrowAsync<BusinessRuleException>()
            .WithMessage("*cannot be empty*");
    }

    [Fact]
    public async Task UpdateUserAsync_UserNotFound_ThrowsNotFoundException()
    {
        // Arrange
        var id   = Guid.NewGuid();
        var repo = MockRepo();
        repo.Setup(r => r.GetByIdAsync(id)).ReturnsAsync((User?)null);
        var svc = new UserService(repo.Object);

        // Act & Assert
        await svc.Invoking(s => s.UpdateUserAsync(id, new UpdateUserRequest(null, null, null)))
            .Should().ThrowAsync<NotFoundException>();
    }

    [Fact]
    public async Task UpdateUserAsync_SetIsActiveFalse_DeactivatesUser()
    {
        // Arrange
        var user = MakeMember();
        var repo = MockRepo();
        repo.Setup(r => r.GetByIdAsync(user.Id)).ReturnsAsync(user);
        repo.Setup(r => r.SaveChangesAsync()).Returns(Task.CompletedTask);
        var svc = new UserService(repo.Object);

        // Act
        var result = await svc.UpdateUserAsync(user.Id, new UpdateUserRequest(null, null, false));

        // Assert
        result.IsActive.Should().BeFalse();
    }

    // ── DeleteUserAsync ───────────────────────────────────────────────────────

    [Fact]
    public async Task DeleteUserAsync_Member_DeletesSuccessfully()
    {
        // Arrange
        var member = MakeMember();
        var repo   = MockRepo();
        repo.Setup(r => r.GetByIdAsync(member.Id)).ReturnsAsync(member);
        repo.Setup(r => r.Remove(member));
        repo.Setup(r => r.SaveChangesAsync()).Returns(Task.CompletedTask);
        var svc = new UserService(repo.Object);

        // Act
        await svc.Invoking(s => s.DeleteUserAsync(member.Id))
            .Should().NotThrowAsync();

        // Assert — Remove was invoked
        repo.Verify(r => r.Remove(member), Times.Once);
    }

    [Fact]
    public async Task DeleteUserAsync_SoleLead_CanBeDeleted()
    {
        // Arrange — only one user in the system; OK to delete them
        var lead = MakeLead();
        var repo = MockRepo();
        repo.Setup(r => r.GetByIdAsync(lead.Id)).ReturnsAsync(lead);
        repo.Setup(r => r.GetAllIncludingInactiveAsync())
            .ReturnsAsync(new List<User> { lead }); // only one
        repo.Setup(r => r.Remove(lead));
        repo.Setup(r => r.SaveChangesAsync()).Returns(Task.CompletedTask);
        var svc = new UserService(repo.Object);

        // Act & Assert — must not throw
        await svc.Invoking(s => s.DeleteUserAsync(lead.Id))
            .Should().NotThrowAsync();
    }

    [Fact]
    public async Task DeleteUserAsync_LeadWithOtherUsers_ThrowsBusinessRuleException()
    {
        // Arrange — cannot delete the lead while other users exist (no one would be lead)
        var lead  = MakeLead();
        var other = MakeMember();
        var repo  = MockRepo();
        repo.Setup(r => r.GetByIdAsync(lead.Id)).ReturnsAsync(lead);
        repo.Setup(r => r.GetAllIncludingInactiveAsync())
            .ReturnsAsync(new List<User> { lead, other });
        var svc = new UserService(repo.Object);

        // Act & Assert
        await svc.Invoking(s => s.DeleteUserAsync(lead.Id))
            .Should().ThrowAsync<BusinessRuleException>()
            .WithMessage("*Cannot remove the Team Lead*");
    }

    [Fact]
    public async Task DeleteUserAsync_UserNotFound_ThrowsNotFoundException()
    {
        // Arrange
        var id   = Guid.NewGuid();
        var repo = MockRepo();
        repo.Setup(r => r.GetByIdAsync(id)).ReturnsAsync((User?)null);
        var svc = new UserService(repo.Object);

        // Act & Assert
        await svc.Invoking(s => s.DeleteUserAsync(id))
            .Should().ThrowAsync<NotFoundException>();
    }
}
