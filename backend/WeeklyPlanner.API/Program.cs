using Microsoft.EntityFrameworkCore;
using WeeklyPlanner.Application.Interfaces;
using WeeklyPlanner.Application.Services;
using WeeklyPlanner.Infrastructure.Data;
using WeeklyPlanner.Infrastructure.Repositories;
using WeeklyPlanner.Infrastructure.Services;


var builder = WebApplication.CreateBuilder(args);

// ── MVC / API ──────────────────────────────────────────────────────────────
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // Serialize enums as strings (e.g., "Client" not 1) for readability
        options.JsonSerializerOptions.Converters.Add(
            new System.Text.Json.Serialization.JsonStringEnumConverter());
    });

// ── Swagger / OpenAPI ──────────────────────────────────────────────────────
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new()
    {
        Title = "Weekly Plan Tracker API",
        Version = "v1",
        Description = "REST API for the Weekly Plan Tracker — managing team planning cycles."
    });
});

// ── Database (Entity Framework Core / Azure SQL) ───────────────────────────
// Azure SQL Serverless auto-pauses after inactivity and can take ~60s to resume.
// Retry 10× with up to 30s delay. Error 40613 = "database paused / not available".
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        sqlOptions => sqlOptions.EnableRetryOnFailure(
            maxRetryCount: 10,
            maxRetryDelay: TimeSpan.FromSeconds(30),
            errorNumbersToAdd: new[] { 40613, 40197, 40501, 49918 })));

// ── CORS ───────────────────────────────────────────────────────────────────
// Allow Angular dev server (port 4200) and the deployed Azure Static Web App URL.
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngular", policy =>
        policy
            .WithOrigins(
                "http://localhost:4200",
                builder.Configuration["AllowedOrigins"] ?? "")
            .AllowAnyHeader()
            .AllowAnyMethod());
});

// ── Dependency Injection — Repositories ───────────────────────────────────
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IBacklogItemRepository, BacklogItemRepository>();
builder.Services.AddScoped<IWeeklyPlanRepository, WeeklyPlanRepository>();
builder.Services.AddScoped<IWeeklyPlanTaskRepository, WeeklyPlanTaskRepository>();

// ── Dependency Injection — Application Services ───────────────────────────
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IBacklogService, BacklogService>();
builder.Services.AddScoped<IWeeklyPlanService, WeeklyPlanService>();
builder.Services.AddScoped<IDashboardService, DashboardService>();
builder.Services.AddScoped<IAdminService, AdminService>();

// ── Global Exception Handling ─────────────────────────────────────────────
builder.Services.AddTransient<WeeklyPlanner.API.Middleware.GlobalExceptionHandler>();

// ──────────────────────────────────────────────────────────────────────────
var app = builder.Build();

// Auto-apply pending migrations on startup (safe for development & Azure deploy)
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    try
    {
        if (await db.Database.CanConnectAsync())
        {
            var pending = await db.Database.GetPendingMigrationsAsync();
            if (pending.Any())
            {
                Console.WriteLine($"📦 Applying {pending.Count()} pending migration(s)...");
                await db.Database.MigrateAsync();
                Console.WriteLine("✅ Migrations applied successfully.");
            }
            else
            {
                Console.WriteLine("✅ Database is up-to-date.");
            }
        }
        else
        {
            Console.WriteLine("📝 Creating database and applying migrations...");
            await db.Database.MigrateAsync();
            Console.WriteLine("✅ Database created and migrations applied.");
        }
    }
    catch (Exception ex)
    {
        // Unwrap AggregateException from EnableRetryOnFailure to check for duplicates
        var sqlEx = ex as Microsoft.Data.SqlClient.SqlException
                 ?? ex.InnerException as Microsoft.Data.SqlClient.SqlException
                 ?? (ex as AggregateException)?.InnerExceptions
                    .OfType<Microsoft.Data.SqlClient.SqlException>().FirstOrDefault();

        if (sqlEx?.Number == 2714)
            Console.WriteLine("✅ Schema already exists in Azure SQL \u2014 DB is up-to-date.");
        else
            Console.WriteLine($"\u26a0\ufe0f  DB init warning: {ex.GetType().Name}: {ex.Message.Split('\n')[0]}");
    }
}

// ── Middleware Pipeline ────────────────────────────────────────────────────
// Global exception handler MUST be first in pipeline to catch all exceptions
app.UseMiddleware<WeeklyPlanner.API.Middleware.GlobalExceptionHandler>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "Weekly Plan Tracker API v1"));
}

// Enable Swagger in production too (for assignment evaluation purposes)
if (!app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "Weekly Plan Tracker API v1"));
}

app.UseCors("AllowAngular");
// UseHttpsRedirection removed for local dev (no HTTPS cert configured for LocalDB profile)
app.MapControllers();

app.MapGet("/health", () => "Weekly Plan Tracker API is running 🚀");

app.Run();

// Required for xUnit integration testing with WebApplicationFactory
public partial class Program { }