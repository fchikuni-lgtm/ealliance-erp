using Hangfire;
using Hollies.Application.Common.Interfaces;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Hollies.BackgroundWorkers.Workers;

// ── Startup: register recurring Hangfire jobs ─────────────────────
public class HangfireJobRegistrar(IRecurringJobManager jobs) : IHostedService
{
    public Task StartAsync(CancellationToken ct)
    {
        // Daily at 08:00 Zimbabwe time (UTC+2) — flagged expense digest
        jobs.AddOrUpdate<DailyDigestJob>("daily-digest",
            j => j.RunAsync(CancellationToken.None), "0 6 * * *");

        // 1st of every month — payroll reminder
        jobs.AddOrUpdate<PayrollReminderJob>("payroll-reminder",
            j => j.RunAsync(CancellationToken.None), "0 7 1 * *");

        return Task.CompletedTask;
    }
    public Task StopAsync(CancellationToken ct) => Task.CompletedTask;
}

// ── Daily digest: notify admins of flagged / pending > 48h ────────
public class DailyDigestJob(IServiceScopeFactory scopeFactory, ILogger<DailyDigestJob> logger)
{
    public async Task RunAsync(CancellationToken ct)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();
        var whatsApp = scope.ServiceProvider.GetRequiredService<IWhatsAppService>();

        var cutoff = DateTime.UtcNow.AddHours(-48);
        var stale = db.Expenses
            .Where(e => e.Status == Domain.Enums.ExpenseStatus.Pending && e.CreatedAt < cutoff)
            .Count();

        if (stale > 0)
        {
            logger.LogInformation("Daily digest: {Count} expenses pending > 48h", stale);
            // Send to configured admin numbers
            // await whatsApp.SendMessageAsync("+263...", $"⚠️ {stale} expenses pending approval for over 48 hours.");
        }
    }
}

// ── Monthly payroll reminder ───────────────────────────────────────
public class PayrollReminderJob(IServiceScopeFactory scopeFactory, ILogger<PayrollReminderJob> logger)
{
    public async Task RunAsync(CancellationToken ct)
    {
        logger.LogInformation("Payroll reminder fired for {Month}", DateTime.UtcNow.ToString("MMMM yyyy"));
        // await whatsApp.SendMessageAsync("+263...", "📅 Reminder: Generate payroll for this month.");
        await Task.CompletedTask;
    }
}
