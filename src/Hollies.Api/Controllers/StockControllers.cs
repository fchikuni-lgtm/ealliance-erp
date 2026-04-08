// StockControllers.cs — eAlliance StockMaster API controllers
// Modules: Revenue Points, Stock Counts, SMV, Transfer Outs, Cash-Up,
//          Stock Sheets, Adjustments, Debtors, Close Day
using Hollies.Application.Common.Interfaces;
using Hollies.Application.Common.Models;
using Hollies.Domain.Entities;
using Hollies.Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Hollies.Api.Controllers;

// ── REVENUE POINTS ────────────────────────────────────────────────
[Route("api/revenue-points")]
[Authorize]
public class RevenuePointsController(IApplicationDbContext db, ICurrentUserService cu)
    : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] Guid? branchId,
        [FromQuery] bool? stockPointOnly, CancellationToken ct)
    {
        var q = db.RevenuePoints.Include(r => r.Branch).Where(r => r.Enabled).AsNoTracking();
        if (branchId.HasValue) q = q.Where(r => r.BranchId == branchId.Value);
        if (stockPointOnly == true) q = q.Where(r => r.IsStockPoint);
        var items = await q.OrderBy(r => r.Branch.Name).ThenBy(r => r.Name)
            .Select(r => new { r.Id, r.Name, r.BranchId, BranchName = r.Branch.Name, Type = r.Type.ToString(), r.IsStockPoint, r.Enabled })
            .ToListAsync(ct);
        return Ok(items);
    }

    [HttpPost]
    [Authorize(Roles = "Admin,BranchManager")]
    public async Task<IActionResult> Create([FromBody] CreateRevPtRequest req, CancellationToken ct)
    {
        var rp = new RevenuePoint
        {
            Name = req.Name, BranchId = req.BranchId,
            Type = Enum.Parse<RevenuePointType>(req.Type, true),
            IsStockPoint = req.IsStockPoint, Enabled = true
        };
        db.RevenuePoints.Add(rp);
        await db.SaveChangesAsync(ct);
        return Ok(new { rp.Id, rp.Name });
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(Guid id, [FromBody] CreateRevPtRequest req, CancellationToken ct)
    {
        var rp = await db.RevenuePoints.FindAsync([id], ct);
        if (rp == null) return NotFound();
        rp.Name = req.Name; rp.Type = Enum.Parse<RevenuePointType>(req.Type, true);
        rp.IsStockPoint = req.IsStockPoint;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPost("{id}/toggle")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Toggle(Guid id, CancellationToken ct)
    {
        var rp = await db.RevenuePoints.FindAsync([id], ct);
        if (rp == null) return NotFound();
        rp.Enabled = !rp.Enabled;
        await db.SaveChangesAsync(ct);
        return Ok(new { rp.Enabled });
    }
}

public record CreateRevPtRequest(string Name, Guid BranchId, string Type, bool IsStockPoint);

// ── STOCK COUNTS ──────────────────────────────────────────────────
[Route("api/stock-counts")]
[Authorize]
public class StockCountsController(IApplicationDbContext db, ICurrentUserService cu,
    ISequenceService seq) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] Guid? branchId, [FromQuery] Guid? rpId,
        [FromQuery] string? from, [FromQuery] string? to,
        [FromQuery] string? type, [FromQuery] int page = 1, CancellationToken ct = default)
    {
        var q = db.StockCounts
            .Include(s => s.Branch).Include(s => s.RevenuePoint).Include(s => s.CreatedBy)
            .AsNoTracking();
        if (branchId.HasValue) q = q.Where(s => s.BranchId == branchId.Value);
        if (rpId.HasValue) q = q.Where(s => s.RevenuePointId == rpId.Value);
        if (!string.IsNullOrEmpty(from)) q = q.Where(s => s.Date >= DateOnly.Parse(from));
        if (!string.IsNullOrEmpty(to))   q = q.Where(s => s.Date <= DateOnly.Parse(to));
        if (!string.IsNullOrEmpty(type)) q = q.Where(s => s.Type.ToString() == type);
        var total = await q.CountAsync(ct);
        var items = await q.OrderByDescending(s => s.Date).ThenByDescending(s => s.CreatedAt)
            .Skip((page-1)*50).Take(50)
            .Select(s => new {
                s.Id, s.CountNumber, s.Date, BranchName = s.Branch.Name,
                RpName = s.RevenuePoint.Name, Type = s.Type.ToString(),
                Method = s.CountMethod.ToString(), s.IsFinalised,
                CreatedBy = s.CreatedBy.Name, s.CreatedAt
            }).ToListAsync(ct);
        return Ok(new PagedResult<object>(items.Cast<object>().ToList(), total, page, 50));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var s = await db.StockCounts
            .Include(x => x.Branch).Include(x => x.RevenuePoint)
            .Include(x => x.Items).ThenInclude(i => i.Product)
            .Include(x => x.CreatedBy)
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id, ct);
        if (s == null) return NotFound();
        return Ok(new {
            s.Id, s.CountNumber, s.Date, s.BranchId, BranchName = s.Branch.Name,
            s.RevenuePointId, RpName = s.RevenuePoint.Name,
            Type = s.Type.ToString(), Method = s.CountMethod.ToString(),
            s.CopiedFromDate, s.IsFinalised, CreatedBy = s.CreatedBy.Name, s.CreatedAt,
            Items = s.Items.Select(i => new {
                i.Id, i.ProductId, ProductName = i.Product.Name,
                i.Product.SubName, i.Qty, i.Tag,
                i.Product.CostPrice, i.Product.SellingPrice,
                CostValue = i.Qty * i.Product.CostPrice,
                SellValue = i.Qty * i.Product.SellingPrice
            }).ToList()
        });
    }

    [HttpGet("prev-closing")]
    public async Task<IActionResult> GetPrevClosing(
        [FromQuery] Guid branchId, [FromQuery] Guid rpId, [FromQuery] string date, CancellationToken ct)
    {
        var d = DateOnly.Parse(date).AddDays(-1);
        var prev = await db.StockCounts
            .Include(s => s.Items).ThenInclude(i => i.Product)
            .Where(s => s.BranchId == branchId && s.RevenuePointId == rpId
                     && s.Date == d && s.Type == StockCountType.Closing && s.IsFinalised)
            .AsNoTracking()
            .FirstOrDefaultAsync(ct);
        if (prev == null) return Ok(null);
        return Ok(new {
            prev.Id, prev.Date,
            Items = prev.Items.Where(i => i.Tag == "final")
                .Select(i => new { i.ProductId, ProductName = i.Product.Name, i.Qty }).ToList()
        });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateStockCountRequest req, CancellationToken ct)
    {
        var num = await seq.NextStockCountNumberAsync();
        var count = new StockCount
        {
            CountNumber = num, BranchId = req.BranchId,
            RevenuePointId = req.RevenuePointId, Date = DateOnly.Parse(req.Date),
            Type = Enum.Parse<StockCountType>(req.Type, true),
            CountMethod = Enum.Parse<StockCountMethod>(req.CountMethod, true),
            CopiedFromDate = req.CopiedFromDate != null ? DateOnly.Parse(req.CopiedFromDate) : null,
            IsFinalised = false, CreatedById = cu.UserId
        };
        foreach (var item in req.Items)
            count.Items.Add(new StockCountItem
            {
                ProductId = item.ProductId, Qty = item.Qty, Tag = item.Tag
            });
        db.StockCounts.Add(count);
        await db.SaveChangesAsync(ct);
        return Ok(new { count.Id, count.CountNumber });
    }

    [HttpPost("{id}/finalise")]
    public async Task<IActionResult> Finalise(Guid id, CancellationToken ct)
    {
        var count = await db.StockCounts.FindAsync([id], ct);
        if (count == null) return NotFound();
        count.IsFinalised = true;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}

