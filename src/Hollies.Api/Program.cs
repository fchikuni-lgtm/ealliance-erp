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

// DB schema init as background task — app starts immediately, DB init happens in background
_ = Task.Run(async () =>
{
    await Task.Delay(5000); // Give app 5s to start accepting requests first
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<ApplicationDbContext>>();
    for (int attempt = 1; attempt <= 15; attempt++)
    {
        try
        {
            await db.Database.EnsureCreatedAsync();
            logger.LogInformation("Database schema ready (attempt {Attempt})", attempt);

            // Register Hangfire jobs after DB is confirmed ready
            try
            {
                using var jobScope = app.Services.CreateScope();
                var jobManager = jobScope.ServiceProvider.GetRequiredService<IRecurringJobManager>();
                jobManager.AddOrUpdate("daily-digest",
                    () => Console.WriteLine($"[{DateTime.UtcNow}] Daily digest"), "0 6 * * *");
                jobManager.AddOrUpdate("payroll-reminder",
                    () => Console.WriteLine($"[{DateTime.UtcNow}] Payroll reminder"), "0 7 1 * *");
                logger.LogInformation("Hangfire jobs registered");
            }
            catch (Exception ex) { logger.LogWarning("Hangfire jobs skipped: {Msg}", ex.Message); }

            break;
        }
        catch (Exception ex) when (attempt < 15)
        {
            logger.LogWarning("DB not ready (attempt {Attempt}/15): {Msg} — retrying in 8s", attempt, ex.Message);
            await Task.Delay(8000);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "DB init failed after 15 attempts");
        }
    }
});

app.Run();
