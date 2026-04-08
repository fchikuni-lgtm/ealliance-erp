using Hollies.Domain.Enums;

namespace Hollies.Application.Common.Models;

// ── Paged result ─────────────────────────────────────────────────
public record PagedResult<T>(List<T> Items, int TotalCount, int Page, int PageSize)
{
    public int TotalPages => (int)Math.Ceiling(TotalCount / (double)PageSize);
    public bool HasNextPage => Page < TotalPages;
    public bool HasPreviousPage => Page > 1;
}

// ── Auth ─────────────────────────────────────────────────────────
public record AuthResponse(string AccessToken, string RefreshToken, UserDto User);

public record UserDto(Guid Id, string Name, string Initials, string Email, UserRole Role,
    List<string> Permissions, string? BranchId, string? BranchName);

// ── Reference data ───────────────────────────────────────────────
public record BranchDto(Guid Id, string Name, string RegionName, Guid RegionId);
public record RegionDto(Guid Id, string Name);
public record CategoryDto(Guid Id, string Name);
public record PaymentMethodDto(Guid Id, string Name, string Currency, decimal Balance,
    decimal IncomeTotal, decimal ExpenseTotal);
public record SupplierSummaryDto(Guid Id, string Name, string? Phone, string Flag,
    decimal Balance, bool HasIncompleteDetails);
public record ProductDto(Guid Id, string Name);

// ── Expenses ─────────────────────────────────────────────────────
public record ExpenseListDto(
    string Id, string ExpenseNumber, DateOnly Date,
    string BranchName, string RegionName, string CategoryName,
    string? SupplierName, string Currency, decimal Amount,
    string PaymentMethodName, string Status,
    bool IsFlagged, bool IsGreenFlagged, bool IsReversed,
    string CreatedByName, DateTime CreatedAt);

public record ExpenseDetailDto(
    string Id, string ExpenseNumber, DateOnly Date, DateOnly ValueDate,
    Guid BranchId, string BranchName, Guid RegionId, string RegionName,
    Guid CategoryId, string CategoryName, string? BudgetId, string ExpenseType,
    Guid? SupplierId, string? SupplierName, Guid? WorkmanId, string? WorkmanName,
    string Currency, decimal Amount, Guid PaymentMethodId, string PaymentMethodName,
    string Status, bool IsFlagged, string? FlagReason, bool IsGreenFlagged,
    bool IsReversed, string? Notes,
    string CreatedByName, string? ReviewedByName, string? ApprovedByName, string? PaidByName,
    List<ExpenseHistoryDto> History);

public record ExpenseHistoryDto(Guid Id, string Action, string DoneByName,
    string? Notes, DateTime CreatedAt);

// ── GRV ──────────────────────────────────────────────────────────
public record GrvListDto(
    string Id, string GrvNumber, DateOnly Date, string SupplierName,
    string? ReceiptNumber, string RegionName, string Warehouse,
    string Currency, decimal TotalValue, string Status, string PayType,
    bool IsFlagged, bool IsGreenFlagged, string CreatedByName, DateTime CreatedAt);

public record GrvDetailDto(
    string Id, string GrvNumber, DateOnly Date,
    Guid SupplierId, string SupplierName, string? ReceiptNumber,
    Guid RegionId, string RegionName, string Warehouse,
    string? ExpenseId, decimal AmountPaid, string Currency,
    string Status, string PayType, bool IsFlagged, bool IsGreenFlagged,
    List<GrvProductDto> Products, List<GrvHistoryDto> History,
    string CreatedByName, DateTime CreatedAt);

public record GrvProductDto(Guid Id, string ProductName,
    decimal Quantity, decimal UnitCost, string Currency, decimal LineTotal);

public record GrvHistoryDto(Guid Id, string Action, string DoneByName,
    string? Notes, DateTime CreatedAt);

// ── Income ───────────────────────────────────────────────────────
public record IncomeDto(
    string Id, string IncomeNumber, DateOnly Date, string Source,
    string PaymentMethodName, string Currency, decimal Amount, string Status,
    string? ApprovedByName, string? RejectionReason, bool IsFlagged,
    string CreatedByName, DateTime CreatedAt);

// ── Approvals ────────────────────────────────────────────────────
public record PendingApprovalDto(
    string Id, string Type, string Description,
    string Currency, decimal Amount, string Location, DateOnly Date, string NextAction);

// ── HR ───────────────────────────────────────────────────────────
public record EmployeeListDto(
    Guid Id, string EmployeeNumber, string FullName, string BranchName,
    string? Position, string? Department, decimal GrossSalary, string Currency, string Status);

public record EmployeeDetailDto(
    Guid Id, string EmployeeNumber, string FirstName, string LastName,
    Guid BranchId, string BranchName, string? Department, string? Position,
    decimal GrossSalary, string Currency, DateOnly? StartDate,
    string? IdNumber, string? Phone, string? Address, string Status,
    bool DoubleShiftDefault, DateTime CreatedAt);

public record AttendanceDto(
    Guid Id, Guid EmployeeId, string EmployeeNumber, string FullName,
    DateOnly Date, string Status, string? Notes);

public record PayrollEntryDto(
    Guid Id, Guid EmployeeId, string EmployeeNumber, string FullName,
    string BranchName, int Month, int Year,
    decimal DaysWorked, decimal DoubleShiftDays,
    decimal GrossSalary, decimal CalculatedPay, string Status,
    string? ApprovedByName);

// ── Reports ──────────────────────────────────────────────────────
public record ExpenseReportDto(
    string Label, List<CategoryTotalDto> ByCategory,
    List<BranchTotalDto> ByBranch, decimal GrandTotal, int ExpenseCount);

public record CategoryTotalDto(string Name, decimal Total, int Count);
public record BranchTotalDto(string Name, decimal Total);
