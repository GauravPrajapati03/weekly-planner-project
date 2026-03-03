using WeeklyPlanner.Application.DTOs;

namespace WeeklyPlanner.Application.Interfaces;

/// <summary>
/// Admin operations for data management: export, import, seed, and reset.
/// These are utility operations primarily for development and demonstration purposes.
/// </summary>
public interface IAdminService
{
    /// <summary>Exports all application data (users, backlog, plans, tasks) as a JSON-serializable DTO.</summary>
    Task<AppExportDto> ExportDataAsync();

    /// <summary>
    /// Replaces all application data with the provided import payload.
    /// Clears all existing data first, then inserts imported records in dependency order.
    /// </summary>
    Task ImportDataAsync(AppExportDto data);

    /// <summary>
    /// Seeds the database with realistic sample data matching the demo application.
    /// Clears existing data first. Safe to call multiple times.
    /// </summary>
    Task SeedSampleDataAsync();

    /// <summary>
    /// Permanently deletes ALL data from all tables (tasks → plans → backlog → users).
    /// After this call the app will redirect to onboarding.
    /// </summary>
    Task ResetAllDataAsync();
}
