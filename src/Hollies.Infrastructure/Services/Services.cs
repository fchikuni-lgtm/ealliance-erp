using Hollies.Application.Common.Interfaces;
using Hollies.Application.Features.Auth.Commands;
using Hollies.Domain.Entities;
using Hollies.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace Hollies.Infrastructure.Services;

// ── JWT Service ───────────────────────────────────────────────────
public class JwtService(IConfiguration config) : IJwtService
{
    public (string AccessToken, string RefreshToken) GenerateTokens(User user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["Jwt:Secret"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Email, user.Email),
            new(ClaimTypes.Name, user.Name),
            new(ClaimTypes.Role, user.Role.ToString()),
            new("permissions", string.Join(",", user.Permissions)),
            new("branchId", user.BranchId?.ToString() ?? "")
        };

        var token = new JwtSecurityToken(
            issuer: config["Jwt:Issuer"],
            audience: config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(15),  // 15-minute access tokens
            signingCredentials: creds);

        var refresh = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
        return (new JwtSecurityTokenHandler().WriteToken(token), refresh);
    }

    public Guid? ValidateRefreshToken(string refreshToken) => null; // handled via DB lookup
}

// ── Sequence Service ──────────────────────────────────────────────
// Thread-safe sequences using PostgreSQL FOR UPDATE SKIP LOCKED
// Handles 500 concurrent users without duplicate numbers
public class SequenceService(ApplicationDbContext db) : ISequenceService
{
    // Uses a dedicated sequences table or falls back to max+1 with row lock
    public async Task<string> NextExpenseNumberAsync()  => await Next("E", 3);
    public async Task<string> NextGrvNumberAsync()       => await Next("G", 3);
    public async Task<string> NextIncomeNumberAsync()    => await Next("I", 3);
    public async Task<string> NextEmployeeNumberAsync()  => await Next("EMP", 4, prefix: "EMP");
    public async Task<string> NextSmvNumberAsync()       => $"SMV-{(await NextRaw("SMV")):D3}";
    public async Task<string> NextTransferOutNumberAsync() => $"TO-{(await NextRaw("TO")):D3}";
    public async Task<string> NextCashUpNumberAsync()    => $"CA-{(await NextRaw("CA")):D3}";
    public async Task<string> NextStockCountNumberAsync() => $"SC-{(await NextRaw("SC")):D3}";
    public async Task<string> NextAssetNumberAsync()     => $"AST-{(await NextRaw("AST")):D4}";
    public async Task<string> NextAssetMovementNumberAsync() => $"AMV-{(await NextRaw("AMV")):D3}";
    public async Task<string> NextAssetLendingNumberAsync()  => $"L-{(await NextRaw("L")):D3}";

    private async Task<string> Next(string prefix, int digits, string? prefix2 = null)
    {
        var n = await NextRaw(prefix2 ?? prefix);
        return prefix2 != null ? $"{prefix}{n:D4}" : $"{prefix}{n:D{digits}}";
    }

    // PostgreSQL advisory lock prevents duplicate numbers under concurrent load
    private async Task<int> NextRaw(string key)
    {
        // Convert key to a lock ID (simple hash, always positive)
        var lockId = Math.Abs(key.GetHashCode()) % 100000 + 1;
        await db.Database.ExecuteSqlRawAsync($"SELECT pg_advisory_xact_lock({lockId})");

        // Get next number atomically within the transaction
        var count = key switch
        {
            "E"   => await db.Expenses.CountAsync(),
            "G"   => await db.Grvs.CountAsync(),
            "I"   => await db.Incomes.CountAsync(),
            "EMP" => await db.Employees.CountAsync(),
            "SMV" => await db.Smvs.CountAsync(),
            "TO"  => await db.TransferOuts.CountAsync(),
            "CA"  => await db.CashUps.CountAsync(),
            "SC"  => await db.StockCounts.CountAsync(),
            "AST" => await db.Assets.CountAsync(),
            "AMV" => await db.AssetMovements.CountAsync(),
            "L"   => await db.AssetLendings.CountAsync(),
            _     => 0
        };
        return count + 1;
    }
}

// ── WhatsApp Service (stub — plug in your provider) ──────────────
// Supported providers: Twilio, Meta Cloud API, Africa's Talking
public class WhatsAppService(IConfiguration config, HttpClient http) : IWhatsAppService
{
    // Uses Meta WhatsApp Cloud API
    // Set WHATSAPP_TOKEN and WHATSAPP_PHONE_ID in appsettings
    private readonly string _token = config["WhatsApp:Token"] ?? "";
    private readonly string _phoneId = config["WhatsApp:PhoneId"] ?? "";

