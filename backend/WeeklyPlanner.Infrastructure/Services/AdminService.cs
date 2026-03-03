using Microsoft.EntityFrameworkCore;
using WeeklyPlanner.Application.DTOs;
using WeeklyPlanner.Application.Interfaces;
using WeeklyPlanner.Domain.Entities;
using WeeklyPlanner.Domain.Enums;
using WeeklyPlanner.Infrastructure.Data;

namespace WeeklyPlanner.Infrastructure.Services;

/// <summary>
/// Implements full-database admin operations: export, import (restore), seed with demo data, and factory reset.
/// Lives in the Infrastructure layer because it needs direct AppDbContext access (same pattern as Repositories).
/// All mutations clear tables in the correct FK dependency order: Tasks → Plans → Backlog → Users.
/// </summary>
public class AdminService : IAdminService
{
    private readonly AppDbContext _db;
    public AdminService(AppDbContext db) => _db = db;

    // ── Export ───────────────────────────────────────────────────────────────

    public async Task<AppExportDto> ExportDataAsync()
    {
        var users   = await _db.Users.AsNoTracking().ToListAsync();
        var backlog = await _db.BacklogItems.AsNoTracking().ToListAsync();
        var plans   = await _db.WeeklyPlans.AsNoTracking().ToListAsync();
        var tasks   = await _db.WeeklyPlanTasks.AsNoTracking().ToListAsync();

        return new AppExportDto(
            users.Select(u => new AppExportUserDto(u.Id, u.Name, u.Role, u.IsActive)),
            backlog.Select(b => new AppExportBacklogDto(b.Id, b.Title, b.Description, b.Category, b.IsActive, b.EstimatedHours)),
            plans.Select(p => new AppExportPlanDto(p.Id, p.WeekStartDate, p.WeekEndDate,
                p.ClientPercent, p.TechDebtPercent, p.RDPercent,
                p.Status, p.CreatedAt, p.FrozenAt, p.CompletedAt)),
            tasks.Select(t => new AppExportTaskDto(t.Id, t.WeeklyPlanId, t.BacklogItemId,
                t.AssignedUserId, t.PlannedHours, t.CompletedHours, t.Status)),
            DateTime.UtcNow
        );
    }

    // ── Import ───────────────────────────────────────────────────────────────

    public async Task ImportDataAsync(AppExportDto data)
    {
        await ClearAllTablesAsync();

        // Insert in FK dependency order: Users → Backlog → Plans → Tasks
        if (data.Users.Any())
        {
            await _db.Users.AddRangeAsync(data.Users.Select(u => new User
                { Id = u.Id, Name = u.Name, Role = u.Role, IsActive = u.IsActive }));
            await _db.SaveChangesAsync();
        }

        if (data.BacklogItems.Any())
        {
            await _db.BacklogItems.AddRangeAsync(data.BacklogItems.Select(b => new BacklogItem
                { Id = b.Id, Title = b.Title, Description = b.Description,
                  Category = b.Category, IsActive = b.IsActive, EstimatedHours = b.EstimatedHours }));
            await _db.SaveChangesAsync();
        }

        if (data.WeeklyPlans.Any())
        {
            await _db.WeeklyPlans.AddRangeAsync(data.WeeklyPlans.Select(p => new WeeklyPlan
                { Id = p.Id, WeekStartDate = p.WeekStartDate, WeekEndDate = p.WeekEndDate,
                  ClientPercent = p.ClientPercent, TechDebtPercent = p.TechDebtPercent, RDPercent = p.RDPercent,
                  Status = p.Status, CreatedAt = p.CreatedAt, FrozenAt = p.FrozenAt, CompletedAt = p.CompletedAt }));
            await _db.SaveChangesAsync();
        }

        if (data.WeeklyPlanTasks.Any())
        {
            await _db.WeeklyPlanTasks.AddRangeAsync(data.WeeklyPlanTasks.Select(t => new WeeklyPlanTask
                { Id = t.Id, WeeklyPlanId = t.WeeklyPlanId, BacklogItemId = t.BacklogItemId,
                  AssignedUserId = t.AssignedUserId, PlannedHours = t.PlannedHours,
                  CompletedHours = t.CompletedHours, Status = t.Status }));
            await _db.SaveChangesAsync();
        }
    }

