// AssetEntities.cs — Asset Register domain entities for eAlliance ERP
// Tracks physical assets, their movements, lending, damage and disposals
using Hollies.Domain.Common;
using Hollies.Domain.Enums;

namespace Hollies.Domain.Entities;

// ── Asset Location hierarchy ───────────────────────────────────────
// Branch → Location → Sub-location → Sub-sub-location
public class AssetLocation : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public Guid? BranchId { get; set; }
    public Branch? Branch { get; set; }
    public Guid? ParentId { get; set; }             // null = top-level location
    public AssetLocation? Parent { get; set; }
    public int Level { get; set; }                  // 0=location, 1=sub, 2=sub-sub
    public bool Active { get; set; } = true;
    public ICollection<AssetLocation> Children { get; set; } = [];
}

// ── Asset ─────────────────────────────────────────────────────────
public class Asset : BaseEntity
{
    public string AssetNumber { get; set; } = string.Empty;  // AST-0001
    public string Name { get; set; } = string.Empty;
    public string? SubName { get; set; }
    public string? SerialNumber { get; set; }
    public Guid? CategoryId { get; set; }
    public Category? Category { get; set; }
    public string? Keywords { get; set; }           // comma separated for search
    public decimal Value { get; set; }              // original purchase value
    public decimal DepreciationPct { get; set; }    // % per year
    public int Quantity { get; set; } = 1;

    // Supplier details (embedded — no FK for simplicity)
    public string? SupplierName { get; set; }
    public string? SupplierContact { get; set; }
    public string? SupplierPhone { get; set; }
    public string? SupplierAddress { get; set; }

    // Location & responsibility
    public Guid? LocationId { get; set; }
    public AssetLocation? Location { get; set; }
    public string? ResponsiblePerson { get; set; } // free text OR user name
    public Guid? ResponsibleUserId { get; set; }
    public User? ResponsibleUser { get; set; }
    public string? Accessories { get; set; }        // comma separated list

    public string? PhotoUrl { get; set; }
    public AssetStatus Status { get; set; } = AssetStatus.Active;

    public Guid BranchId { get; set; }
    public Branch Branch { get; set; } = null!;
    public Guid CreatedById { get; set; }
    public User CreatedBy { get; set; } = null!;

    public ICollection<AssetMovement> Movements { get; set; } = [];
    public ICollection<AssetLending> Lendings { get; set; } = [];
    public ICollection<AssetDamage> Damages { get; set; } = [];
}

// ── Asset Movement (AMV) ──────────────────────────────────────────
public class AssetMovement : BaseEntity
{
    public string AmvNumber { get; set; } = string.Empty;   // AMV-001
    public Guid AssetId { get; set; }
    public Asset Asset { get; set; } = null!;
    public Guid? FromLocationId { get; set; }
    public AssetLocation? FromLocation { get; set; }
    public Guid? ToLocationId { get; set; }
    public AssetLocation? ToLocation { get; set; }
    public DateOnly Date { get; set; }
    public bool IsCrossBranch { get; set; }
    public AssetMovementStatus Status { get; set; } = AssetMovementStatus.Pending;
    public Guid? AcceptedById { get; set; }
    public User? AcceptedBy { get; set; }
    public DateTime? AcceptedAt { get; set; }
    public string? RejectionReason { get; set; }
    public Guid CreatedById { get; set; }
    public User CreatedBy { get; set; } = null!;
}

// ── Asset Lending ─────────────────────────────────────────────────
public class AssetLending : BaseEntity
{
    public string LendingNumber { get; set; } = string.Empty;   // L-001
    public Guid AssetId { get; set; }
    public Asset Asset { get; set; } = null!;
    public Guid? ToLocationId { get; set; }
    public AssetLocation? ToLocation { get; set; }
    public string BorrowerName { get; set; } = string.Empty;
    public DateOnly ExpectedReturnDate { get; set; }
    public DateTime? ReturnedAt { get; set; }
    public AssetLendingStatus Status { get; set; } = AssetLendingStatus.Active;
    public Guid CreatedById { get; set; }
    public User CreatedBy { get; set; } = null!;
}

// ── Asset Damage ──────────────────────────────────────────────────
public class AssetDamage : BaseEntity
{
    public Guid AssetId { get; set; }
    public Asset Asset { get; set; } = null!;
    public string Description { get; set; } = string.Empty;
    public bool StillInService { get; set; } = true;
    public Guid ReportedById { get; set; }
    public User ReportedBy { get; set; } = null!;
}