public record CreateStockCountRequest(
    Guid BranchId, Guid RevenuePointId, string Date,
    string Type, string CountMethod, string? CopiedFromDate,
    List<StockCountItemInput> Items);
public record StockCountItemInput(Guid ProductId, decimal Qty, string Tag);

// ── STOCK MOVEMENTS (SMV) ─────────────────────────────────────────
[Route("api/smv")]
[Authorize]
public class SmvController(IApplicationDbContext db, ICurrentUserService cu,
    ISequenceService seq) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] Guid? branchId, [FromQuery] string? status,
        [FromQuery] string? from, [FromQuery] string? to, [FromQuery] int page = 1,
        CancellationToken ct = default)
    {
        var q = db.Smvs.Include(s => s.Branch).Include(s => s.CreatedBy)
            .Include(s => s.Items).ThenInclude(i => i.Product)
            .AsNoTracking();
        if (branchId.HasValue) q = q.Where(s => s.BranchId == branchId.Value);
        if (!string.IsNullOrEmpty(status)) q = q.Where(s => s.Status.ToString() == status);
        if (!string.IsNullOrEmpty(from)) q = q.Where(s => s.Date >= DateOnly.Parse(from));
        if (!string.IsNullOrEmpty(to))   q = q.Where(s => s.Date <= DateOnly.Parse(to));
        var total = await q.CountAsync(ct);
        var items = await q.OrderByDescending(s => s.Date).ThenByDescending(s => s.CreatedAt)
            .Skip((page-1)*50).Take(50)
            .Select(s => new {
                s.Id, s.SmvNumber, s.Date, BranchName = s.Branch.Name,
                s.FromWarehouse, FromRpName = s.FromRevenuePoint != null ? s.FromRevenuePoint.Name : null,
                s.ToWarehouse, ToRpName = s.ToRevenuePoint != null ? s.ToRevenuePoint.Name : null,
                Status = s.Status.ToString(), s.IsCrossBranch,
                TotalCost = s.Items.Sum(i => i.Qty * i.CostPrice),
                TotalSell = s.Items.Sum(i => i.Qty * i.SellingPrice),
                CreatedBy = s.CreatedBy.Name, s.CreatedAt
            }).ToListAsync(ct);
        return Ok(new PagedResult<object>(items.Cast<object>().ToList(), total, page, 50));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var s = await db.Smvs
            .Include(x => x.Branch).Include(x => x.FromRevenuePoint)
            .Include(x => x.ToRevenuePoint).Include(x => x.CreatedBy).Include(x => x.ApprovedBy)
            .Include(x => x.Items).ThenInclude(i => i.Product)
            .AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        if (s == null) return NotFound();
        return Ok(s);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateSmvRequest req, CancellationToken ct)
    {
        var num = await seq.NextSmvNumberAsync();
        var smv = new Smv
        {
            SmvNumber = num, BranchId = req.BranchId, Date = DateOnly.Parse(req.Date),
            FromRevenuePointId = req.FromRevenuePointId, FromWarehouse = req.FromWarehouse,
            ToRevenuePointId = req.ToRevenuePointId, ToWarehouse = req.ToWarehouse,
            IsCrossBranch = req.IsCrossBranch,
            Status = req.IsCrossBranch ? SmvStatus.Pending : SmvStatus.Approved,
            CreatedById = cu.UserId
        };
        foreach (var item in req.Items)
            smv.Items.Add(new SmvItem
            {
                ProductId = item.ProductId, Qty = item.Qty,
                CostPrice = item.CostPrice, SellingPrice = item.SellingPrice
            });
        db.Smvs.Add(smv);
        await db.SaveChangesAsync(ct);
        return Ok(new { smv.Id, smv.SmvNumber });
    }

    [HttpPost("{id}/approve")]
    [Authorize(Roles = "Admin,BranchManager,AccountsManager")]
    public async Task<IActionResult> Approve(Guid id, CancellationToken ct)
    {
        var smv = await db.Smvs.FindAsync([id], ct);
        if (smv == null) return NotFound();
        smv.Status = SmvStatus.Approved;
        smv.ApprovedById = cu.UserId;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPost("{id}/reject")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Reject(Guid id, [FromBody] RejectRequest req, CancellationToken ct)
    {
        var smv = await db.Smvs.FindAsync([id], ct);
        if (smv == null) return NotFound();
        smv.Status = SmvStatus.Rejected;
        smv.RejectionReason = req.Reason;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}

public record CreateSmvRequest(
    Guid BranchId, string Date,
    Guid? FromRevenuePointId, string? FromWarehouse,
    Guid? ToRevenuePointId, string? ToWarehouse,
    bool IsCrossBranch, List<SmvItemInput> Items);
public record SmvItemInput(Guid ProductId, decimal Qty, decimal CostPrice, decimal SellingPrice);
public record RejectRequest(string Reason);

// ── TRANSFER OUTS ─────────────────────────────────────────────────
[Route("api/transfer-outs")]
[Authorize]
public class TransferOutsController(IApplicationDbContext db, ICurrentUserService cu,
    ISequenceService seq) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] Guid? branchId, [FromQuery] string? type, [FromQuery] string? status,
        [FromQuery] string? from, [FromQuery] string? to, [FromQuery] int page = 1,
        CancellationToken ct = default)
    {
        var q = db.TransferOuts
            .Include(t => t.Branch).Include(t => t.RevenuePoint)
            .Include(t => t.Items).ThenInclude(i => i.Product)
            .Include(t => t.CreatedBy).AsNoTracking();
        if (branchId.HasValue) q = q.Where(t => t.BranchId == branchId.Value);
        if (!string.IsNullOrEmpty(type))   q = q.Where(t => t.Type.ToString() == type);
        if (!string.IsNullOrEmpty(status)) q = q.Where(t => t.Status.ToString() == status);
        if (!string.IsNullOrEmpty(from)) q = q.Where(t => t.Date >= DateOnly.Parse(from));
        if (!string.IsNullOrEmpty(to))   q = q.Where(t => t.Date <= DateOnly.Parse(to));
        var total = await q.CountAsync(ct);
        var items = await q.OrderByDescending(t => t.Date).ThenByDescending(t => t.CreatedAt)
            .Skip((page-1)*50).Take(50)
            .Select(t => new {
                t.Id, t.ToNumber, t.Date, BranchName = t.Branch.Name,
                RpName = t.RevenuePoint.Name, Type = t.Type.ToString(),
                Status = t.Status.ToString(), t.BeneficiaryName,
                TotalCost = t.Items.Sum(i => i.Qty * i.CostPrice),
                TotalSell = t.Items.Sum(i => i.Qty * i.SellingPrice),
                CreatedBy = t.CreatedBy.Name, t.CreatedAt
            }).ToListAsync(ct);
        return Ok(new PagedResult<object>(items.Cast<object>().ToList(), total, page, 50));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var t = await db.TransferOuts
            .Include(x => x.Branch).Include(x => x.RevenuePoint)
            .Include(x => x.CreatedBy).Include(x => x.ApprovedBy)
            .Include(x => x.Items).ThenInclude(i => i.Product)
            .AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        if (t == null) return NotFound();
        return Ok(t);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateToRequest req, CancellationToken ct)
    {
        var num = await seq.NextTransferOutNumberAsync();
        var to = new TransferOut
        {
            ToNumber = num, BranchId = req.BranchId,
            RevenuePointId = req.RevenuePointId, Date = DateOnly.Parse(req.Date),
            Type = Enum.Parse<TransferOutType>(req.Type, true),
            BeneficiaryName = req.BeneficiaryName,
            // Breakage and Ullage auto-approved; others need approval
            Status = req.Type is "Breakage" or "Ullage"
                ? TransferOutStatus.Approved : TransferOutStatus.Pending,
            CreatedById = cu.UserId
        };
        foreach (var item in req.Items)
            to.Items.Add(new TransferOutItem
            {
                ProductId = item.ProductId, Qty = item.Qty,
                CostPrice = item.CostPrice, SellingPrice = item.SellingPrice
            });
        db.TransferOuts.Add(to);

        // Auto-create/update debtor record if type = Debtor
        if (req.Type == "Debtor" && !string.IsNullOrWhiteSpace(req.BeneficiaryName))
        {
            var debtor = await db.Debtors.FirstOrDefaultAsync(
                d => d.BranchId == req.BranchId && d.Name == req.BeneficiaryName, ct);
            if (debtor == null)
            {
                debtor = new Debtor
                {
                    BranchId = req.BranchId, Name = req.BeneficiaryName,
                    CreatedById = cu.UserId
                };
                db.Debtors.Add(debtor);
            }
            var totalCost = req.Items.Sum(i => i.Qty * i.CostPrice);
            debtor.Balance += totalCost;
            db.DebtorTransactions.Add(new DebtorTransaction
            {
                Debtor = debtor, Type = DebtorTransactionType.Charge,
                Amount = totalCost, ReferenceId = num, ReferenceType = "TransferOut",
                Date = DateOnly.Parse(req.Date), RunningBalance = debtor.Balance,
                CreatedById = cu.UserId
            });
        }

        await db.SaveChangesAsync(ct);
        return Ok(new { to.Id, to.ToNumber });
    }

    [HttpPost("{id}/approve")]
    [Authorize(Roles = "Admin,BranchManager,AccountsManager")]
    public async Task<IActionResult> Approve(Guid id, CancellationToken ct)
    {
        var t = await db.TransferOuts.FindAsync([id], ct);
        if (t == null) return NotFound();
        t.Status = TransferOutStatus.Approved; t.ApprovedById = cu.UserId;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPost("{id}/reject")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Reject(Guid id, [FromBody] RejectRequest req, CancellationToken ct)
    {
        var t = await db.TransferOuts.FindAsync([id], ct);
        if (t == null) return NotFound();
        t.Status = TransferOutStatus.Rejected; t.RejectionReason = req.Reason;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}

public record CreateToRequest(
    Guid BranchId, Guid RevenuePointId, string Date, string Type,
    string? BeneficiaryName, List<ToItemInput> Items);
public record ToItemInput(Guid ProductId, decimal Qty, decimal CostPrice, decimal SellingPrice);

// ── CASH-UP ───────────────────────────────────────────────────────
[Route("api/cash-ups")]
[Authorize]
public class CashUpsController(IApplicationDbContext db, ICurrentUserService cu,
    ISequenceService seq) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] Guid? branchId, [FromQuery] string? status,
        [FromQuery] string? from, [FromQuery] string? to, [FromQuery] int page = 1,
        CancellationToken ct = default)
    {
        var q = db.CashUps.Include(c => c.Branch).Include(c => c.PaymentMethod)
            .Include(c => c.CreatedBy).AsNoTracking();
        if (branchId.HasValue) q = q.Where(c => c.BranchId == branchId.Value);
        if (!string.IsNullOrEmpty(status)) q = q.Where(c => c.Status.ToString() == status);
        if (!string.IsNullOrEmpty(from)) q = q.Where(c => c.Date >= DateOnly.Parse(from));
        if (!string.IsNullOrEmpty(to))   q = q.Where(c => c.Date <= DateOnly.Parse(to));
        var total = await q.CountAsync(ct);
        var items = await q.OrderByDescending(c => c.Date).Skip((page-1)*50).Take(50)
            .Select(c => new {
                c.Id, c.CaNumber, c.Date, BranchName = c.Branch.Name,
                PmName = c.PaymentMethod.Name, c.TotalUsd, Status = c.Status.ToString(),
                CreatedBy = c.CreatedBy.Name, c.CreatedAt
            }).ToListAsync(ct);
        return Ok(new PagedResult<object>(items.Cast<object>().ToList(), total, page, 50));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var c = await db.CashUps
            .Include(x => x.Branch).Include(x => x.PaymentMethod)
            .Include(x => x.CreatedBy).Include(x => x.ApprovedBy)
            .Include(x => x.Entries).ThenInclude(e => e.RevenuePoint)
            .Include(x => x.Entries).ThenInclude(e => e.Cashier)
            .AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        if (c == null) return NotFound();
        return Ok(c);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCashUpRequest req, CancellationToken ct)
    {
        var num = await seq.NextCashUpNumberAsync();
        var totalUsd = req.Entries.Sum(e => e.AmountUsd);
        var cu2 = new CashUp
        {
            CaNumber = num, BranchId = req.BranchId, Date = DateOnly.Parse(req.Date),
            PaymentMethodId = req.PaymentMethodId, TotalUsd = totalUsd,
            Status = CashUpStatus.Pending, CreatedById = cu.UserId
        };
        foreach (var e in req.Entries)
            cu2.Entries.Add(new CashUpEntry
            {
                RevenuePointId = e.RevenuePointId, CashierId = e.CashierId,
                CurrencyCode = e.CurrencyCode, Amount = e.Amount, AmountUsd = e.AmountUsd
            });
        db.CashUps.Add(cu2);
        await db.SaveChangesAsync(ct);
        return Ok(new { cu2.Id, cu2.CaNumber });
    }

    [HttpPost("{id}/approve")]
    [Authorize(Roles = "Admin,AccountsManager,BranchManager")]
    public async Task<IActionResult> Approve(Guid id, CancellationToken ct)
    {
        var cashUp = await db.CashUps.Include(c => c.PaymentMethod).FirstOrDefaultAsync(c => c.Id == id, ct);
        if (cashUp == null) return NotFound();
        cashUp.Status = CashUpStatus.Approved;
        cashUp.ApprovedById = cu.UserId;

        // Update payment method balance — same as income approval
        cashUp.PaymentMethod.Balance += cashUp.TotalUsd;
        cashUp.PaymentMethod.IncomeTotal += cashUp.TotalUsd;

        // Auto-create income record
        db.Incomes.Add(new Income
        {
            IncomeNumber = $"CA-{cashUp.CaNumber}",
            Date = cashUp.Date, Source = $"Cash-Up {cashUp.CaNumber}",
            PaymentMethodId = cashUp.PaymentMethodId,
            Currency = Domain.Enums.Currency.USD,
            Amount = cashUp.TotalUsd,
            Status = IncomeStatus.Approved,
            ApprovedById = cu.UserId,
            CreatedById = cu.UserId
        });

        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPost("{id}/reject")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Reject(Guid id, [FromBody] RejectRequest req, CancellationToken ct)
    {
        var cashUp = await db.CashUps.FindAsync([id], ct);
        if (cashUp == null) return NotFound();
        cashUp.Status = CashUpStatus.Rejected;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}

public record CreateCashUpRequest(
    Guid BranchId, string Date, Guid PaymentMethodId,
    List<CashUpEntryInput> Entries);
public record CashUpEntryInput(
    Guid RevenuePointId, Guid? CashierId, string CurrencyCode, decimal Amount, decimal AmountUsd);

// ── STOCK SHEETS ──────────────────────────────────────────────────
// THE MOST IMPORTANT PAGE — Mr BC reviews daily
// Exact formula implemented per spec
[Route("api/stock-sheets")]
[Authorize]
public class StockSheetsController(IApplicationDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(
        [FromQuery] Guid branchId, [FromQuery] Guid revenuePointId,
        [FromQuery] string date, CancellationToken ct)
    {
        var d = DateOnly.Parse(date);
        var prevDate = d.AddDays(-1);

        // Get all products for this revenue point that should appear
        var allProducts = await db.Products.Where(p => p.Active).AsNoTracking().ToListAsync(ct);

        // OPENING = finalised closing count from previous day OR fresh opening count
        var openingCount = await db.StockCounts
            .Include(s => s.Items)
            .Where(s => s.BranchId == branchId && s.RevenuePointId == revenuePointId
                     && s.Type == StockCountType.Closing && s.Date == prevDate && s.IsFinalised)
            .AsNoTracking().FirstOrDefaultAsync(ct);

        if (openingCount == null)
        {
            // Check for fresh opening count
            openingCount = await db.StockCounts
                .Include(s => s.Items)
                .Where(s => s.BranchId == branchId && s.RevenuePointId == revenuePointId
                         && s.Type == StockCountType.Opening && s.Date == d && s.IsFinalised)
                .AsNoTracking().FirstOrDefaultAsync(ct);
        }

        // SMV IN (received by this RP today) — approved + unapproved (not rejected)
        var smvIn = await db.Smvs
            .Include(s => s.Items).ThenInclude(i => i.Product)
            .Where(s => s.ToRevenuePointId == revenuePointId
                     && s.Date == d && s.Status != SmvStatus.Rejected)
            .AsNoTracking().ToListAsync(ct);

        // SMV OUT (sent FROM this RP today) — approved + unapproved (not rejected)
        var smvOut = await db.Smvs
            .Include(s => s.Items).ThenInclude(i => i.Product)
            .Where(s => s.FromRevenuePointId == revenuePointId
                     && s.Date == d && s.Status != SmvStatus.Rejected)
            .AsNoTracking().ToListAsync(ct);

        // TRANSFER OUTS by type — not rejected
        var transferOuts = await db.TransferOuts
            .Include(t => t.Items).ThenInclude(i => i.Product)
            .Where(t => t.RevenuePointId == revenuePointId
                     && t.Date == d && t.Status != TransferOutStatus.Rejected)
            .AsNoTracking().ToListAsync(ct);

        // ADJUSTMENTS — all (approved or unapproved, but not rejected)
        var adjustments = await db.StockAdjustments
            .Include(a => a.Product)
            .Where(a => a.RevenuePointId == revenuePointId && a.Date == d
                     && a.Status != AdjustmentStatus.Rejected)
            .AsNoTracking().ToListAsync(ct);

        // CLOSING COUNT (finalised closing count for today)
        var closingCount = await db.StockCounts
            .Include(s => s.Items)
            .Where(s => s.BranchId == branchId && s.RevenuePointId == revenuePointId
                     && s.Type == StockCountType.Closing && s.Date == d && s.IsFinalised)
            .AsNoTracking().FirstOrDefaultAsync(ct);

        // CASH-UP for this RP today (sum of all entries for this RP)
        var cashUpEntries = await db.CashUpEntries
            .Where(e => e.RevenuePointId == revenuePointId
                     && e.CashUp.BranchId == branchId && e.CashUp.Date == d
                     && e.CashUp.Status != CashUpStatus.Rejected)
            .AsNoTracking().SumAsync(e => e.AmountUsd, ct);

        // Build per-product rows
        var rows = new List<StockSheetRow>();
        foreach (var product in allProducts)
        {
            var opening = openingCount?.Items.Where(i => i.ProductId == product.Id && i.Tag == "final")
                              .Sum(i => i.Qty) ?? 0;
            var smvInQty = smvIn.SelectMany(s => s.Items).Where(i => i.ProductId == product.Id)
                               .Sum(i => i.Qty);
            var smvOutQty = smvOut.SelectMany(s => s.Items).Where(i => i.ProductId == product.Id)
                                .Sum(i => i.Qty);
            var debtors = transferOuts.Where(t => t.Type == TransferOutType.Debtor)
                              .SelectMany(t => t.Items).Where(i => i.ProductId == product.Id).Sum(i => i.Qty);
            var compliments = transferOuts.Where(t => t.Type == TransferOutType.Compliment)
                              .SelectMany(t => t.Items).Where(i => i.ProductId == product.Id).Sum(i => i.Qty);
            var breakages = transferOuts.Where(t => t.Type == TransferOutType.Breakage)
                              .SelectMany(t => t.Items).Where(i => i.ProductId == product.Id).Sum(i => i.Qty);
            var ullages = transferOuts.Where(t => t.Type == TransferOutType.Ullage)
                              .SelectMany(t => t.Items).Where(i => i.ProductId == product.Id).Sum(i => i.Qty);
            var adjIncrease = adjustments.Where(a => a.ProductId == product.Id && a.Direction == AdjustmentDirection.Increase)
                                  .Sum(a => a.Qty);
            var adjReduce = adjustments.Where(a => a.ProductId == product.Id && a.Direction == AdjustmentDirection.Reduce)
                                .Sum(a => a.Qty);
            var adj = adjIncrease - adjReduce;
            var closing = closingCount?.Items.Where(i => i.ProductId == product.Id && i.Tag == "final")
                              .Sum(i => i.Qty) ?? (decimal?)null;

            // Exact formula
            var total = opening + smvInQty;
            var theoretical = total - debtors - compliments - breakages - ullages - smvOutQty + adj;
            var sold = closing.HasValue ? theoretical - closing.Value : (decimal?)null;
            var salesValue = sold.HasValue ? sold.Value * product.SellingPrice : (decimal?)null;

            // Skip products with no activity (zero everything)
            if (opening == 0 && smvInQty == 0 && smvOutQty == 0 && debtors == 0
                && compliments == 0 && breakages == 0 && ullages == 0 && adj == 0 && closing == null)
                continue;

            rows.Add(new StockSheetRow(
                product.Id, product.Name, product.SubName,
                product.CostPrice, product.SellingPrice,
                opening, smvInQty, total, debtors, compliments, breakages, ullages,
                smvOutQty, adj, theoretical, closing, sold, salesValue
            ));
        }

        // Pending items flags
        var hasPendingSmv = smvIn.Any(s => s.Status == SmvStatus.Pending)
                         || smvOut.Any(s => s.Status == SmvStatus.Pending);
        var hasPendingTo = transferOuts.Any(t => t.Status == TransferOutStatus.Pending);
        var hasPendingAdj = adjustments.Any(a => a.Status == AdjustmentStatus.Pending);

        // Adjustment notes for bottom panel
        var adjNotes = adjustments.Select(a => new {
            ProductName = a.Product.Name,
            a.Qty, Direction = a.Direction.ToString(),
            a.Reason, Status = a.Status.ToString(), a.CreatedAt
        }).ToList();

        return Ok(new {
            branchId, revenuePointId, date,
            rows,
            summary = new {
                totalSalesValue = rows.Sum(r => r.SalesValue ?? 0),
                totalCashUp = cashUpEntries,
                variance = rows.Sum(r => r.SalesValue ?? 0) - cashUpEntries
            },
            flags = new { hasPendingSmv, hasPendingTo, hasPendingAdj },
            adjustmentNotes = adjNotes
        });
    }
}

public record StockSheetRow(
    Guid ProductId, string ProductName, string? SubName,
    decimal CostPrice, decimal SellingPrice,
    decimal Opening, decimal SmvIn, decimal Total,
    decimal Debtors, decimal Compliments, decimal Breakages, decimal Ullages,
    decimal SmvOut, decimal Adj, decimal Theoretical,
    decimal? Closing, decimal? Sold, decimal? SalesValue);

// ── STOCK ADJUSTMENTS ─────────────────────────────────────────────
[Route("api/adjustments")]
[Authorize(Roles = "Admin,Adjuster")]
public class AdjustmentsController(IApplicationDbContext db, ICurrentUserService cu)
    : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] Guid? branchId, [FromQuery] string? status,
        [FromQuery] string? from, [FromQuery] string? to,
        [FromQuery] int page = 1, CancellationToken ct = default)
    {
        var q = db.StockAdjustments
            .Include(a => a.Branch).Include(a => a.RevenuePoint)
            .Include(a => a.Product).Include(a => a.CreatedBy)
            .AsNoTracking();
        if (branchId.HasValue) q = q.Where(a => a.BranchId == branchId.Value);
        if (!string.IsNullOrEmpty(status)) q = q.Where(a => a.Status.ToString() == status);
        if (!string.IsNullOrEmpty(from)) q = q.Where(a => a.Date >= DateOnly.Parse(from));
        if (!string.IsNullOrEmpty(to))   q = q.Where(a => a.Date <= DateOnly.Parse(to));
        var total = await q.CountAsync(ct);
        var items = await q.OrderByDescending(a => a.Date).Skip((page-1)*50).Take(50)
            .Select(a => new {
                a.Id, a.Date, BranchName = a.Branch.Name, RpName = a.RevenuePoint.Name,
                ProductName = a.Product.Name, a.Qty, Direction = a.Direction.ToString(),
                a.Reason, Status = a.Status.ToString(), CreatedBy = a.CreatedBy.Name, a.CreatedAt
            }).ToListAsync(ct);
        return Ok(new PagedResult<object>(items.Cast<object>().ToList(), total, page, 50));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateAdjRequest req, CancellationToken ct)
    {
        var adj = new StockAdjustment
        {
            BranchId = req.BranchId, RevenuePointId = req.RevenuePointId,
            ProductId = req.ProductId, Date = DateOnly.Parse(req.Date),
            Qty = req.Qty, Direction = Enum.Parse<AdjustmentDirection>(req.Direction, true),
            Reason = req.Reason, Status = AdjustmentStatus.Pending,
            CreatedById = cu.UserId
        };
        db.StockAdjustments.Add(adj);
        await db.SaveChangesAsync(ct);
        return Ok(new { adj.Id });
    }

    [HttpPost("{id}/approve")]
    [Authorize(Roles = "Admin,BranchManager")]
    public async Task<IActionResult> Approve(Guid id, CancellationToken ct)
    {
        var adj = await db.StockAdjustments.FindAsync([id], ct);
        if (adj == null) return NotFound();
        adj.Status = AdjustmentStatus.Approved; adj.ApprovedById = cu.UserId;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPost("{id}/reject")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Reject(Guid id, [FromBody] RejectRequest req, CancellationToken ct)
    {
        var adj = await db.StockAdjustments.FindAsync([id], ct);
        if (adj == null) return NotFound();
        adj.Status = AdjustmentStatus.Rejected;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}

public record CreateAdjRequest(
    Guid BranchId, Guid RevenuePointId, Guid ProductId,
    string Date, decimal Qty, string Direction, string Reason);

// ── DEBTORS ───────────────────────────────────────────────────────
[Route("api/debtors")]
[Authorize]
public class DebtorsController(IApplicationDbContext db, ICurrentUserService cu)
    : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] Guid? branchId, [FromQuery] string? search,
        [FromQuery] bool? hasBalance, [FromQuery] int page = 1,
        CancellationToken ct = default)
    {
        var q = db.Debtors.Include(d => d.Branch).Where(d => d.Active).AsNoTracking();
        if (branchId.HasValue) q = q.Where(d => d.BranchId == branchId.Value);
        if (!string.IsNullOrEmpty(search))
            q = q.Where(d => d.Name.Contains(search) || (d.Phone != null && d.Phone.Contains(search)));
        if (hasBalance == true) q = q.Where(d => d.Balance > 0);
        if (hasBalance == false) q = q.Where(d => d.Balance <= 0);
        var total = await q.CountAsync(ct);
        var items = await q.OrderByDescending(d => d.Balance).Skip((page-1)*50).Take(50)
            .Select(d => new {
                d.Id, d.Name, d.Phone, BranchName = d.Branch.Name,
                d.Balance, d.CreditLimit, d.CreatedAt
            }).ToListAsync(ct);
        return Ok(new PagedResult<object>(items.Cast<object>().ToList(), total, page, 50));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var d = await db.Debtors
            .Include(x => x.Branch).Include(x => x.CreatedBy)
            .Include(x => x.Transactions.OrderByDescending(t => t.Date).Take(100))
            .AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        if (d == null) return NotFound();
        return Ok(d);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateDebtorRequest req, CancellationToken ct)
    {
        var d = new Debtor
        {
            BranchId = req.BranchId, Name = req.Name, Phone = req.Phone,
            CreditLimit = req.CreditLimit, CreatedById = cu.UserId
        };
        db.Debtors.Add(d);
        await db.SaveChangesAsync(ct);
        return Ok(new { d.Id });
    }

    [HttpPost("{id}/payment")]
    public async Task<IActionResult> RecordPayment(Guid id, [FromBody] DebtorPaymentRequest req, CancellationToken ct)
    {
        var debtor = await db.Debtors.FindAsync([id], ct);
        if (debtor == null) return NotFound();
        debtor.Balance -= req.Amount;
        db.DebtorTransactions.Add(new DebtorTransaction
        {
            DebtorId = id, Type = DebtorTransactionType.Payment,
            Amount = req.Amount, Date = DateOnly.Parse(req.Date),
            Notes = req.Notes, RunningBalance = debtor.Balance,
            CreatedById = cu.UserId
        });
        await db.SaveChangesAsync(ct);
        return Ok(new { newBalance = debtor.Balance });
    }
}

