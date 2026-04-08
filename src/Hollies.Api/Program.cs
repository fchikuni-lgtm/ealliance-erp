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
    .WriteTo.File("logs/hollies-.log", rollingInterval: RollingInterval.Day)
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
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Hollies API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme { Description = "JWT Bearer token", Name = "Authorization", In = ParameterLocation.Header, Type = SecuritySchemeType.ApiKey, Scheme = "Bearer" });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement { [new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" } }] = [] });
});
builder.Services.AddCors(opts => opts.AddPolicy("AllowAll", p => p.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader()));

var app = builder.Build();

app.UseSerilogRequestLogging();
app.UseStaticFiles();
app.UseSwagger();
app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "Hollies API v1"));
app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();
app.UseMiddleware<Hollies.Api.Middleware.ExceptionMiddleware>();
app.MapControllers();
app.MapHangfireDashboard("/jobs");

// Health check — used by Railway for zero-downtime deploys
app.MapGet("/health", () => Results.Ok(new { status = "healthy", timestamp = DateTime.UtcNow }));

// Redirect root to setup page if no users exist, otherwise to app
app.MapGet("/", async (ApplicationDbContext db) =>
{
    var hasUsers = await db.Users.AnyAsync();
    return hasUsers ? Results.Redirect("/api") : Results.Redirect("/setup.html");
});

// Auto-create schema on startup
// Uses EnsureCreated when no migrations exist, MigrateAsync when they do
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    try
    {
        var pending = db.Database.GetPendingMigrations();
        if (pending.Any())
            await db.Database.MigrateAsync();
        else
            await db.Database.EnsureCreatedAsync();
    }
    catch
    {
        // Fallback: just ensure schema exists
        await db.Database.EnsureCreatedAsync();
    }
}

// Register recurring Hangfire jobs
using (var scope = app.Services.CreateScope())
{
    var jobManager = scope.ServiceProvider.GetRequiredService<IRecurringJobManager>();
    // Daily at 08:00 Zimbabwe time (UTC+2) — flagged expense digest
    jobManager.AddOrUpdate("daily-digest",
        () => Console.WriteLine($"[{DateTime.UtcNow}] Daily digest job fired"), "0 6 * * *");
    // 1st of every month — payroll reminder
    jobManager.AddOrUpdate("payroll-reminder",
        () => Console.WriteLine($"[{DateTime.UtcNow}] Payroll reminder job fired"), "0 7 1 * *");
}

app.Run();
