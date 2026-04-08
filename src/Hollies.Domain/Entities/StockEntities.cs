// StockEntities.cs — All stock module domain entities for eAlliance ERP
// Modules: Revenue Points, Stock Counts, Stock Movements,
//          Transfer Outs, Cash-Up, Stock Adjustments, Debtors, Close Day
using Hollies.Domain.Common;
using Hollies.Domain.Enums;

namespace Hollies.Domain.Entities;

// ── Revenue Points ────────────────────────────────────────────────
// A revenue point is a location within a branch (bar, restaurant, etc.)
// Only is_stock_point=true revenue points appear in stock count wizards
public class RevenuePoint : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public Guid BranchId { get; set; }
    public Branch Branch { get; set; } = null!;
    public RevenuePointType Type { get; set; } = RevenuePointType.Bar;
    public bool IsStockPoint { get; set; } = true;
    public bool Enabled { get; set; } = true;
}

// ── Currency (stock module — full entity with rates) ──────────────
// Distinct from the Currency enum — this supports exchange rates
public class CurrencyRate : BaseEntity
{
    public string Code { get; set; } = string.Empty;   // USD, ZiG, ZWL, ZAR
    public string Name { get; set; } = string.Empty;
    public decimal RateToUsd { get; set; } = 1m;       // USD is always 1
    public bool IsBase { get; set; }                    // true for USD
    public bool Active { get; set; } = true;
}

// ── Extended Product (cost + selling price, category, keywords) ───
// The existing Product entity is extended by migration — these extra
// fields are added to the existing Products table
// ProductNameHistory tracks every name/price change per product

public class ProductNameHistory : BaseEntity
{
    public Guid ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public string? OldName { get; set; }
    public string? NewName { get; set; }
    public decimal? OldCostPrice { get; set; }
    public decimal? NewCostPrice { get; set; }
    public decimal? OldSellingPrice { get; set; }
    public decimal? NewSellingPrice { get; set; }
    public Guid ChangedById { get; set; }
    public User ChangedBy { get; set; } = null!;
}

// ── Stock Counts ──────────────────────────────────────────────────
public class StockCount : BaseEntity
{
    public string CountNumber { get; set; } = string.Empty; // SC-001
    public Guid BranchId { get; set; }
    public Branch Branch { get; set; } = null!;
    public Guid RevenuePointId { get; set; }
    public RevenuePoint RevenuePoint { get; set; } = null!;
    public DateOnly Date { get; set; }
    public StockCountType Type { get; set; }        // Opening, Closing
    public StockCountMethod CountMethod { get; set; } // C1Only, C1C2, PrevClosing
    public DateOnly? CopiedFromDate { get; set; }    // if method = PrevClosing
    public bool IsFinalised { get; set; }
    public Guid CreatedById { get; set; }
    public User CreatedBy { get; set; } = null!;
    public ICollection<StockCountItem> Items { get; set; } = [];
}

public class StockCountItem : BaseEntity
{
    public Guid CountId { get; set; }
    public StockCount Count { get; set; } = null!;
    public Guid ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public decimal Qty { get; set; }
    public string Tag { get; set; } = "count1";  // count1, count2, final
}

// ── Stock Movements (SMV) ─────────────────────────────────────────
public class Smv : BaseEntity
{
    public string SmvNumber { get; set; } = string.Empty;   // SMV-001
    public Guid BranchId { get; set; }
    public Branch Branch { get; set; } = null!;

    // From location
    public Guid? FromRevenuePointId { get; set; }
    public RevenuePoint? FromRevenuePoint { get; set; }
    public string? FromWarehouse { get; set; }  // "CentralWarehouse", "BranchWarehouse"

    // To location
    public Guid? ToRevenuePointId { get; set; }
    public RevenuePoint? ToRevenuePoint { get; set; }
    public string? ToWarehouse { get; set; }

    public DateOnly Date { get; set; }
    public SmvStatus Status { get; set; } = SmvStatus.Pending;
    public string? RejectionReason { get; set; }
    public bool IsCrossBranch { get; set; }

    public Guid CreatedById { get; set; }
    public User CreatedBy { get; set; } = null!;
    public Guid? ApprovedById { get; set; }
    public User? ApprovedBy { get; set; }

    public ICollection<SmvItem> Items { get; set; } = [];
}

public class SmvItem : BaseEntity
{
    public Guid SmvId { get; set; }
    public Smv Smv { get; set; } = null!;
    public Guid ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public decimal Qty { get; set; }
    public decimal CostPrice { get; set; }
    public decimal SellingPrice { get; set; }
}

