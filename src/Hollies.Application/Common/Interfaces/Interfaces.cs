using Hollies.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Hollies.Application.Common.Interfaces;

// ── Database context ─────────────────────────────────────────────
public interface IApplicationDbContext
{
    // Hollies core modules
    DbSet<User> Users { get; }
    DbSet<Branch> Branches { get; }
    DbSet<Region> Regions { get; }
    DbSet<Category> Categories { get; }
    DbSet<PaymentMethod> PaymentMethods { get; }
    DbSet<Product> Products { get; }
    DbSet<ProductNameHistory> ProductNameHistory { get; }
    DbSet<Workman> Workmen { get; }
    DbSet<Supplier> Suppliers { get; }
    DbSet<Expense> Expenses { get; }
    DbSet<ExpenseHistory> ExpenseHistory { get; }
    DbSet<Grv> Grvs { get; }
    DbSet<GrvProduct> GrvProducts { get; }
    DbSet<GrvHistory> GrvHistory { get; }
    DbSet<Income> Incomes { get; }
    DbSet<Employee> Employees { get; }
    DbSet<Attendance> Attendance { get; }
    DbSet<PayrollEntry> PayrollEntries { get; }
    DbSet<AuditLog> AuditLogs { get; }

    // eAlliance StockMaster modules
    DbSet<RevenuePoint> RevenuePoints { get; }
    DbSet<CurrencyRate> CurrencyRates { get; }
    DbSet<StockCount> StockCounts { get; }
    DbSet<StockCountItem> StockCountItems { get; }
    DbSet<Smv> Smvs { get; }
    DbSet<SmvItem> SmvItems { get; }
    DbSet<TransferOut> TransferOuts { get; }
    DbSet<TransferOutItem> TransferOutItems { get; }
    DbSet<CashUp> CashUps { get; }
    DbSet<CashUpEntry> CashUpEntries { get; }
    DbSet<StockAdjustment> StockAdjustments { get; }
    DbSet<Debtor> Debtors { get; }
    DbSet<DebtorTransaction> DebtorTransactions { get; }
    DbSet<ClosedDay> ClosedDays { get; }

    // Asset Register
    DbSet<AssetLocation> AssetLocations { get; }
    DbSet<Asset> Assets { get; }
    DbSet<AssetMovement> AssetMovements { get; }
    DbSet<AssetLending> AssetLendings { get; }
    DbSet<AssetDamage> AssetDamages { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}

// ── Current user ─────────────────────────────────────────────────
public interface ICurrentUserService
{
    Guid UserId { get; }
    string UserName { get; }
    string UserEmail { get; }
    string UserRole { get; }
    Guid? BranchId { get; }
    bool IsAuthenticated { get; }
    bool HasPermission(string permission);
}

// ── Sequence generator (E001, G001, I001, SMV-001…) ─────────────
// Uses PostgreSQL advisory locks for concurrency safety under 500 users
public interface ISequenceService
{
    Task<string> NextExpenseNumberAsync();
    Task<string> NextGrvNumberAsync();
    Task<string> NextIncomeNumberAsync();
    Task<string> NextEmployeeNumberAsync();
    Task<string> NextSmvNumberAsync();
    Task<string> NextTransferOutNumberAsync();
    Task<string> NextCashUpNumberAsync();
    Task<string> NextStockCountNumberAsync();
    Task<string> NextAssetNumberAsync();
    Task<string> NextAssetMovementNumberAsync();
    Task<string> NextAssetLendingNumberAsync();
}

// ── WhatsApp notifications ───────────────────────────────────────
public interface IWhatsAppService
{
    Task SendMessageAsync(string phoneNumber, string message, CancellationToken ct = default);
    Task SendTemplateAsync(string phoneNumber, string templateName, Dictionary<string, string> parameters, CancellationToken ct = default);
}

// ── Payment gateway ──────────────────────────────────────────────
public interface IPaymentGatewayService
{
    Task<PaymentResult> InitiatePaymentAsync(PaymentRequest request, CancellationToken ct = default);
    Task<PaymentStatus> CheckStatusAsync(string paymentReference, CancellationToken ct = default);
}

public record PaymentRequest(string Reference, decimal Amount, string Currency, string Description, string PhoneNumber);
public record PaymentResult(bool Success, string Reference, string? ErrorMessage);
public enum PaymentStatus { Pending, Completed, Failed, Cancelled }

// ── PDF generation ───────────────────────────────────────────────
public interface IPdfService
{
    Task<byte[]> GenerateExpenseReportAsync(ExpenseReportRequest request, CancellationToken ct = default);
    Task<byte[]> GeneratePayrollReportAsync(PayrollReportRequest request, CancellationToken ct = default);
    Task<byte[]> GenerateSupplierStatementAsync(SupplierStatementRequest request, CancellationToken ct = default);
}

public record ExpenseReportRequest(string BranchName, DateTime From, DateTime To, List<object> Expenses);
public record PayrollReportRequest(string BranchName, int Month, int Year, List<object> Entries);
public record SupplierStatementRequest(string SupplierName, List<object> Transactions);

// ── Email ────────────────────────────────────────────────────────
public interface IEmailService
{
    Task SendAsync(string to, string subject, string body, CancellationToken ct = default);
}

// ── Date/time ────────────────────────────────────────────────────
public interface IDateTimeService
{
    DateTime UtcNow { get; }
    DateOnly Today { get; }
}
