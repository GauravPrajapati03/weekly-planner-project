var builder = WebApplication.CreateBuilder(args);

var app = builder.Build();

app.UseHttpsRedirection();

// Test endpoints
app.MapGet("/hello", () => "Hello World from Weekly Planner API!");
app.MapGet("/health", () => Results.Ok("API is running"));

app.Run();