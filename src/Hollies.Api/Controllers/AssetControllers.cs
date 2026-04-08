// AssetControllers.cs — Asset Register module for eAlliance ERP
// Tracks physical assets, movements, lending, damage and disposal
using Hollies.Application.Common.Interfaces;
using Hollies.Application.Common.Models;
using Hollies.Domain.Entities;
using Hollies.Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Hollies.Api.Controllers;

// ── ASSET LOCATIONS ───────────────────────────────────────────────
[Route("api/assets/locations")]
[Authorize]
public class AssetLocationsController(IApplicationDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] Guid? branchId, CancellationToken ct)
    {
        var q = db.AssetLocations.Where(l => l.Active).AsNoTracking();
        if (branchId.HasValue) q = q.Where(l => l.BranchId == branchId.Value);
        var items = await q.OrderBy(l => l.Level).ThenBy(l => l.Name)
            .Select(l => new { l.Id, l.Name, l.BranchId, l.ParentId, l.Level, l.Active })
            .ToListAsync(ct);
        return Ok(items);
    }

    [HttpPost]
    [Authorize(Roles = "Admin,AssetManager")]
    public async Task<IActionResult> Create([FromBody] CreateLocationRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { message = "Location name is required." });
        var level = req.ParentId.HasValue
            ? (await db.AssetLocations.FirstOrDefaultAsync(l => l.Id == req.ParentId, ct))?.Level + 1 ?? 0
            : 0;
        var loc = new AssetLocation
        {
            Name = req.Name.Trim(), BranchId = req.BranchId, ParentId = req.ParentId, Level = level
        };
        db.AssetLocations.Add(loc);
        await db.SaveChangesAsync(ct);
        return Ok(new { loc.Id, loc.Name });
    }
}

public record CreateLocationRequest(string Name, Guid? BranchId, Guid? ParentId);

