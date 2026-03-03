using Microsoft.EntityFrameworkCore;
using WeeklyPlanner.Domain.Entities;

namespace WeeklyPlanner.Infrastructure.Data;

/// <summary>
/// Entity Framework Core database context for the Weekly Planner application.
/// All entity configurations are applied from the assembly via the Fluent API
/// in separate IEntityTypeConfiguration classes for separation of concerns.
/// </summary>
public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<BacklogItem> BacklogItems => Set<BacklogItem>();
    public DbSet<WeeklyPlan> WeeklyPlans => Set<WeeklyPlan>();
    public DbSet<WeeklyPlanTask> WeeklyPlanTasks => Set<WeeklyPlanTask>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Apply all entity type configurations from this assembly automatically.
        // This keeps the DbContext clean and delegates config to dedicated classes.
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}