public record CreateDebtorRequest(Guid BranchId, string Name, string? Phone, decimal CreditLimit);
public record DebtorPaymentRequest(decimal Amount, string Date, string? Notes);

// ── CLOSE DAY ────────────────────────────────────────────────────
[Route("api/close-day")]
[Authorize(Roles = "Admin,BranchManager")]
public class CloseDayController(IApplicationDbContext db, ICurrentUserService cu)
    : ControllerBase
{
    [HttpGet("status")]
    public async Task<IActionResult> GetStatus(
        [FromQuery] Guid branchId, [FromQuery] string date, CancellationToken ct)
    {
        var d = DateOnly.Parse(date);
        var closed = await db.ClosedDays
            .Where(c => c.BranchId == branchId && c.Date == d)
            .AsNoTracking().FirstOrDefaultAsync(ct);

        // Checklist
        var rps = await db.RevenuePoints
            .Where(r => r.BranchId == branchId && r.Enabled && r.IsStockPoint)
            .AsNoTracking().ToListAsync(ct);

        var closingCounts = await db.StockCounts
            .Where(s => s.BranchId == branchId && s.Date == d && s.Type == StockCountType.Closing && s.IsFinalised)
            .Select(s => s.RevenuePointId).ToListAsync(ct);

        var cashUps = await db.CashUps
            .Where(c => c.BranchId == branchId && c.Date == d && c.Status != CashUpStatus.Rejected)
            .Select(c => c.Id).ToListAsync(ct);

        var pendingExpenses = await db.Expenses
            .CountAsync(e => e.Status == ExpenseStatus.Pending && !e.IsReversed, ct);
        var pendingSmvs = await db.Smvs
            .CountAsync(s => s.BranchId == branchId && s.Date == d && s.Status == SmvStatus.Pending, ct);
        var openFlags = await db.Expenses.CountAsync(e => e.IsFlagged && !e.IsReversed, ct)
                      + await db.Grvs.CountAsync(g => g.IsFlagged, ct);

        return Ok(new {
            isClosed = closed != null,
            closedAt = closed?.ClosedAt,
            closedBy = closed?.ClosedById,
            reopenedAt = closed?.ReopenedAt,
            checklist = new {
                closingCountsDone = rps.All(r => closingCounts.Contains(r.Id)),
                cashUpDone = cashUps.Count >= rps.Count,
                noPendingExpenses = pendingExpenses == 0,
                noPendingSmvs = pendingSmvs == 0,
                noOpenFlags = openFlags == 0
            }
        });
    }

    [HttpPost]
    public async Task<IActionResult> CloseDay([FromBody] CloseDayRequest req, CancellationToken ct)
    {
        var d = DateOnly.Parse(req.Date);
        var existing = await db.ClosedDays
            .FirstOrDefaultAsync(c => c.BranchId == req.BranchId && c.Date == d, ct);
        if (existing != null)
            return BadRequest(new { message = "Day already closed." });

        db.ClosedDays.Add(new ClosedDay
        {
            BranchId = req.BranchId, Date = d,
            ClosedById = cu.UserId, ClosedAt = DateTime.UtcNow, Notes = req.Notes
        });
        await db.SaveChangesAsync(ct);
        return Ok(new { message = "Day closed successfully." });
    }

    [HttpPost("reopen")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> ReopenDay([FromBody] ReopenDayRequest req, CancellationToken ct)
    {
        var d = DateOnly.Parse(req.Date);
        var closed = await db.ClosedDays
            .FirstOrDefaultAsync(c => c.BranchId == req.BranchId && c.Date == d, ct);
        if (closed == null) return NotFound();
        closed.ReopenedById = cu.UserId;
        closed.ReopenedAt = DateTime.UtcNow;
        closed.Notes = (closed.Notes ?? "") + $" | Reopened: {req.Reason}";
        await db.SaveChangesAsync(ct);
        return Ok(new { message = "Day reopened." });
    }
}

public record CloseDayRequest(Guid BranchId, string Date, string? Notes);
public record ReopenDayRequest(Guid BranchId, string Date, string Reason);
