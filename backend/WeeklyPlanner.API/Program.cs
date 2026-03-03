using Microsoft.EntityFrameworkCore;
using WeeklyPlanner.Application.Interfaces;
using WeeklyPlanner.Application.Services;
using WeeklyPlanner.Infrastructure.Data;
using WeeklyPlanner.Infrastructure.Repositories;

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
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection")));
// Note: EnableRetryOnFailure is NOT used for LocalDB — it causes multiple simultaneous
// connections which LocalDB (single-user) cannot handle. Re-add for Azure SQL production.

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

// ── Global Exception Handling ─────────────────────────────────────────────
builder.Services.AddTransient<WeeklyPlanner.API.Middleware.GlobalExceptionHandler>();

// ──────────────────────────────────────────────────────────────────────────
var app = builder.Build();

// Auto-apply pending migrations on startup (safe for development & Azure deploy)
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
}

// ── Middleware Pipeline ────────────────────────────────────────────────────
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

app.Run();

// Required for xUnit integration testing with WebApplicationFactory
public partial class Program { }