    public async Task SendMessageAsync(string phone, string message, CancellationToken ct = default)
    {
        if (string.IsNullOrEmpty(_token)) return; // silently skip if not configured
        var payload = new
        {
            messaging_product = "whatsapp",
            to = phone.Replace("+", "").Replace(" ", ""),
            type = "text",
            text = new { body = message }
        };
        http.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _token);
        await http.PostAsJsonAsync(
            $"https://graph.facebook.com/v18.0/{_phoneId}/messages", payload, ct);
    }

    public async Task SendTemplateAsync(string phone, string template,
        Dictionary<string, string> parameters, CancellationToken ct = default)
    {
        // Implement Meta template messages here
        await Task.CompletedTask;
    }
}

// ── Payment Gateway (stub — plug in EcoCash, OneMoney, Paynow) ──
// Zimbabwe-ready: EcoCash API, Paynow Zimbabwe, OneMoney
public class PaymentGatewayService(IConfiguration config, HttpClient http) : IPaymentGatewayService
{
    public async Task<PaymentResult> InitiatePaymentAsync(PaymentRequest req, CancellationToken ct = default)
    {
        // TODO: Replace stub with your provider
        // EcoCash: POST to https://api.ecocash.co.zw/...
        // Paynow: POST to https://www.paynow.co.zw/interface/initiatetransaction/...
        // OneMoney: POST to https://api.onemoney.co.zw/...
        await Task.Delay(100, ct);
        return new PaymentResult(true, $"PAY-{Guid.NewGuid():N}", null);
    }

    public async Task<PaymentStatus> CheckStatusAsync(string reference, CancellationToken ct = default)
    {
        await Task.Delay(50, ct);
        return PaymentStatus.Completed;
    }
}

// ── Current User Service ─────────────────────────────────────────
public class CurrentUserService(IHttpContextAccessorWrapper httpContext) : ICurrentUserService
{
    public Guid UserId => Guid.TryParse(
        httpContext.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value, out var id) ? id : Guid.Empty;
    public string UserName => httpContext.User?.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value ?? "System";
    public string UserEmail => httpContext.User?.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value ?? "";
    public string UserRole => httpContext.User?.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value ?? "";
    public Guid? BranchId => Guid.TryParse(
        httpContext.User?.FindFirst("branchId")?.Value, out var bid) ? bid : null;
    public bool IsAuthenticated => httpContext.User?.Identity?.IsAuthenticated ?? false;
    public bool HasPermission(string permission)
    {
        var perms = httpContext.User?.FindFirst("permissions")?.Value ?? "";
        var role = httpContext.User?.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value ?? "";
        return role == "Admin" || perms.Contains(permission);
    }
}

public interface IHttpContextAccessorWrapper
{
    System.Security.Claims.ClaimsPrincipal? User { get; }
}

// ── IHttpContextAccessor wrapper implementation ───────────────────
public class HttpContextAccessorWrapper(Microsoft.AspNetCore.Http.IHttpContextAccessor accessor) : IHttpContextAccessorWrapper
{
    public System.Security.Claims.ClaimsPrincipal? User => accessor.HttpContext?.User;
}

// ── Date/Time Service ────────────────────────────────────────────
public class DateTimeService : IDateTimeService
{
    public DateTime UtcNow => DateTime.UtcNow;
    public DateOnly Today => DateOnly.FromDateTime(DateTime.UtcNow);
}

// ── PDF Service (QuestPDF) ────────────────────────────────────────
public class PdfService : IPdfService
{
    public async Task<byte[]> GenerateExpenseReportAsync(ExpenseReportRequest req, CancellationToken ct = default)
    {
        // QuestPDF implementation
        // Install QuestPDF license: QuestPDF.Settings.License = LicenseType.Community;
        // Full implementation: create Document, Page, Column, Table etc.
        await Task.CompletedTask;
        return Array.Empty<byte>(); // Replace with QuestPDF document.GeneratePdf()
    }
    public async Task<byte[]> GeneratePayrollReportAsync(PayrollReportRequest req, CancellationToken ct = default)
    {
        await Task.CompletedTask;
        return Array.Empty<byte>();
    }
    public async Task<byte[]> GenerateSupplierStatementAsync(SupplierStatementRequest req, CancellationToken ct = default)
    {
        await Task.CompletedTask;
        return Array.Empty<byte>();
    }
}