    // ── Seed Sample Data ─────────────────────────────────────────────────────

    public async Task SeedSampleDataAsync()
    {
        await ClearAllTablesAsync();

        // ── Users ──────────────────────────────────────────────────────────
        var alice = new User { Name = "Alice Chen",   Role = UserRole.TeamLead,   IsActive = true };
        var bob   = new User { Name = "Bob Martinez", Role = UserRole.TeamMember, IsActive = true };
        var carol = new User { Name = "Carol Davis",  Role = UserRole.TeamMember, IsActive = true };

        await _db.Users.AddRangeAsync(alice, bob, carol);
        await _db.SaveChangesAsync();

        // ── Backlog Items (matching demo app) ──────────────────────────────
        var items = new[]
        {
            new BacklogItem { Title = "Customer onboarding redesign",    Description = "Revamp the onboarding flow for new customers.",          Category = CategoryType.Client,   IsActive = true, EstimatedHours = 12 },
            new BacklogItem { Title = "Fix billing invoice formatting",  Description = "Correct the invoice PDF layout for enterprise clients.", Category = CategoryType.Client,   IsActive = true, EstimatedHours = 4  },
            new BacklogItem { Title = "Customer feedback dashboard",     Description = "Build a dashboard to visualise customer feedback data.", Category = CategoryType.Client,   IsActive = true, EstimatedHours = 16 },
            new BacklogItem { Title = "Migrate database to PostgreSQL",  Description = "Move from MySQL to PostgreSQL for better scalability.",  Category = CategoryType.TechDebt, IsActive = true, EstimatedHours = 20 },
            new BacklogItem { Title = "Remove deprecated API endpoints", Description = "Clean up v1 API endpoints no longer in use.",            Category = CategoryType.TechDebt, IsActive = true, EstimatedHours = 8  },
            new BacklogItem { Title = "Upgrade to .NET 9",              Description = "Upgrade backend runtime to .NET 9 LTS.",                  Category = CategoryType.TechDebt, IsActive = true, EstimatedHours = 10 },
            new BacklogItem { Title = "AI-powered task prioritisation",  Description = "Research using LLMs to auto-sort the backlog.",          Category = CategoryType.RnD,      IsActive = true, EstimatedHours = 24 },
            new BacklogItem { Title = "Explore AI summarisation",        Description = "POC for meeting summary generation via AI.",              Category = CategoryType.RnD,      IsActive = true, EstimatedHours = 8  },
        };

        await _db.BacklogItems.AddRangeAsync(items);
        await _db.SaveChangesAsync();
    }

    // ── Reset All Data ────────────────────────────────────────────────────────

    public async Task ResetAllDataAsync() => await ClearAllTablesAsync();

    // ── Private Helpers ───────────────────────────────────────────────────────

    /// <summary>
    /// Deletes all rows from all tables in reverse FK dependency order.
    /// Tasks must go first (FK → Plans + Users + BacklogItems).
    /// </summary>
    private async Task ClearAllTablesAsync()
    {
        _db.WeeklyPlanTasks.RemoveRange(_db.WeeklyPlanTasks);
        await _db.SaveChangesAsync();

        _db.WeeklyPlans.RemoveRange(_db.WeeklyPlans);
        await _db.SaveChangesAsync();

        _db.BacklogItems.RemoveRange(_db.BacklogItems);
        await _db.SaveChangesAsync();

        _db.Users.RemoveRange(_db.Users);
        await _db.SaveChangesAsync();
    }
}
