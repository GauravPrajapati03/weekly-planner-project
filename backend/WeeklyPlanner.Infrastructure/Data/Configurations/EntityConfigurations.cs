using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using WeeklyPlanner.Domain.Entities;
using WeeklyPlanner.Domain.Enums;

namespace WeeklyPlanner.Infrastructure.Data.Configurations;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.HasKey(u => u.Id);
        builder.Property(u => u.Name).IsRequired().HasMaxLength(100);
        builder.Property(u => u.Role).HasConversion<string>().IsRequired();
        builder.Property(u => u.IsActive).HasDefaultValue(true);

        // Index on Name for fast lookup during login
        builder.HasIndex(u => u.Name);
    }
}

public class BacklogItemConfiguration : IEntityTypeConfiguration<BacklogItem>
{
    public void Configure(EntityTypeBuilder<BacklogItem> builder)
    {
        builder.HasKey(b => b.Id);
        builder.Property(b => b.Title).IsRequired().HasMaxLength(200);
        builder.Property(b => b.Description).HasMaxLength(2000);
        builder.Property(b => b.Category).HasConversion<string>().IsRequired();
        builder.Property(b => b.IsActive).HasDefaultValue(true);
    }
}

public class WeeklyPlanConfiguration : IEntityTypeConfiguration<WeeklyPlan>
{
    public void Configure(EntityTypeBuilder<WeeklyPlan> builder)
    {
        builder.HasKey(p => p.Id);
        builder.Property(p => p.WeekStartDate).IsRequired();
        builder.Property(p => p.WeekEndDate).IsRequired();

        // Store percentages with 2 decimal precision (e.g., 33.33)
        builder.Property(p => p.ClientPercent).HasPrecision(5, 2);
        builder.Property(p => p.TechDebtPercent).HasPrecision(5, 2);
        builder.Property(p => p.RDPercent).HasPrecision(5, 2);

        builder.Property(p => p.Status).HasConversion<string>().IsRequired();
        builder.Property(p => p.CreatedAt).IsRequired();
    }
}

public class WeeklyPlanTaskConfiguration : IEntityTypeConfiguration<WeeklyPlanTask>
{
    public void Configure(EntityTypeBuilder<WeeklyPlanTask> builder)
    {
        builder.HasKey(t => t.Id);

        // Store hours with 2 decimal precision (e.g., 7.50)
        builder.Property(t => t.PlannedHours).HasPrecision(5, 2);
        builder.Property(t => t.CompletedHours).HasPrecision(5, 2).HasDefaultValue(0);

        // FK relationships
        builder.HasOne(t => t.WeeklyPlan)
            .WithMany(p => p.Tasks)
            .HasForeignKey(t => t.WeeklyPlanId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(t => t.BacklogItem)
            .WithMany(b => b.PlanTasks)
            .HasForeignKey(t => t.BacklogItemId)
            .OnDelete(DeleteBehavior.Restrict); // Prevent accidental deletion of backlog items in use

        builder.HasOne(t => t.AssignedUser)
            .WithMany(u => u.Tasks)
            .HasForeignKey(t => t.AssignedUserId)
            .OnDelete(DeleteBehavior.Restrict);

        // Composite index for fast per-user, per-plan lookups
        builder.HasIndex(t => new { t.WeeklyPlanId, t.AssignedUserId });
    }
}
