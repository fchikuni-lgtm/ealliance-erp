using Hollies.Domain.Common;
using Hollies.Domain.Enums;

namespace Hollies.Domain.Entities;

// ── Reference Data ───────────────────────────────────────────────

public class Region : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public bool Active { get; set; } = true;
    public ICollection<Branch> Branches { get; set; } = [];
}

public class Branch : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public Guid RegionId { get; set; }
    public Region Region { get; set; } = null!;
    public bool Active { get; set; } = true;
    public ICollection<Employee> Employees { get; set; } = [];
}

public class Category : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = "Expense"; // "Expense" or "Product"
    public bool Active { get; set; } = true;
}

public class PaymentMethod : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public Currency Currency { get; set; }
    public decimal Balance { get; set; }
    public decimal IncomeTotal { get; set; }
    public decimal ExpenseTotal { get; set; }
    public bool Active { get; set; } = true;
}

public class Product : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? SubName { get; set; }
    public string? SerialNumber { get; set; }
    public Guid? CategoryId { get; set; }
    public Category? Category { get; set; }
    public string? Keywords { get; set; }           // comma separated
    public decimal CostPrice { get; set; }
    public decimal SellingPrice { get; set; }
    public bool Active { get; set; } = true;
    public ICollection<ProductNameHistory> NameHistory { get; set; } = [];
}

public class Workman : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public bool Active { get; set; } = true;
}

// ── Users ────────────────────────────────────────────────────────

public class User : BaseEntity
{
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Initials { get; set; } = string.Empty;
    public UserRole Role { get; set; } = UserRole.Cashier;
    public Guid? BranchId { get; set; }
    public Branch? Branch { get; set; }
    public string? WhatsApp { get; set; }
    public bool Active { get; set; } = true;
    public List<string> Permissions { get; set; } = [];
    public string? RefreshToken { get; set; }
    public DateTime? RefreshTokenExpiry { get; set; }
}

// ── Suppliers ────────────────────────────────────────────────────

public class Supplier : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? ContactPerson { get; set; }
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public SupplierFlag Flag { get; set; } = SupplierFlag.None;
    public decimal Balance { get; set; }
    public bool Active { get; set; } = true;
    public ICollection<Expense> Expenses { get; set; } = [];
    public ICollection<Grv> Grvs { get; set; } = [];
}

// ── Expenses ─────────────────────────────────────────────────────

public class Expense : BaseEntity
{
    // Auto-generated: E001, E002, etc.
    public string ExpenseNumber { get; set; } = string.Empty;

    public DateOnly Date { get; set; }
    public DateOnly ValueDate { get; set; }

    public Guid BranchId { get; set; }
    public Branch Branch { get; set; } = null!;

    public Guid RegionId { get; set; }
    public Region Region { get; set; } = null!;

    public Guid CategoryId { get; set; }
    public Category Category { get; set; } = null!;

    public string? BudgetId { get; set; }
    public ExpenseType ExpenseType { get; set; } = ExpenseType.General;

    public Guid? SupplierId { get; set; }
    public Supplier? Supplier { get; set; }

    public Guid? WorkmanId { get; set; }
    public Workman? Workman { get; set; }

    public Currency Currency { get; set; }
    public decimal Amount { get; set; }

    public Guid PaymentMethodId { get; set; }
    public PaymentMethod PaymentMethod { get; set; } = null!;

    public ExpenseStatus Status { get; set; } = ExpenseStatus.Pending;
    public bool IsFlagged { get; set; }
    public string? FlagReason { get; set; }
    public bool IsGreenFlagged { get; set; }
    public bool IsReversed { get; set; }
    public bool IsReviewEdited { get; set; }

    public Guid CreatedById { get; set; }
    public User CreatedBy { get; set; } = null!;

    public Guid? ReviewedById { get; set; }
    public User? ReviewedBy { get; set; }

    public Guid? ApprovedById { get; set; }
    public User? ApprovedBy { get; set; }

    public Guid? PaidById { get; set; }
    public User? PaidBy { get; set; }

    public string? WhatsAppNotify { get; set; }
    public string? Notes { get; set; }

    public ICollection<ExpenseHistory> History { get; set; } = [];
}

public class ExpenseHistory : BaseEntity
{
    public Guid ExpenseId { get; set; }
    public Expense Expense { get; set; } = null!;
    public string Action { get; set; } = string.Empty;
    public Guid DoneById { get; set; }
    public User DoneBy { get; set; } = null!;
    public string? Notes { get; set; }
}

// ── GRV ─────────────────────────────────────────────────────────

public class Grv : BaseEntity
{
    public string GrvNumber { get; set; } = string.Empty;  // G001, G002…
    public DateOnly Date { get; set; }

