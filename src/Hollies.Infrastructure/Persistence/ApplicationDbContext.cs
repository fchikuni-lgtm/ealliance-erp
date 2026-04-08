using Hollies.Application.Common.Interfaces;
using Hollies.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Hollies.Infrastructure.Persistence;

public class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
    : DbContext(options), IApplicationDbContext
{
    // ── Existing Hollies modules ──────────────────────────────────
    public DbSet<User> Users => Set<User>();
    public DbSet<Branch> Branches => Set<Branch>();
    public DbSet<Region> Regions => Set<Region>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<PaymentMethod> PaymentMethods => Set<PaymentMethod>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<ProductNameHistory> ProductNameHistory => Set<ProductNameHistory>();
    public DbSet<Workman> Workmen => Set<Workman>();
    public DbSet<Supplier> Suppliers => Set<Supplier>();
    public DbSet<Expense> Expenses => Set<Expense>();
    public DbSet<ExpenseHistory> ExpenseHistory => Set<ExpenseHistory>();
    public DbSet<Grv> Grvs => Set<Grv>();
    public DbSet<GrvProduct> GrvProducts => Set<GrvProduct>();
    public DbSet<GrvHistory> GrvHistory => Set<GrvHistory>();
    public DbSet<Income> Incomes => Set<Income>();
    public DbSet<Employee> Employees => Set<Employee>();
    public DbSet<Attendance> Attendance => Set<Attendance>();
    public DbSet<PayrollEntry> PayrollEntries => Set<PayrollEntry>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    // ── eAlliance StockMaster modules ─────────────────────────────
    public DbSet<RevenuePoint> RevenuePoints => Set<RevenuePoint>();
    public DbSet<CurrencyRate> CurrencyRates => Set<CurrencyRate>();
    public DbSet<StockCount> StockCounts => Set<StockCount>();
    public DbSet<StockCountItem> StockCountItems => Set<StockCountItem>();
    public DbSet<Smv> Smvs => Set<Smv>();
    public DbSet<SmvItem> SmvItems => Set<SmvItem>();
    public DbSet<TransferOut> TransferOuts => Set<TransferOut>();
    public DbSet<TransferOutItem> TransferOutItems => Set<TransferOutItem>();
    public DbSet<CashUp> CashUps => Set<CashUp>();
    public DbSet<CashUpEntry> CashUpEntries => Set<CashUpEntry>();
    public DbSet<StockAdjustment> StockAdjustments => Set<StockAdjustment>();
    public DbSet<Debtor> Debtors => Set<Debtor>();
    public DbSet<DebtorTransaction> DebtorTransactions => Set<DebtorTransaction>();
    public DbSet<ClosedDay> ClosedDays => Set<ClosedDay>();

    // ── Asset Register ────────────────────────────────────────────
    public DbSet<AssetLocation> AssetLocations => Set<AssetLocation>();
    public DbSet<Asset> Assets => Set<Asset>();
    public DbSet<AssetMovement> AssetMovements => Set<AssetMovement>();
    public DbSet<AssetLending> AssetLendings => Set<AssetLending>();
    public DbSet<AssetDamage> AssetDamages => Set<AssetDamage>();

    protected override void OnModelCreating(ModelBuilder mb)
    {
        base.OnModelCreating(mb);

        // ── User ──────────────────────────────────────────────────
        mb.Entity<User>(e =>
        {
            e.HasIndex(u => u.Email).IsUnique();
            e.Property(u => u.Permissions).HasConversion(
                v => string.Join(',', v),
                v => v.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList());
            e.Property(u => u.Role).HasConversion<string>();
        });

        // ── Branch / Region ───────────────────────────────────────
        mb.Entity<Branch>(e =>
        {
            e.HasOne(b => b.Region).WithMany(r => r.Branches).HasForeignKey(b => b.RegionId);
            e.HasIndex(b => b.Name).IsUnique();
        });
        mb.Entity<Region>(e => e.HasIndex(r => r.Name).IsUnique());
        mb.Entity<Category>(e => e.HasIndex(c => c.Name).IsUnique());
        mb.Entity<Supplier>(e => { e.HasIndex(s => s.Name).IsUnique(); e.Property(s => s.Flag).HasConversion<string>(); });

        // ── Expense ───────────────────────────────────────────────
        mb.Entity<Expense>(e =>
        {
            e.HasIndex(ex => ex.ExpenseNumber).IsUnique();
            e.Property(ex => ex.Status).HasConversion<string>();
            e.Property(ex => ex.Currency).HasConversion<string>();
            e.Property(ex => ex.ExpenseType).HasConversion<string>();
            e.HasOne(ex => ex.Branch).WithMany().HasForeignKey(ex => ex.BranchId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(ex => ex.Region).WithMany().HasForeignKey(ex => ex.RegionId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(ex => ex.Category).WithMany().HasForeignKey(ex => ex.CategoryId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(ex => ex.PaymentMethod).WithMany().HasForeignKey(ex => ex.PaymentMethodId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(ex => ex.Supplier).WithMany(s => s.Expenses).HasForeignKey(ex => ex.SupplierId).IsRequired(false);
            e.HasOne(ex => ex.CreatedBy).WithMany().HasForeignKey(ex => ex.CreatedById).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(ex => ex.ReviewedBy).WithMany().HasForeignKey(ex => ex.ReviewedById).IsRequired(false).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(ex => ex.ApprovedBy).WithMany().HasForeignKey(ex => ex.ApprovedById).IsRequired(false).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(ex => ex.PaidBy).WithMany().HasForeignKey(ex => ex.PaidById).IsRequired(false).OnDelete(DeleteBehavior.Restrict);
            e.HasMany(ex => ex.History).WithOne(h => h.Expense).HasForeignKey(h => h.ExpenseId);
            e.Property(ex => ex.Amount).HasColumnType("decimal(18,2)");
        });
        mb.Entity<ExpenseHistory>(e =>
        {
            e.HasOne(h => h.DoneBy).WithMany().HasForeignKey(h => h.DoneById).OnDelete(DeleteBehavior.Restrict);
        });

        // ── GRV ───────────────────────────────────────────────────
        mb.Entity<Grv>(e =>
        {
            e.HasIndex(g => g.GrvNumber).IsUnique();
            e.Property(g => g.Status).HasConversion<string>();
            e.Property(g => g.PayType).HasConversion<string>();
            e.Property(g => g.Currency).HasConversion<string>();
            e.Property(g => g.Warehouse).HasConversion<string>();
            e.HasOne(g => g.Supplier).WithMany(s => s.Grvs).HasForeignKey(g => g.SupplierId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(g => g.Region).WithMany().HasForeignKey(g => g.RegionId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(g => g.CreatedBy).WithMany().HasForeignKey(g => g.CreatedById).OnDelete(DeleteBehavior.Restrict);
            e.HasMany(g => g.Products).WithOne(p => p.Grv).HasForeignKey(p => p.GrvId);
            e.HasMany(g => g.History).WithOne(h => h.Grv).HasForeignKey(h => h.GrvId);
        });
        mb.Entity<GrvProduct>(e => { e.Property(p => p.Currency).HasConversion<string>(); e.Property(p => p.Quantity).HasColumnType("decimal(18,4)"); e.Property(p => p.UnitCost).HasColumnType("decimal(18,4)"); e.Ignore(p => p.LineTotal); });

        // ── Income ────────────────────────────────────────────────
        mb.Entity<Income>(e =>
        {
            e.HasIndex(i => i.IncomeNumber).IsUnique();
            e.Property(i => i.Status).HasConversion<string>();
            e.Property(i => i.Currency).HasConversion<string>();
            e.HasOne(i => i.PaymentMethod).WithMany().HasForeignKey(i => i.PaymentMethodId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(i => i.CreatedBy).WithMany().HasForeignKey(i => i.CreatedById).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(i => i.ApprovedBy).WithMany().HasForeignKey(i => i.ApprovedById).IsRequired(false).OnDelete(DeleteBehavior.Restrict);
        });

        // ── HR ────────────────────────────────────────────────────
        mb.Entity<Employee>(e =>
        {
            e.HasIndex(em => em.EmployeeNumber).IsUnique();
            e.Property(em => em.Status).HasConversion<string>();
            e.Property(em => em.Currency).HasConversion<string>();
            e.HasOne(em => em.Branch).WithMany(b => b.Employees).HasForeignKey(em => em.BranchId).OnDelete(DeleteBehavior.Restrict);
            e.Ignore(em => em.FullName);
        });
        mb.Entity<Attendance>(e =>
        {
            e.HasIndex(a => new { a.EmployeeId, a.Date }).IsUnique();
            e.Property(a => a.Status).HasConversion<string>();
            e.HasOne(a => a.Employee).WithMany(em => em.AttendanceRecords).HasForeignKey(a => a.EmployeeId);
            e.HasOne(a => a.MarkedBy).WithMany().HasForeignKey(a => a.MarkedById).OnDelete(DeleteBehavior.Restrict);
        });
        mb.Entity<PayrollEntry>(e =>
        {
            e.HasIndex(p => new { p.EmployeeId, p.Month, p.Year }).IsUnique();
            e.Property(p => p.Status).HasConversion<string>();
            e.Property(p => p.GrossSalary).HasColumnType("decimal(18,2)");
            e.Property(p => p.CalculatedPay).HasColumnType("decimal(18,2)");
            e.HasOne(p => p.Employee).WithMany(em => em.PayrollEntries).HasForeignKey(p => p.EmployeeId);
            e.HasOne(p => p.CreatedBy).WithMany().HasForeignKey(p => p.CreatedById).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(p => p.ApprovedBy).WithMany().HasForeignKey(p => p.ApprovedById).IsRequired(false).OnDelete(DeleteBehavior.Restrict);
        });

        // ── Payment method ────────────────────────────────────────
        mb.Entity<PaymentMethod>(e =>
        {
            e.HasIndex(p => p.Name).IsUnique();
            e.Property(p => p.Currency).HasConversion<string>();
            e.Property(p => p.Balance).HasColumnType("decimal(18,2)");
            e.Property(p => p.IncomeTotal).HasColumnType("decimal(18,2)");
            e.Property(p => p.ExpenseTotal).HasColumnType("decimal(18,2)");
        });

        // ── Indexes for performance at scale ──────────────────────
        mb.Entity<Expense>().HasIndex(e => e.Status);
        mb.Entity<Expense>().HasIndex(e => e.Date);
        mb.Entity<Expense>().HasIndex(e => e.CreatedAt);
        mb.Entity<Expense>().HasIndex(e => e.BranchId);
        mb.Entity<Expense>().HasIndex(e => e.SupplierId);
        mb.Entity<Expense>().HasIndex(e => e.CategoryId);
        mb.Entity<Expense>().HasIndex(e => e.PaymentMethodId);
        mb.Entity<Grv>().HasIndex(g => g.Status);
        mb.Entity<Grv>().HasIndex(g => g.Date);
        mb.Entity<Grv>().HasIndex(g => g.SupplierId);
        mb.Entity<Grv>().HasIndex(g => g.RegionId);
        mb.Entity<Income>().HasIndex(i => i.Status);
        mb.Entity<Income>().HasIndex(i => i.Date);
        mb.Entity<Income>().HasIndex(i => i.PaymentMethodId);
        mb.Entity<Attendance>().HasIndex(a => a.Date);
        mb.Entity<Attendance>().HasIndex(a => a.EmployeeId);
        mb.Entity<PayrollEntry>().HasIndex(p => new { p.Month, p.Year });
        mb.Entity<PayrollEntry>().HasIndex(p => p.EmployeeId);
        mb.Entity<Employee>().HasIndex(e => e.BranchId);
        mb.Entity<Employee>().HasIndex(e => e.Status);
        mb.Entity<AuditLog>().HasIndex(a => a.EntityName);
        mb.Entity<AuditLog>().HasIndex(a => a.UserId);
        mb.Entity<AuditLog>().HasIndex(a => a.CreatedAt);
        mb.Entity<User>().HasIndex(u => u.Role);
        mb.Entity<User>().HasIndex(u => u.Active);

        // ── eAlliance StockMaster model configuration ─────────────

        // Product (extended)
        mb.Entity<Product>(e =>
        {
            e.Property(p => p.CostPrice).HasColumnType("decimal(18,4)");
            e.Property(p => p.SellingPrice).HasColumnType("decimal(18,4)");
            e.HasMany(p => p.NameHistory).WithOne(h => h.Product).HasForeignKey(h => h.ProductId);
            e.HasOne(p => p.Category).WithMany().HasForeignKey(p => p.CategoryId).IsRequired(false);
        });
        mb.Entity<ProductNameHistory>(e =>
        {
            e.HasOne(h => h.ChangedBy).WithMany().HasForeignKey(h => h.ChangedById).OnDelete(DeleteBehavior.Restrict);
            e.Property(h => h.OldCostPrice).HasColumnType("decimal(18,4)");
            e.Property(h => h.NewCostPrice).HasColumnType("decimal(18,4)");
            e.Property(h => h.OldSellingPrice).HasColumnType("decimal(18,4)");
            e.Property(h => h.NewSellingPrice).HasColumnType("decimal(18,4)");
        });

        // Revenue Points
        mb.Entity<RevenuePoint>(e =>
        {
            e.HasOne(r => r.Branch).WithMany().HasForeignKey(r => r.BranchId).OnDelete(DeleteBehavior.Restrict);
            e.Property(r => r.Type).HasConversion<string>();
            e.HasIndex(r => r.BranchId);
            e.HasIndex(r => new { r.BranchId, r.Enabled });
        });

        // Currency Rates
        mb.Entity<CurrencyRate>(e =>
        {
            e.HasIndex(c => c.Code).IsUnique();
            e.Property(c => c.RateToUsd).HasColumnType("decimal(18,6)");
        });

        // Stock Counts
        mb.Entity<StockCount>(e =>
        {
            e.HasIndex(s => s.CountNumber).IsUnique();
            e.HasIndex(s => new { s.BranchId, s.RevenuePointId, s.Date, s.Type });
            e.Property(s => s.Type).HasConversion<string>();
            e.Property(s => s.CountMethod).HasConversion<string>();
            e.HasOne(s => s.Branch).WithMany().HasForeignKey(s => s.BranchId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(s => s.RevenuePoint).WithMany().HasForeignKey(s => s.RevenuePointId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(s => s.CreatedBy).WithMany().HasForeignKey(s => s.CreatedById).OnDelete(DeleteBehavior.Restrict);
            e.HasMany(s => s.Items).WithOne(i => i.Count).HasForeignKey(i => i.CountId);
        });
        mb.Entity<StockCountItem>(e =>
        {
            e.Property(i => i.Qty).HasColumnType("decimal(18,4)");
            e.HasOne(i => i.Product).WithMany().HasForeignKey(i => i.ProductId).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(i => new { i.CountId, i.ProductId, i.Tag }).IsUnique();
        });

        // SMV (Stock Movements)
        mb.Entity<Smv>(e =>
        {
            e.HasIndex(s => s.SmvNumber).IsUnique();
            e.HasIndex(s => new { s.BranchId, s.Date, s.Status });
            e.Property(s => s.Status).HasConversion<string>();
            e.HasOne(s => s.Branch).WithMany().HasForeignKey(s => s.BranchId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(s => s.FromRevenuePoint).WithMany().HasForeignKey(s => s.FromRevenuePointId).IsRequired(false).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(s => s.ToRevenuePoint).WithMany().HasForeignKey(s => s.ToRevenuePointId).IsRequired(false).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(s => s.CreatedBy).WithMany().HasForeignKey(s => s.CreatedById).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(s => s.ApprovedBy).WithMany().HasForeignKey(s => s.ApprovedById).IsRequired(false).OnDelete(DeleteBehavior.Restrict);
            e.HasMany(s => s.Items).WithOne(i => i.Smv).HasForeignKey(i => i.SmvId);
        });
        mb.Entity<SmvItem>(e =>
        {
            e.Property(i => i.Qty).HasColumnType("decimal(18,4)");
            e.Property(i => i.CostPrice).HasColumnType("decimal(18,4)");
            e.Property(i => i.SellingPrice).HasColumnType("decimal(18,4)");
            e.HasOne(i => i.Product).WithMany().HasForeignKey(i => i.ProductId).OnDelete(DeleteBehavior.Restrict);
        });

        // Transfer Outs
        mb.Entity<TransferOut>(e =>
        {
            e.HasIndex(t => t.ToNumber).IsUnique();
            e.HasIndex(t => new { t.BranchId, t.Date, t.Status });
            e.Property(t => t.Type).HasConversion<string>();
            e.Property(t => t.Status).HasConversion<string>();
            e.HasOne(t => t.Branch).WithMany().HasForeignKey(t => t.BranchId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(t => t.RevenuePoint).WithMany().HasForeignKey(t => t.RevenuePointId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(t => t.CreatedBy).WithMany().HasForeignKey(t => t.CreatedById).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(t => t.ApprovedBy).WithMany().HasForeignKey(t => t.ApprovedById).IsRequired(false).OnDelete(DeleteBehavior.Restrict);
            e.HasMany(t => t.Items).WithOne(i => i.TransferOut).HasForeignKey(i => i.TransferOutId);
        });
        mb.Entity<TransferOutItem>(e =>
        {
            e.Property(i => i.Qty).HasColumnType("decimal(18,4)");
            e.Property(i => i.CostPrice).HasColumnType("decimal(18,4)");
            e.Property(i => i.SellingPrice).HasColumnType("decimal(18,4)");
            e.HasOne(i => i.Product).WithMany().HasForeignKey(i => i.ProductId).OnDelete(DeleteBehavior.Restrict);
        });

        // Cash-Up
        mb.Entity<CashUp>(e =>
        {
            e.HasIndex(c => c.CaNumber).IsUnique();
            e.HasIndex(c => new { c.BranchId, c.Date, c.Status });
            e.Property(c => c.Status).HasConversion<string>();
            e.Property(c => c.TotalUsd).HasColumnType("decimal(18,2)");
            e.HasOne(c => c.Branch).WithMany().HasForeignKey(c => c.BranchId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(c => c.PaymentMethod).WithMany().HasForeignKey(c => c.PaymentMethodId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(c => c.CreatedBy).WithMany().HasForeignKey(c => c.CreatedById).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(c => c.ApprovedBy).WithMany().HasForeignKey(c => c.ApprovedById).IsRequired(false).OnDelete(DeleteBehavior.Restrict);
            e.HasMany(c => c.Entries).WithOne(en => en.CashUp).HasForeignKey(en => en.CashUpId);
        });
        mb.Entity<CashUpEntry>(e =>
        {
            e.Property(en => en.Amount).HasColumnType("decimal(18,2)");
            e.Property(en => en.AmountUsd).HasColumnType("decimal(18,2)");
            e.HasOne(en => en.RevenuePoint).WithMany().HasForeignKey(en => en.RevenuePointId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(en => en.Cashier).WithMany().HasForeignKey(en => en.CashierId).IsRequired(false).OnDelete(DeleteBehavior.Restrict);
        });

        // Stock Adjustments
        mb.Entity<StockAdjustment>(e =>
        {
            e.HasIndex(a => new { a.BranchId, a.RevenuePointId, a.Date });
            e.Property(a => a.Direction).HasConversion<string>();
            e.Property(a => a.Status).HasConversion<string>();
            e.Property(a => a.Qty).HasColumnType("decimal(18,4)");
            e.HasOne(a => a.Branch).WithMany().HasForeignKey(a => a.BranchId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(a => a.RevenuePoint).WithMany().HasForeignKey(a => a.RevenuePointId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(a => a.Product).WithMany().HasForeignKey(a => a.ProductId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(a => a.CreatedBy).WithMany().HasForeignKey(a => a.CreatedById).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(a => a.ApprovedBy).WithMany().HasForeignKey(a => a.ApprovedById).IsRequired(false).OnDelete(DeleteBehavior.Restrict);
        });

        // Debtors
        mb.Entity<Debtor>(e =>
        {
            e.HasIndex(d => new { d.BranchId, d.Name });
            e.Property(d => d.CreditLimit).HasColumnType("decimal(18,2)");
            e.Property(d => d.Balance).HasColumnType("decimal(18,2)");
            e.HasOne(d => d.Branch).WithMany().HasForeignKey(d => d.BranchId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(d => d.CreatedBy).WithMany().HasForeignKey(d => d.CreatedById).OnDelete(DeleteBehavior.Restrict);
            e.HasMany(d => d.Transactions).WithOne(t => t.Debtor).HasForeignKey(t => t.DebtorId);
        });
        mb.Entity<DebtorTransaction>(e =>
        {
            e.HasIndex(t => new { t.DebtorId, t.Date });
            e.Property(t => t.Type).HasConversion<string>();
            e.Property(t => t.Amount).HasColumnType("decimal(18,2)");
            e.Property(t => t.RunningBalance).HasColumnType("decimal(18,2)");
            e.HasOne(t => t.CreatedBy).WithMany().HasForeignKey(t => t.CreatedById).OnDelete(DeleteBehavior.Restrict);
        });

        // Closed Days
        mb.Entity<ClosedDay>(e =>
        {
            e.HasIndex(c => new { c.BranchId, c.Date }).IsUnique();
            e.HasOne(c => c.Branch).WithMany().HasForeignKey(c => c.BranchId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(c => c.ClosedBy).WithMany().HasForeignKey(c => c.ClosedById).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(c => c.ReopenedBy).WithMany().HasForeignKey(c => c.ReopenedById).IsRequired(false).OnDelete(DeleteBehavior.Restrict);
        });

        // Asset Locations
        mb.Entity<AssetLocation>(e =>
        {
            e.HasOne(l => l.Branch).WithMany().HasForeignKey(l => l.BranchId).IsRequired(false).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(l => l.Parent).WithMany(p => p.Children).HasForeignKey(l => l.ParentId).IsRequired(false).OnDelete(DeleteBehavior.Restrict);
        });

        // Assets
        mb.Entity<Asset>(e =>
        {
            e.HasIndex(a => a.AssetNumber).IsUnique();
            e.HasIndex(a => a.BranchId);
            e.HasIndex(a => a.Status);
            e.Property(a => a.Status).HasConversion<string>();
            e.Property(a => a.Value).HasColumnType("decimal(18,2)");
            e.Property(a => a.DepreciationPct).HasColumnType("decimal(5,2)");
            e.HasOne(a => a.Branch).WithMany().HasForeignKey(a => a.BranchId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(a => a.Category).WithMany().HasForeignKey(a => a.CategoryId).IsRequired(false).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(a => a.Location).WithMany().HasForeignKey(a => a.LocationId).IsRequired(false).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(a => a.ResponsibleUser).WithMany().HasForeignKey(a => a.ResponsibleUserId).IsRequired(false).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(a => a.CreatedBy).WithMany().HasForeignKey(a => a.CreatedById).OnDelete(DeleteBehavior.Restrict);
            e.HasMany(a => a.Movements).WithOne(m => m.Asset).HasForeignKey(m => m.AssetId);
            e.HasMany(a => a.Lendings).WithOne(l => l.Asset).HasForeignKey(l => l.AssetId);
            e.HasMany(a => a.Damages).WithOne(d => d.Asset).HasForeignKey(d => d.AssetId);
        });
        mb.Entity<AssetMovement>(e =>
        {
            e.HasIndex(m => m.AmvNumber).IsUnique();
            e.Property(m => m.Status).HasConversion<string>();
            e.HasOne(m => m.FromLocation).WithMany().HasForeignKey(m => m.FromLocationId).IsRequired(false).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(m => m.ToLocation).WithMany().HasForeignKey(m => m.ToLocationId).IsRequired(false).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(m => m.AcceptedBy).WithMany().HasForeignKey(m => m.AcceptedById).IsRequired(false).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(m => m.CreatedBy).WithMany().HasForeignKey(m => m.CreatedById).OnDelete(DeleteBehavior.Restrict);
        });
        mb.Entity<AssetLending>(e =>
        {
            e.HasIndex(l => l.LendingNumber).IsUnique();
            e.Property(l => l.Status).HasConversion<string>();
            e.HasOne(l => l.ToLocation).WithMany().HasForeignKey(l => l.ToLocationId).IsRequired(false).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(l => l.CreatedBy).WithMany().HasForeignKey(l => l.CreatedById).OnDelete(DeleteBehavior.Restrict);
        });
        mb.Entity<AssetDamage>(e =>
        {
            e.HasOne(d => d.ReportedBy).WithMany().HasForeignKey(d => d.ReportedById).OnDelete(DeleteBehavior.Restrict);
        });
    }

    public override Task<int> SaveChangesAsync(CancellationToken ct = default)
    {
        foreach (var entry in ChangeTracker.Entries<Domain.Common.BaseEntity>())
            if (entry.State == EntityState.Modified)
                entry.Entity.UpdatedAt = DateTime.UtcNow;
        return base.SaveChangesAsync(ct);
    }
}