// ── ASSETS ────────────────────────────────────────────────────────
[Route("api/assets")]
[Authorize]
public class AssetsController(IApplicationDbContext db, ICurrentUserService cu,
    ISequenceService seq) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] Guid? branchId, [FromQuery] string? status,
        [FromQuery] string? search, [FromQuery] Guid? categoryId,
        [FromQuery] int page = 1, CancellationToken ct = default)
    {
        var q = db.Assets.Include(a => a.Branch).Include(a => a.Category)
            .Include(a => a.Location).AsNoTracking();
        if (branchId.HasValue) q = q.Where(a => a.BranchId == branchId.Value);
        if (categoryId.HasValue) q = q.Where(a => a.CategoryId == categoryId.Value);
        if (!string.IsNullOrEmpty(status)) q = q.Where(a => a.Status.ToString() == status);
        if (!string.IsNullOrEmpty(search))
            q = q.Where(a => a.Name.Contains(search) || (a.SerialNumber != null && a.SerialNumber.Contains(search))
                           || (a.Keywords != null && a.Keywords.Contains(search)));
        var total = await q.CountAsync(ct);
        var items = await q.OrderBy(a => a.Name).Skip((page-1)*50).Take(50)
            .Select(a => new {
                a.Id, a.AssetNumber, a.Name, a.SubName, a.SerialNumber,
                CategoryName = a.Category != null ? a.Category.Name : null,
                BranchName = a.Branch.Name, LocationName = a.Location != null ? a.Location.Name : null,
                a.Value, a.DepreciationPct, Status = a.Status.ToString(),
                a.ResponsiblePerson, a.Quantity
            }).ToListAsync(ct);
        return Ok(new PagedResult<object>(items.Cast<object>().ToList(), total, page, 50));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var a = await db.Assets
            .Include(x => x.Branch).Include(x => x.Category).Include(x => x.Location)
            .Include(x => x.ResponsibleUser).Include(x => x.CreatedBy)
            .Include(x => x.Movements.OrderByDescending(m => m.Date).Take(10))
            .Include(x => x.Lendings.OrderByDescending(l => l.CreatedAt).Take(5))
            .Include(x => x.Damages)
            .AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        if (a == null) return NotFound();
        // Calculate current depreciated value
        var years = (DateTime.UtcNow - a.CreatedAt).Days / 365.0;
        var currentValue = a.Value * (decimal)Math.Pow(1 - (double)a.DepreciationPct / 100, years);
        return Ok(new { Asset = a, CurrentValue = Math.Max(0, currentValue) });
    }

    [HttpPost]
    [Authorize(Roles = "Admin,AssetManager")]
    public async Task<IActionResult> Create([FromBody] CreateAssetRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { message = "Asset name is required." });
        if (req.Value < 0)
            return BadRequest(new { message = "Value cannot be negative." });
        var num = await seq.NextAssetNumberAsync();
        var asset = new Asset
        {
            AssetNumber = num, Name = req.Name.Trim(), SubName = req.SubName?.Trim(),
            SerialNumber = req.SerialNumber, CategoryId = req.CategoryId,
            Keywords = req.Keywords, Value = req.Value,
            DepreciationPct = req.DepreciationPct, Quantity = req.Quantity,
            SupplierName = req.SupplierName, SupplierContact = req.SupplierContact,
            SupplierPhone = req.SupplierPhone, SupplierAddress = req.SupplierAddress,
            LocationId = req.LocationId, ResponsiblePerson = req.ResponsiblePerson,
            ResponsibleUserId = req.ResponsibleUserId, Accessories = req.Accessories,
            BranchId = req.BranchId, CreatedById = cu.UserId
        };
        db.Assets.Add(asset);
        await db.SaveChangesAsync(ct);
        return Ok(new { asset.Id, asset.AssetNumber });
    }

    [HttpPost("move")]
    [Authorize(Roles = "Admin,AssetManager,AssetReceivingManager")]
    public async Task<IActionResult> Move([FromBody] MoveAssetRequest req, CancellationToken ct)
    {
        var asset = await db.Assets.FindAsync([req.AssetId], ct);
        if (asset == null) return NotFound();
        var num = await seq.NextAssetMovementNumberAsync();
        var movement = new AssetMovement
        {
            AmvNumber = num, AssetId = req.AssetId,
            FromLocationId = req.FromLocationId, ToLocationId = req.ToLocationId,
            Date = DateOnly.Parse(req.Date), IsCrossBranch = req.IsCrossBranch,
            Status = req.IsCrossBranch ? AssetMovementStatus.Pending : AssetMovementStatus.Accepted,
            AcceptedAt = req.IsCrossBranch ? null : DateTime.UtcNow,
            AcceptedById = req.IsCrossBranch ? null : cu.UserId,
            CreatedById = cu.UserId
        };
        db.AssetMovements.Add(movement);
        if (!req.IsCrossBranch)
        {
            // Immediate — update asset location
            asset.LocationId = req.ToLocationId;
        }
        await db.SaveChangesAsync(ct);
        return Ok(new { movement.Id, movement.AmvNumber });
    }

    [HttpPost("movements/{id}/accept")]
    [Authorize(Roles = "Admin,AssetManager,AssetReceivingManager")]
    public async Task<IActionResult> AcceptMovement(Guid id, CancellationToken ct)
    {
        var m = await db.AssetMovements.Include(x => x.Asset).FirstOrDefaultAsync(x => x.Id == id, ct);
        if (m == null) return NotFound();
        m.Status = AssetMovementStatus.Accepted;
        m.AcceptedById = cu.UserId; m.AcceptedAt = DateTime.UtcNow;
        m.Asset.LocationId = m.ToLocationId;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPost("lend")]
    [Authorize(Roles = "Admin,AssetManager")]
    public async Task<IActionResult> Lend([FromBody] LendAssetRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.BorrowerName))
            return BadRequest(new { message = "Borrower name is required." });
        var asset = await db.Assets.FindAsync([req.AssetId], ct);
        if (asset == null) return NotFound();
        var num = await seq.NextAssetLendingNumberAsync();
        var lending = new AssetLending
        {
            LendingNumber = num, AssetId = req.AssetId,
            ToLocationId = req.ToLocationId,
            BorrowerName = req.BorrowerName,
            ExpectedReturnDate = DateOnly.Parse(req.ExpectedReturnDate),
            Status = AssetLendingStatus.Active, CreatedById = cu.UserId
        };
        db.AssetLendings.Add(lending);
        asset.Status = AssetStatus.OnLoan;
        await db.SaveChangesAsync(ct);
        return Ok(new { lending.Id, lending.LendingNumber });
    }

    [HttpPost("lendings/{id}/return")]
    [Authorize(Roles = "Admin,AssetManager,AssetReceivingManager")]
    public async Task<IActionResult> ReturnLending(Guid id, CancellationToken ct)
    {
        var lending = await db.AssetLendings.Include(l => l.Asset).FirstOrDefaultAsync(l => l.Id == id, ct);
        if (lending == null) return NotFound();
        lending.Status = AssetLendingStatus.Returned;
        lending.ReturnedAt = DateTime.UtcNow;
        lending.Asset.Status = AssetStatus.Active;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPost("damage")]
    public async Task<IActionResult> ReportDamage([FromBody] DamageRequest req, CancellationToken ct)
    {
        var asset = await db.Assets.FindAsync([req.AssetId], ct);
        if (asset == null) return NotFound();
        db.AssetDamages.Add(new AssetDamage
        {
            AssetId = req.AssetId, Description = req.Description,
            StillInService = req.StillInService, ReportedById = cu.UserId
        });
        if (!req.StillInService) asset.Status = AssetStatus.Damaged;
        await db.SaveChangesAsync(ct);
        return Ok(new { message = "Damage reported." });
    }
}

public record CreateAssetRequest(
    string Name, string? SubName, string? SerialNumber,
    Guid? CategoryId, string? Keywords,
    decimal Value, decimal DepreciationPct, int Quantity,
    string? SupplierName, string? SupplierContact,
    string? SupplierPhone, string? SupplierAddress,
    Guid? LocationId, string? ResponsiblePerson, Guid? ResponsibleUserId,
    string? Accessories, Guid BranchId);

public record MoveAssetRequest(
    Guid AssetId, Guid? FromLocationId, Guid? ToLocationId,
    string Date, bool IsCrossBranch);

public record LendAssetRequest(
    Guid AssetId, Guid? ToLocationId, string BorrowerName, string ExpectedReturnDate);

public record DamageRequest(Guid AssetId, string Description, bool StillInService);