    public Guid SupplierId { get; set; }
    public Supplier Supplier { get; set; } = null!;

    public string? ReceiptNumber { get; set; }

    public Guid RegionId { get; set; }
    public Region Region { get; set; } = null!;

    public Warehouse Warehouse { get; set; } = Warehouse.Main;

    public string? ExpenseId { get; set; }   // linked expense if paid by cash
    public decimal AmountPaid { get; set; }
    public Currency Currency { get; set; }

    public GrvStatus Status { get; set; } = GrvStatus.Received;
    public GrvPayType PayType { get; set; } = GrvPayType.Cash;
    public bool IsFlagged { get; set; }         // red = blank/credit
    public bool IsGreenFlagged { get; set; }    // green = over-supplied

    public Guid CreatedById { get; set; }
    public User CreatedBy { get; set; } = null!;

    public ICollection<GrvProduct> Products { get; set; } = [];
    public ICollection<GrvHistory> History { get; set; } = [];
}

public class GrvProduct : BaseEntity
{
    public Guid GrvId { get; set; }
    public Grv Grv { get; set; } = null!;
    public string ProductName { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public decimal UnitCost { get; set; }
    public Currency Currency { get; set; }
    public decimal LineTotal => Quantity * UnitCost;
}

public class GrvHistory : BaseEntity
{
    public Guid GrvId { get; set; }
    public Grv Grv { get; set; } = null!;
    public string Action { get; set; } = string.Empty;
    public string DoneByName { get; set; } = string.Empty;
    public string? Notes { get; set; }
}

// ── Income ───────────────────────────────────────────────────────

public class Income : BaseEntity
{
    public string IncomeNumber { get; set; } = string.Empty;  // I001, I002…
    public DateOnly Date { get; set; }
    public string Source { get; set; } = string.Empty;
    public Guid PaymentMethodId { get; set; }
    public PaymentMethod PaymentMethod { get; set; } = null!;
    public Currency Currency { get; set; }
    public decimal Amount { get; set; }
    public IncomeStatus Status { get; set; } = IncomeStatus.Pending;
    public Guid? ApprovedById { get; set; }
    public User? ApprovedBy { get; set; }
    public string? RejectionReason { get; set; }
    public bool IsFlagged { get; set; }
    public Guid CreatedById { get; set; }
    public User CreatedBy { get; set; } = null!;
}

// ── HR — Employees ───────────────────────────────────────────────

public class Employee : BaseEntity
{
    public string EmployeeNumber { get; set; } = string.Empty;  // EMP0001
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string FullName => $"{FirstName} {LastName}";
    public Guid BranchId { get; set; }
    public Branch Branch { get; set; } = null!;
    public string? Department { get; set; }
    public string? Position { get; set; }
    public decimal GrossSalary { get; set; }
    public Currency Currency { get; set; } = Currency.USD;
    public DateOnly? StartDate { get; set; }
    public string? IdNumber { get; set; }
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public EmployeeStatus Status { get; set; } = EmployeeStatus.Active;
    public bool DoubleShiftDefault { get; set; }
    public Guid? UserId { get; set; }
    public User? User { get; set; }
    public ICollection<Attendance> AttendanceRecords { get; set; } = [];
    public ICollection<PayrollEntry> PayrollEntries { get; set; } = [];
}

public class Attendance : BaseEntity
{
    public Guid EmployeeId { get; set; }
    public Employee Employee { get; set; } = null!;
    public DateOnly Date { get; set; }
    public AttendanceStatus Status { get; set; }
    public string? Notes { get; set; }
    public Guid MarkedById { get; set; }
    public User MarkedBy { get; set; } = null!;
}

public class PayrollEntry : BaseEntity
{
    public Guid EmployeeId { get; set; }
    public Employee Employee { get; set; } = null!;
    public int Month { get; set; }
    public int Year { get; set; }
    public decimal DaysWorked { get; set; }
    public decimal DoubleShiftDays { get; set; }
    public decimal GrossSalary { get; set; }
    public decimal CalculatedPay { get; set; }
    public PayrollStatus Status { get; set; } = PayrollStatus.Pending;
    public Guid? ApprovedById { get; set; }
    public User? ApprovedBy { get; set; }
    public string? Notes { get; set; }
    public Guid CreatedById { get; set; }
    public User CreatedBy { get; set; } = null!;
}

// ── Audit Log ────────────────────────────────────────────────────

public class AuditLog : BaseEntity
{
    public string EntityName { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public Guid UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string? OldValues { get; set; }
    public string? NewValues { get; set; }
    public string? IpAddress { get; set; }
}
