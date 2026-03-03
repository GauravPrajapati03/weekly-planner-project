using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using WeeklyPlanner.Infrastructure.Data;

namespace WeeklyPlanner.Infrastructure.Data;

/// <summary>
/// Provides a design-time DbContext instance for EF Core tools (migrations, scaffolding).
/// This is needed because the API startup is not run during migrations — only this factory is used.
/// </summary>
public class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();

        // Use LocalDB for design-time / local development migrations.
        // The actual production connection string is injected via environment / appsettings at runtime.
        optionsBuilder.UseSqlServer(
            "Server=(localdb)\\mssqllocaldb;Database=WeeklyPlannerDB_Design;Trusted_Connection=True;");

        return new AppDbContext(optionsBuilder.Options);
    }
}
