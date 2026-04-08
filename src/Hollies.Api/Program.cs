using Hangfire;
using Hollies.Application;
using Hollies.Infrastructure;
using Hollies.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Serilog;
using System.Text;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);

Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .CreateLogger();
builder.Host.UseSerilog();

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddControllers();
builder.Services.AddHttpContextAccessor();

var jwtKey = builder.Configuration["Jwt:Secret"]
    ?? throw new Exception("Jwt:Secret not configured.");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opts => opts.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true, ValidateAudience = true,
        ValidateLifetime = true, ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
    });

builder.Services.AddAuthorization();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "eAlliance API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme { Description = "JWT Bearer token", Name = "Authorization", In = ParameterLocation.Header, Type = SecuritySchemeType.ApiKey, Scheme = "Bearer" });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement { [new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" } }] = [] });
});
builder.Services.AddCors(opts => opts.AddPolicy("AllowAll", p => p.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader()));

var app = builder.Build();

app.UseSerilogRequestLogging();
app.UseStaticFiles();
app.UseSwagger();
app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "eAlliance API v1"));
app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();
app.UseMiddleware<Hollies.Api.Middleware.ExceptionMiddleware>();
app.MapControllers();
app.MapHangfireDashboard("/jobs");

// Health check — used by Railway for zero-downtime deploys
app.MapGet("/health", () => Results.Ok(new { status = "healthy", timestamp = DateTime.UtcNow }));

// Redirect root to setup page if no users exist, otherwise to swagger
app.MapGet("/", async (ApplicationDbContext db) =>
{
    try
    {
        var hasUsers = await db.Users.AnyAsync();
        return hasUsers ? Results.Redirect("/swagger") : Results.Redirect("/setup.html");
    }
    catch
    {
        return Results.Redirect("/setup.html");
    }
});

// DB schema init with retry — waits up to 60s for PostgreSQL to be ready
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    var maxRetries = 10;
    for (int attempt = 1; attempt <= maxRetries; attempt++)
    {
        try
        {
            await db.Database.EnsureCreatedAsync();
            logger.LogInformation("Database schema ready (attempt {Attempt})", attempt);
            break;
        }
        catch (Exception ex) when (attempt < maxRetries)
        {
            logger.LogWarning("DB not ready (attempt {Attempt}/{Max}): {Msg} — retrying in 6s…",
                attempt, maxRetries, ex.Message);
            await Task.Delay(6000);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database init failed after {Max} attempts — starting anyway", maxRetries);
        }
    }
}

// Register Hangfire recurring jobs (wrapped — Hangfire storage may not be ready immediately)
try
{
    using var scope = app.Services.CreateScope();
    var jobManager = scope.ServiceProvider.GetRequiredService<IRecurringJobManager>();
    jobManager.AddOrUpdate("daily-digest",
        () => Console.WriteLine($"[{DateTime.UtcNow}] Daily digest job fired"), "0 6 * * *");
    jobManager.AddOrUpdate("payroll-reminder",
        () => Console.WriteLine($"[{DateTime.UtcNow}] Payroll reminder job fired"), "0 7 1 * *");
}
catch (Exception ex)
{
    Log.Warning("Hangfire job registration skipped: {Msg}", ex.Message);
}

app.Run();