// ── Transfer Outs ─────────────────────────────────────────────────
public class TransferOut : BaseEntity
{
    public string ToNumber { get; set; } = string.Empty;   // TO-001
    public Guid BranchId { get; set; }
    public Branch Branch { get; set; } = null!;
    public Guid RevenuePointId { get; set; }
    public RevenuePoint RevenuePoint { get; set; } = null!;
    public TransferOutType Type { get; set; }       // Compliment, Breakage, Ullage, Debtor, Other
    public string? BeneficiaryName { get; set; }    // required for Compliment + Debtor
    public DateOnly Date { get; set; }
    public TransferOutStatus Status { get; set; } = TransferOutStatus.Pending;
    public string? RejectionReason { get; set; }
    public Guid CreatedById { get; set; }
    public User CreatedBy { get; set; } = null!;
    public Guid? ApprovedById { get; set; }
    public User? ApprovedBy { get; set; }
    public ICollection<TransferOutItem> Items { get; set; } = [];
}

public class TransferOutItem : BaseEntity
{
    public Guid TransferOutId { get; set; }
    public TransferOut TransferOut { get; set; } = null!;
    public Guid ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public decimal Qty { get; set; }
    public decimal CostPrice { get; set; }
    public decimal SellingPrice { get; set; }
}

// ── Cash-Up ───────────────────────────────────────────────────────
public class CashUp : BaseEntity
{
    public string CaNumber { get; set; } = string.Empty;   // CA-001
    public Guid BranchId { get; set; }
    public Branch Branch { get; set; } = null!;
    public DateOnly Date { get; set; }
    public Guid PaymentMethodId { get; set; }
    public PaymentMethod PaymentMethod { get; set; } = null!;
    public decimal TotalUsd { get; set; }
    public CashUpStatus Status { get; set; } = CashUpStatus.Pending;
    public Guid CreatedById { get; set; }
    public User CreatedBy { get; set; } = null!;
    public Guid? ApprovedById { get; set; }
    public User? ApprovedBy { get; set; }
    public ICollection<CashUpEntry> Entries { get; set; } = [];
}

public class CashUpEntry : BaseEntity
{
    public Guid CashUpId { get; set; }
    public CashUp CashUp { get; set; } = null!;
    public Guid RevenuePointId { get; set; }
    public RevenuePoint RevenuePoint { get; set; } = null!;
    public Guid? CashierId { get; set; }
    public User? Cashier { get; set; }
    public string CurrencyCode { get; set; } = "USD";
    public decimal Amount { get; set; }
    public decimal AmountUsd { get; set; }
}

// ── Stock Adjustments ─────────────────────────────────────────────
public class StockAdjustment : BaseEntity
{
    public Guid BranchId { get; set; }
    public Branch Branch { get; set; } = null!;
    public Guid RevenuePointId { get; set; }
    public RevenuePoint RevenuePoint { get; set; } = null!;
    public Guid ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public DateOnly Date { get; set; }
    public decimal Qty { get; set; }
    public AdjustmentDirection Direction { get; set; } // Increase, Reduce
    public string Reason { get; set; } = string.Empty;
    public AdjustmentStatus Status { get; set; } = AdjustmentStatus.Pending;
    public Guid CreatedById { get; set; }
    public User CreatedBy { get; set; } = null!;
    public Guid? ApprovedById { get; set; }
    public User? ApprovedBy { get; set; }
}

// ── Debtors ───────────────────────────────────────────────────────
public class Debtor : BaseEntity
{
    public Guid BranchId { get; set; }
    public Branch Branch { get; set; } = null!;
    public string Name { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public decimal CreditLimit { get; set; }
    public decimal Balance { get; set; }            // positive = owes money
    public bool Active { get; set; } = true;
    public Guid CreatedById { get; set; }
    public User CreatedBy { get; set; } = null!;
    public ICollection<DebtorTransaction> Transactions { get; set; } = [];
}

public class DebtorTransaction : BaseEntity
{
    public Guid DebtorId { get; set; }
    public Debtor Debtor { get; set; } = null!;
    public DebtorTransactionType Type { get; set; } // Charge, Payment
    public decimal Amount { get; set; }
    public string? ReferenceId { get; set; }        // TO number or CA number
    public string? ReferenceType { get; set; }
    public DateOnly Date { get; set; }
    public string? Notes { get; set; }
    public decimal RunningBalance { get; set; }
    public Guid CreatedById { get; set; }
    public User CreatedBy { get; set; } = null!;
}

// ── Close Day ─────────────────────────────────────────────────────
public class ClosedDay : BaseEntity
{
    public Guid BranchId { get; set; }
    public Branch Branch { get; set; } = null!;
    public DateOnly Date { get; set; }
    public Guid ClosedById { get; set; }
    public User ClosedBy { get; set; } = null!;
    public DateTime ClosedAt { get; set; }
    public string? Notes { get; set; }
    public Guid? ReopenedById { get; set; }
    public User? ReopenedBy { get; set; }
    public DateTime? ReopenedAt { get; set; }
}
