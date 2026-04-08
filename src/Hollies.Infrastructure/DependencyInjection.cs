using Hangfire;
using Hangfire.PostgreSql;
using Hollies.Application.Common.Interfaces;
using Hollies.Application.Features.Auth.Commands;
using Hollies.Infrastructure.Persistence;
using Hollies.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Hollies.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration config)
    {
        // ── Database ──────────────────────────────────────────────
        var connStr = config.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("ConnectionStrings:DefaultConnection is required.");

        services.AddDbContext<ApplicationDbContext>(opts =>
            opts.UseNpgsql(connStr, o =>
            {
                o.MigrationsAssembly("Hollies.Infrastructure");
                o.CommandTimeout(60);
                o.EnableRetryOnFailure(maxRetryCount: 5, maxRetryDelay: TimeSpan.FromSeconds(10), errorCodesToAdd: null);
            }));

        services.AddScoped<IApplicationDbContext>(p => p.GetRequiredService<ApplicationDbContext>());

        // ── Services ──────────────────────────────────────────────
        services.AddScoped<IJwtService, JwtService>();
        services.AddScoped<ISequenceService, SequenceService>();
        services.AddScoped<Hollies.Infrastructure.Services.IHttpContextAccessorWrapper, Hollies.Infrastructure.Services.HttpContextAccessorWrapper>();
        services.AddScoped<ICurrentUserService, CurrentUserService>();
        services.AddScoped<IDateTimeService, DateTimeService>();
        services.AddScoped<IPdfService, PdfService>();

        // ── WhatsApp (HttpClient) ─────────────────────────────────
        services.AddHttpClient<IWhatsAppService, WhatsAppService>();

        // ── Payment Gateway ───────────────────────────────────────
        services.AddHttpClient<IPaymentGatewayService, PaymentGatewayService>();

        // ── Hangfire background jobs ──────────────────────────────
        services.AddHangfire(hf => hf
            .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
            .UseSimpleAssemblyNameTypeSerializer()
            .UseRecommendedSerializerSettings()
            .UsePostgreSqlStorage(connStr));
        services.AddHangfireServer();

        return services;
    }
}
