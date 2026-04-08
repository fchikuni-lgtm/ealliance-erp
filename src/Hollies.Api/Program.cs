using Hangfire;
using Hollies.Application;
using Hollies.Infrastructure;
using Hollies.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Console-only logging (Railway captures stdout)
builder.Logging.ClearProviders();
builder.Logging.AddConsole();

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
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Bearer token", Name = "Authorization",
        In = ParameterLocation.Header, Type = SecuritySchemeType.ApiKey, Scheme = "Bearer"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        [new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" } }] = []
    });
});
builder.Services.AddCors(opts =>
    opts.AddPolicy("AllowAll", p => p.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader()));

var app = builder.Build();

app.UseStaticFiles();
app.UseSwagger();
app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "eAlliance API v1"));
app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();
app.UseMiddleware<Hollies.Api.Middleware.ExceptionMiddleware>();
app.MapControllers();

try { app.MapHangfireDashboard("/jobs"); } catch { /* skip if hangfire not ready */ }

// Health check — always responds immediately (no DB dependency)
app.MapGet("/health", () => Results.Ok(new { status = "healthy", timestamp = DateTime.UtcNow }));

// Redirect root to setup page
app.MapGet("/", async (ApplicationDbContext db) =>
{
    try
    {
        var hasUsers = await db.Users.AnyAsync();
        return hasUsers ? Results.Redirect("/swagger") : Results.Redirect("/setup.html");
    }
    catch { return Results.Redirect("/setup.html"); }
});

// DB schema init — fail fast so Railway logs show the real error
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    var startupLogger = scope.ServiceProvider.GetRequiredService<ILogger<ApplicationDbContext>>();
    Exception? lastEx = null;
    for (int attempt = 1; attempt <= 10; attempt++)
    {
        try
        {
            var canConnect = await db.Database.CanConnectAsync();
            startupLogger.LogInformation("DB connect={CanConnect} (attempt {Attempt})", canConnect, attempt);
            await db.Database.EnsureCreatedAsync();
            startupLogger.LogInformation("DB schema ready (attempt {Attempt})", attempt);
            lastEx = null;
            break;
        }
        catch (Exception ex)
        {
            lastEx = ex;
            startupLogger.LogWarning("DB init attempt {Attempt}/10 failed: {Type}: {Msg}", attempt, ex.GetType().Name, ex.Message);
            await Task.Delay(5000);
        }
    }
    if (lastEx != null)
        startupLogger.LogError(lastEx, "DB init failed after 10 attempts — continuing");
}

// Register Hangfire recurring jobs in background (non-critical)
_ = Task.Run(async () =>
{
    await Task.Delay(3000);
    try
    {
        using var jobScope = app.Services.CreateScope();
        var jobManager = jobScope.ServiceProvider.GetRequiredService<IRecurringJobManager>();
        jobManager.AddOrUpdate("daily-digest",
            () => Console.WriteLine($"[{DateTime.UtcNow}] Daily digest"), "0 6 * * *");
        jobManager.AddOrUpdate("payroll-reminder",
            () => Console.WriteLine($"[{DateTime.UtcNow}] Payroll reminder"), "0 7 1 * *");
    }
    catch { /* non-critical */ }
});

app.Run();
