using Microsoft.AspNetCore.Mvc;
using WeeklyPlanner.Application.DTOs;
using WeeklyPlanner.Application.Interfaces;

namespace WeeklyPlanner.API.Controllers;

/// <summary>
/// Admin-level data management endpoints.
/// Provides export, import, seed, and full reset functionality.
/// These endpoints have no authentication guard — suitable for a local demo app.
/// </summary>
[ApiController]
[Route("api/admin")]
public class AdminController : ControllerBase
{
    private readonly IAdminService _admin;
    public AdminController(IAdminService admin) => _admin = admin;

    // ── GET /api/admin/export ─────────────────────────────────────────────────
    /// <summary>
    /// Exports all application data as a JSON payload.
    /// The frontend triggers a browser download from this response.
    /// </summary>
    [HttpGet("export")]
    [Produces("application/json")]
    public async Task<ActionResult<AppExportDto>> Export()
    {
        var data = await _admin.ExportDataAsync();
        return Ok(data);
    }

    // ── POST /api/admin/import ────────────────────────────────────────────────
    /// <summary>
    /// Replaces all application data with the provided JSON payload.
    /// Clears all existing data first, then inserts imported records.
    /// </summary>
    [HttpPost("import")]
    public async Task<IActionResult> Import([FromBody] AppExportDto data)
    {
        if (data is null)
            return BadRequest(new { detail = "Import payload cannot be null." });

        await _admin.ImportDataAsync(data);
        return Ok(new { message = "Data imported successfully." });
    }

    // ── POST /api/admin/seed ──────────────────────────────────────────────────
    /// <summary>
    /// Seeds the database with realistic sample data (3 team members + 8 backlog items).
    /// Clears all existing data first. Safe to call multiple times.
    /// </summary>
    [HttpPost("seed")]
    public async Task<IActionResult> Seed()
    {
        await _admin.SeedSampleDataAsync();
        return Ok(new { message = "Sample data seeded successfully." });
    }

    // ── DELETE /api/admin/reset ───────────────────────────────────────────────
    /// <summary>
    /// Permanently deletes ALL data from all tables in FK-safe order.
    /// After this call the frontend should redirect to /onboarding.
    /// </summary>
    [HttpDelete("reset")]
    public async Task<IActionResult> Reset()
    {
        await _admin.ResetAllDataAsync();
        return Ok(new { message = "All data cleared. Ready for fresh start." });
    }
}
