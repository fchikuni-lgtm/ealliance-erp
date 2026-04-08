using Hollies.Application.Common.Models;
using Hollies.Application.Features.Auth.Commands;
using Hollies.Application.Features.Expenses.Commands;
using Hollies.Application.Features.Expenses.Queries;
using Hollies.Application.Features.GRV.Commands;
using Hollies.Application.Features.HR.Commands;
using Hollies.Application.Features.Income.Commands;
using Hollies.Application.Common.Interfaces;
using Hollies.Infrastructure.Persistence;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

// ── Base controller ───────────────────────────────────────────────
namespace Hollies.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public abstract class BaseController(IMediator mediator) : ControllerBase
{
    protected readonly IMediator Mediator = mediator;
}

// ── AUTH ──────────────────────────────────────────────────────────
[AllowAnonymous]
[Route("api/auth")]
public class AuthController(IMediator mediator, IApplicationDbContext db, IJwtService jwt) : BaseController(mediator)
{
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginCommand cmd, CancellationToken ct)
        => Ok(await Mediator.Send(cmd, ct));

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh([FromBody] RefreshTokenRequest req, CancellationToken ct)
    {
        var user = await db.Users
            .FirstOrDefaultAsync(u => u.RefreshToken == req.RefreshToken && u.Active &&
                                      u.RefreshTokenExpiry > DateTime.UtcNow, ct);
        if (user == null) return Unauthorized(new { message = "Invalid or expired refresh token." });
        var (access, refresh) = jwt.GenerateTokens(user);
        user.RefreshToken = refresh;
        user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(7);
        await db.SaveChangesAsync(ct);
        return Ok(new { accessToken = access, refreshToken = refresh });
    }

    [HttpPost("register")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Register([FromBody] RegisterUserRequest req, CancellationToken ct)
    {
        return Ok(new { message = "Use /api/users to create users via the Users controller." });
    }
}

public record RefreshTokenRequest(string RefreshToken);
public record RegisterUserRequest(string Email, string Password, string Name, string Role, List<string> Permissions);

// ── EXPENSES ──────────────────────────────────────────────────────
[Route("api/expenses")]
public class ExpensesController(IMediator mediator) : BaseController(mediator)
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] GetExpensesQuery query, CancellationToken ct)
        => Ok(await Mediator.Send(query, ct));

    [HttpGet("{expenseNumber}")]
    public async Task<IActionResult> GetById(string expenseNumber, CancellationToken ct)
        => Ok(await Mediator.Send(new GetExpenseByNumberQuery(expenseNumber), ct));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateExpenseCommand cmd, CancellationToken ct)
    {
        var number = await Mediator.Send(cmd, ct);
        return Created($"/api/expenses/{number}", new { expenseNumber = number });
    }

    [HttpPost("{expenseNumber}/action")]
    public async Task<IActionResult> Action(string expenseNumber, [FromBody] ExpenseActionRequest req, CancellationToken ct)
    {
        await Mediator.Send(new UpdateExpenseStatusCommand(expenseNumber, req.Action, req.Notes), ct);
        return NoContent();
    }

    [HttpGet("{expenseNumber}/pdf")]
    public async Task<IActionResult> GetPdf(string expenseNumber, [FromServices] IPdfService pdf, CancellationToken ct)
    {
        var bytes = await pdf.GenerateExpenseReportAsync(
            new ExpenseReportRequest(expenseNumber, DateTime.UtcNow, DateTime.UtcNow, []), ct);
        return File(bytes, "application/pdf", $"{expenseNumber}.pdf");
    }
}

public record ExpenseActionRequest(string Action, string? Notes);

// ── GRV ───────────────────────────────────────────────────────────
[Route("api/grv")]
public class GrvController(IMediator mediator, IApplicationDbContext db) : BaseController(mediator)
{
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? status, [FromQuery] bool? flagged,
        [FromQuery] string? search, [FromQuery] int page = 1,
        CancellationToken ct = default)
    {
        var query = db.Grvs
            .Include(g => g.Supplier).Include(g => g.Region)
            .Include(g => g.Products).Include(g => g.CreatedBy)
            .AsNoTracking();

        if (!string.IsNullOrEmpty(status)) query = query.Where(g => g.Status.ToString() == status);
        if (flagged == true) query = query.Where(g => g.IsFlagged);
        if (!string.IsNullOrEmpty(search))
            query = query.Where(g => g.GrvNumber.Contains(search) || g.Supplier.Name.Contains(search));

        var total = await query.CountAsync(ct);
        var items = await query.OrderByDescending(g => g.CreatedAt)
            .Skip((page - 1) * 50).Take(50)
            .Select(g => new GrvListDto(
                g.Id.ToString(), g.GrvNumber, g.Date, g.Supplier.Name,
                g.ReceiptNumber, g.Region.Name, g.Warehouse.ToString(),
                g.Currency.ToString(),
                g.Products.Sum(p => p.Quantity * p.UnitCost),
                g.Status.ToString(), g.PayType.ToString(),
                g.IsFlagged, g.IsGreenFlagged,
                g.CreatedBy.Name, g.CreatedAt))
            .ToListAsync(ct);

        return Ok(new PagedResult<GrvListDto>(items, total, page, 50));
    }

    [HttpGet("{grvNumber}")]
    public async Task<IActionResult> GetById(string grvNumber, CancellationToken ct)
    {
        var g = await db.Grvs
            .Include(x => x.Supplier).Include(x => x.Region)
            .Include(x => x.Products).Include(x => x.History)
            .Include(x => x.CreatedBy)
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.GrvNumber == grvNumber, ct);
        if (g == null) return NotFound();
        return Ok(new GrvDetailDto(
            g.Id.ToString(), g.GrvNumber, g.Date,
            g.SupplierId, g.Supplier.Name, g.ReceiptNumber,
            g.RegionId, g.Region.Name, g.Warehouse.ToString(),
            g.ExpenseId, g.AmountPaid, g.Currency.ToString(),
            g.Status.ToString(), g.PayType.ToString(), g.IsFlagged, g.IsGreenFlagged,
            g.Products.Select(p => new GrvProductDto(p.Id, p.ProductName, p.Quantity, p.UnitCost, p.Currency.ToString(), p.Quantity * p.UnitCost)).ToList(),
            g.History.Select(h => new GrvHistoryDto(h.Id, h.Action, h.DoneByName, h.Notes, h.CreatedAt)).ToList(),
            g.CreatedBy.Name, g.CreatedAt));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateGrvCommand cmd, CancellationToken ct)
    {
        var number = await Mediator.Send(cmd, ct);
        return Created($"/api/grv/{number}", new { grvNumber = number });
    }
}

// ── INCOME ────────────────────────────────────────────────────────
[Route("api/income")]
public class IncomeController(IMediator mediator, IApplicationDbContext db) : BaseController(mediator)
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? status, CancellationToken ct)
    {
        var query = db.Incomes
            .Include(i => i.PaymentMethod).Include(i => i.CreatedBy).Include(i => i.ApprovedBy)
            .AsNoTracking();
        if (!string.IsNullOrEmpty(status)) query = query.Where(i => i.Status.ToString() == status);
        var items = await query.OrderByDescending(i => i.CreatedAt)
            .Select(i => new IncomeDto(
                i.Id.ToString(), i.IncomeNumber, i.Date, i.Source,
                i.PaymentMethod.Name, i.Currency.ToString(), i.Amount,
                i.Status.ToString(), i.ApprovedBy != null ? i.ApprovedBy.Name : null,
                i.RejectionReason, i.IsFlagged,
                i.CreatedBy.Name, i.CreatedAt))
            .ToListAsync(ct);
        return Ok(items);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateIncomeCommand cmd, CancellationToken ct)
    {
        var number = await Mediator.Send(cmd, ct);
        return Created($"/api/income/{number}", new { incomeNumber = number });
    }

    [HttpPost("{incomeNumber}/approve")]
    public async Task<IActionResult> Approve(string incomeNumber, [FromBody] ApproveIncomeRequest req, CancellationToken ct)
    {
        await Mediator.Send(new ApproveIncomeCommand(incomeNumber, req.Approve, req.Reason), ct);
        return NoContent();
    }
}

public record ApproveIncomeRequest(bool Approve, string? Reason);

// ── SUPPLIERS ─────────────────────────────────────────────────────
[Route("api/suppliers")]
public class SuppliersController(IMediator mediator, IApplicationDbContext db) : BaseController(mediator)
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? flag, [FromQuery] string? search, CancellationToken ct)
    {
        var query = db.Suppliers.Where(s => s.Active).AsNoTracking();
        if (!string.IsNullOrEmpty(flag)) query = query.Where(s => s.Flag.ToString() == flag);
        if (!string.IsNullOrEmpty(search)) query = query.Where(s => s.Name.Contains(search));
        var items = await query.OrderBy(s => s.Name)
            .Select(s => new SupplierSummaryDto(
                s.Id, s.Name, s.Phone, s.Flag.ToString(), s.Balance,
                string.IsNullOrEmpty(s.ContactPerson) || string.IsNullOrEmpty(s.Phone)))
            .ToListAsync(ct);
        return Ok(items);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateSupplierRequest req, CancellationToken ct)
    {
        var sup = await db.Suppliers.FindAsync([id], ct);
        if (sup == null) return NotFound();
        sup.ContactPerson = req.ContactPerson;
        sup.Phone = req.Phone;
        sup.Address = req.Address;
        sup.Flag = (!string.IsNullOrEmpty(req.ContactPerson) && !string.IsNullOrEmpty(req.Phone))
            ? Domain.Enums.SupplierFlag.None : sup.Flag;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPost("{id}/flag")]
    public async Task<IActionResult> SetFlag(Guid id, [FromBody] SetFlagRequest req, CancellationToken ct)
    {
        var sup = await db.Suppliers.FindAsync([id], ct);
        if (sup == null) return NotFound();
        sup.Flag = Enum.Parse<Domain.Enums.SupplierFlag>(req.Flag, true);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}

public record UpdateSupplierRequest(string? ContactPerson, string? Phone, string? Address);
public record SetFlagRequest(string Flag);

// ── HR ────────────────────────────────────────────────────────────
[Route("api/hr")]
public class HrController(IMediator mediator, IApplicationDbContext db) : BaseController(mediator)
{
    [HttpGet("employees")]
    public async Task<IActionResult> GetEmployees(
        [FromQuery] string? status, [FromQuery] Guid? branchId, [FromQuery] string? search, CancellationToken ct)
    {
        var query = db.Employees.Include(e => e.Branch).AsNoTracking();
        if (!string.IsNullOrEmpty(status)) query = query.Where(e => e.Status.ToString() == status);
        if (branchId.HasValue) query = query.Where(e => e.BranchId == branchId);
        if (!string.IsNullOrEmpty(search))
            query = query.Where(e => e.FirstName.Contains(search) || e.LastName.Contains(search) || e.EmployeeNumber.Contains(search));
        var items = await query.OrderBy(e => e.FirstName)
            .Select(e => new EmployeeListDto(
                e.Id, e.EmployeeNumber, e.FirstName + " " + e.LastName,
                e.Branch.Name, e.Position, e.Department,
                e.GrossSalary, e.Currency.ToString(), e.Status.ToString()))
            .ToListAsync(ct);
        return Ok(items);
    }

    [HttpPost("employees")]
    public async Task<IActionResult> CreateEmployee([FromBody] CreateEmployeeCommand cmd, CancellationToken ct)
    {
        var id = await Mediator.Send(cmd, ct);
        return Created($"/api/hr/employees/{id}", new { id });
    }

    [HttpGet("employees/{id}")]
    public async Task<IActionResult> GetEmployee(Guid id, CancellationToken ct)
    {
        var e = await db.Employees.Include(x => x.Branch).AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id, ct);
        if (e == null) return NotFound();
        return Ok(new EmployeeDetailDto(
            e.Id, e.EmployeeNumber, e.FirstName, e.LastName,
            e.BranchId, e.Branch.Name, e.Department, e.Position,
            e.GrossSalary, e.Currency.ToString(), e.StartDate,
            e.IdNumber, e.Phone, e.Address, e.Status.ToString(),
            e.DoubleShiftDefault, e.CreatedAt));
    }

    [HttpGet("attendance")]
    public async Task<IActionResult> GetAttendance(
        [FromQuery] Guid branchId, [FromQuery] string date, CancellationToken ct)
    {
        var d = DateOnly.Parse(date);
        var empIds = await db.Employees
            .Where(e => e.BranchId == branchId && e.Status == Domain.Enums.EmployeeStatus.Active)
            .Select(e => e.Id).ToListAsync(ct);
        var records = await db.Attendance
            .Include(a => a.Employee)
            .Where(a => a.Date == d && empIds.Contains(a.EmployeeId))
            .Select(a => new AttendanceDto(
                a.Id, a.EmployeeId, a.Employee.EmployeeNumber,
                a.Employee.FirstName + " " + a.Employee.LastName,
                a.Date, a.Status.ToString(), a.Notes))
            .ToListAsync(ct);
        return Ok(records);
    }

    [HttpPost("attendance")]
    public async Task<IActionResult> SaveAttendance([FromBody] SaveAttendanceCommand cmd, CancellationToken ct)
    {
        await Mediator.Send(cmd, ct);
        return NoContent();
    }

    [HttpGet("payroll")]
    public async Task<IActionResult> GetPayroll(
        [FromQuery] Guid branchId, [FromQuery] int month, [FromQuery] int year, CancellationToken ct)
    {
        var branchName = (await db.Branches.FindAsync([branchId], ct))?.Name ?? "";
        var items = await db.PayrollEntries
            .Include(p => p.Employee).Include(p => p.ApprovedBy)
            .Where(p => p.Month == month && p.Year == year && p.Employee.BranchId == branchId)
            .Select(p => new PayrollEntryDto(
                p.Id, p.EmployeeId, p.Employee.EmployeeNumber,
                p.Employee.FirstName + " " + p.Employee.LastName,
                branchName, p.Month, p.Year,
                p.DaysWorked, p.DoubleShiftDays,
                p.GrossSalary, p.CalculatedPay, p.Status.ToString(),
                p.ApprovedBy != null ? p.ApprovedBy.Name : null))
            .ToListAsync(ct);
        return Ok(items);
    }

    [HttpPost("payroll/generate")]
    public async Task<IActionResult> GeneratePayroll([FromBody] GeneratePayrollCommand cmd, CancellationToken ct)
    {
        var count = await Mediator.Send(cmd, ct);
        return Ok(new { generatedCount = count });
    }

    [HttpPost("payroll/{id}/approve")]
    public async Task<IActionResult> ApprovePayroll(Guid id, CancellationToken ct)
    {
        var entry = await db.PayrollEntries.FindAsync([id], ct);
        if (entry == null) return NotFound();
        entry.Status = Domain.Enums.PayrollStatus.Approved;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}

// ── APPROVALS ─────────────────────────────────────────────────────
[Route("api/approvals")]
public class ApprovalsController(IMediator mediator, IApplicationDbContext db, ICurrentUserService currentUser)
    : BaseController(mediator)
{
    [HttpGet("pending")]
    public async Task<IActionResult> GetPending(CancellationToken ct)
    {
        var pending = new List<PendingApprovalDto>();
        var userPerms = currentUser.HasPermission("review");

        // Pending expenses
        var expenses = await db.Expenses
            .Include(e => e.Branch).Include(e => e.Category)
            .Where(e => !e.IsReversed && !e.IsFlagged &&
                        (e.Status == Domain.Enums.ExpenseStatus.Pending ||
                         e.Status == Domain.Enums.ExpenseStatus.Reviewed ||
                         e.Status == Domain.Enums.ExpenseStatus.Approved))
            .AsNoTracking().ToListAsync(ct);

        foreach (var e in expenses)
        {
            var action = e.Status switch
            {
                Domain.Enums.ExpenseStatus.Pending when currentUser.HasPermission("review") => "Review",
                Domain.Enums.ExpenseStatus.Reviewed when currentUser.HasPermission("approve") => "Approve",
                Domain.Enums.ExpenseStatus.Approved when currentUser.HasPermission("pay") => "Pay",
                _ => null
            };
            if (action != null)
                pending.Add(new PendingApprovalDto(e.ExpenseNumber, "expense",
                    $"{e.Category.Name} — {e.Branch.Name}",
                    e.Currency.ToString(), e.Amount, e.Branch.Name, e.Date, action));
        }

        // Pending incomes
        if (currentUser.HasPermission("income_approve"))
        {
            var incomes = await db.Incomes.Where(i => i.Status == Domain.Enums.IncomeStatus.Pending).ToListAsync(ct);
            foreach (var i in incomes)
                pending.Add(new PendingApprovalDto(i.IncomeNumber, "income", i.Source,
                    i.Currency.ToString(), i.Amount, i.Source, i.Date, "Approve"));
        }

        return Ok(pending);
    }

    [HttpPost("express")]
    public async Task<IActionResult> Express([FromBody] ExpressApprovalRequest req, CancellationToken ct)
    {
        var results = new List<object>();
        foreach (var id in req.Ids)
        {
            try
            {
                if (id.StartsWith("E"))
                {
                    var exp = await db.Expenses.FirstOrDefaultAsync(e => e.ExpenseNumber == id, ct);
                    if (exp == null) { results.Add(new { id, success = false, message = "Not found" }); continue; }
                    var action = exp.Status switch
                    {
                        Domain.Enums.ExpenseStatus.Pending => "review",
                        Domain.Enums.ExpenseStatus.Reviewed => "approve",
                        Domain.Enums.ExpenseStatus.Approved => "pay",
                        _ => null
                    };
                    if (action == null) { results.Add(new { id, success = false, message = $"Status: {exp.Status}" }); continue; }
                    await Mediator.Send(new UpdateExpenseStatusCommand(id, action, "Express Approval"), ct);
                    results.Add(new { id, success = true, message = $"{action} successful" });
                }
                else if (id.StartsWith("I"))
                {
                    await Mediator.Send(new ApproveIncomeCommand(id, true, null), ct);
                    results.Add(new { id, success = true, message = "Income approved" });
                }
                else { results.Add(new { id, success = false, message = "Unknown ID type" }); }
            }
            catch (Exception ex) { results.Add(new { id, success = false, message = ex.Message }); }
        }
        return Ok(results);
    }
}

public record ExpressApprovalRequest(List<string> Ids);

// ── REPORTS ───────────────────────────────────────────────────────
[Route("api/reports")]
public class ReportsController(IMediator mediator, IApplicationDbContext db) : BaseController(mediator)
{
    [HttpGet("expenses")]
    public async Task<IActionResult> ExpenseReport(
        [FromQuery] string? branchName, [FromQuery] string? regionName,
        [FromQuery] string? categoryName, [FromQuery] string? from, [FromQuery] string? to,
        CancellationToken ct)
    {
        var query = db.Expenses
            .Include(e => e.Branch).Include(e => e.Region).Include(e => e.Category)
            .Where(e => !e.IsReversed).AsNoTracking();

        if (!string.IsNullOrEmpty(branchName)) query = query.Where(e => e.Branch.Name == branchName);
        if (!string.IsNullOrEmpty(regionName)) query = query.Where(e => e.Region.Name == regionName);
        if (!string.IsNullOrEmpty(categoryName)) query = query.Where(e => e.Category.Name == categoryName);
        if (!string.IsNullOrEmpty(from)) query = query.Where(e => e.Date >= DateOnly.Parse(from));
        if (!string.IsNullOrEmpty(to)) query = query.Where(e => e.Date <= DateOnly.Parse(to));

        var data = await query
            .Select(e => new { e.Branch.Name, CategoryName = e.Category.Name, e.Amount })
            .ToListAsync(ct);

        var byCat = data.GroupBy(e => e.CategoryName)
            .Select(g => new CategoryTotalDto(g.Key, g.Sum(e => e.Amount), g.Count()))
            .OrderByDescending(x => x.Total).ToList();
        var byBranch = data.GroupBy(e => e.Name)
            .Select(g => new BranchTotalDto(g.Key, g.Sum(e => e.Amount)))
            .OrderByDescending(x => x.Total).ToList();

        var label = $"{branchName ?? "All Branches"} · {from} to {to}";
        return Ok(new ExpenseReportDto(label, byCat, byBranch, data.Sum(e => e.Amount), data.Count));
    }

    [HttpGet("income-vs-expense")]
    public async Task<IActionResult> IncomeVsExpense(
        [FromQuery] Guid? paymentMethodId, [FromQuery] string? from, [FromQuery] string? to,
        CancellationToken ct)
    {
        var fromDate = from != null ? DateOnly.Parse(from) : DateOnly.MinValue;
        var toDate   = to   != null ? DateOnly.Parse(to)   : DateOnly.MaxValue;

        var incomeQ = db.Incomes
            .Where(i => i.Status == Domain.Enums.IncomeStatus.Approved)
            .Where(i => i.Date >= fromDate && i.Date <= toDate)
            .AsNoTracking();
        if (paymentMethodId.HasValue) incomeQ = incomeQ.Where(i => i.PaymentMethodId == paymentMethodId.Value);
        var incomeTotal = await incomeQ.SumAsync(i => i.Amount, ct);

        var expenseQ = db.Expenses
            .Where(e => !e.IsReversed && e.Status == Domain.Enums.ExpenseStatus.Paid)
            .Where(e => e.Date >= fromDate && e.Date <= toDate)
            .AsNoTracking();
        if (paymentMethodId.HasValue) expenseQ = expenseQ.Where(e => e.PaymentMethodId == paymentMethodId.Value);
        var expenseTotal = await expenseQ.SumAsync(e => e.Amount, ct);

        return Ok(new { incomeTotal, expenseTotal, netBalance = incomeTotal - expenseTotal });
    }

    [HttpGet("payroll")]
    public async Task<IActionResult> PayrollReport(
        [FromQuery] Guid? branchId, [FromQuery] int month, [FromQuery] int year,
        CancellationToken ct)
    {
        var query = db.PayrollEntries
            .Include(p => p.Employee).ThenInclude(e => e.Branch)
            .Where(p => p.Month == month && p.Year == year)
            .AsNoTracking();
        if (branchId.HasValue) query = query.Where(p => p.Employee.BranchId == branchId.Value);

        var data = await query
            .Select(p => new {
                p.Employee.EmployeeNumber, FullName = p.Employee.FirstName + " " + p.Employee.LastName,
                BranchName = p.Employee.Branch.Name, p.DaysWorked, p.DoubleShiftDays,
                p.GrossSalary, p.CalculatedPay, Status = p.Status.ToString()
            }).ToListAsync(ct);

        return Ok(new { totalPayroll = data.Sum(p => p.CalculatedPay), employeeCount = data.Count, entries = data });
    }

    [HttpGet("grv")]
    public async Task<IActionResult> GrvReport(
        [FromQuery] Guid? supplierId, [FromQuery] string? from, [FromQuery] string? to,
        CancellationToken ct)
    {
        var query = db.Grvs.Include(g => g.Supplier).Include(g => g.Products).AsNoTracking();
        if (supplierId.HasValue) query = query.Where(g => g.SupplierId == supplierId.Value);
        if (!string.IsNullOrEmpty(from)) query = query.Where(g => g.Date >= DateOnly.Parse(from));
        if (!string.IsNullOrEmpty(to))   query = query.Where(g => g.Date <= DateOnly.Parse(to));

        var data = await query
            .Select(g => new {
                g.GrvNumber, g.Date, SupplierName = g.Supplier.Name,
                TotalValue = g.Products.Sum(p => p.Quantity * p.UnitCost),
                Status = g.Status.ToString()
            }).ToListAsync(ct);

        var bySupplier = data.GroupBy(g => g.SupplierName)
            .Select(x => new { supplier = x.Key, total = x.Sum(g => g.TotalValue), count = x.Count() })
            .OrderByDescending(x => x.total).ToList();

        return Ok(new { grandTotal = data.Sum(g => g.TotalValue), grvCount = data.Count, bySupplier, items = data });
    }

    // Dashboard metrics — used by Home.tsx
    [HttpGet("dashboard-metrics")]
    public async Task<IActionResult> DashboardMetrics(CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var today = DateOnly.FromDateTime(now);
        var monthStart = new DateOnly(today.Year, today.Month, 1);

        var pendingApprovals = await db.Expenses
            .CountAsync(e => !e.IsReversed && (
                e.Status == Domain.Enums.ExpenseStatus.Pending ||
                e.Status == Domain.Enums.ExpenseStatus.Reviewed ||
                e.Status == Domain.Enums.ExpenseStatus.Approved), ct);

        var todayExpenses = await db.Expenses
            .Where(e => e.Date == today && !e.IsReversed)
            .SumAsync(e => (decimal?)e.Amount, ct) ?? 0;

        var monthPayroll = await db.PayrollEntries
            .Where(p => p.Month == today.Month && p.Year == today.Year)
            .SumAsync(p => (decimal?)p.CalculatedPay, ct) ?? 0;

        var flaggedCount = await db.Expenses.CountAsync(e => e.IsFlagged && !e.IsReversed, ct)
            + await db.Grvs.CountAsync(g => g.IsFlagged, ct)
            + await db.Incomes.CountAsync(i => i.IsFlagged, ct);

        return Ok(new { pendingApprovals, todayExpenses, monthPayroll, flaggedCount });
    }
}

// ── AUDIT LOG ─────────────────────────────────────────────────────
[Route("api/audit-log")]
[Authorize(Roles = "Admin")]
public class AuditLogController(IApplicationDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? entity, [FromQuery] string? action, [FromQuery] string? userId,
        [FromQuery] string? from, [FromQuery] string? to,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 50, CancellationToken ct = default)
    {
        pageSize = Math.Min(pageSize, 200);
        var query = db.AuditLogs.AsNoTracking();

        if (!string.IsNullOrEmpty(entity)) query = query.Where(a => a.EntityName == entity);
        if (!string.IsNullOrEmpty(action)) query = query.Where(a => a.Action == action);
        if (!string.IsNullOrEmpty(userId) && Guid.TryParse(userId, out var uid))
            query = query.Where(a => a.UserId == uid);
        if (!string.IsNullOrEmpty(from)) query = query.Where(a => a.CreatedAt >= DateTime.Parse(from));
        if (!string.IsNullOrEmpty(to))   query = query.Where(a => a.CreatedAt <= DateTime.Parse(to));

        var total = await query.CountAsync(ct);
        var items = await query.OrderByDescending(a => a.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(a => new {
                a.Id, a.EntityName, a.EntityId, a.Action,
                a.UserId, a.UserName, a.OldValues, a.NewValues, a.CreatedAt
            }).ToListAsync(ct);

        return Ok(new { items, total, page, pageSize });
    }
}

// ── REFERENCE DATA ────────────────────────────────────────────────
[Route("api/reference")]
public class ReferenceController(IApplicationDbContext db, ICurrentUserService cu) : ControllerBase
{
    [HttpGet]
    [Authorize]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var (branches, regions, cats, pms, products, workmen) = (
            await db.Branches.Include(b => b.Region).Where(b => b.Active).OrderBy(b => b.Name)
                .Select(b => new BranchDto(b.Id, b.Name, b.Region.Name, b.RegionId)).ToListAsync(ct),
            await db.Regions.Where(r => r.Active).OrderBy(r => r.Name)
                .Select(r => new RegionDto(r.Id, r.Name)).ToListAsync(ct),
            await db.Categories.Where(c => c.Active).OrderBy(c => c.Name)
                .Select(c => new CategoryDto(c.Id, c.Name)).ToListAsync(ct),
            await db.PaymentMethods.Where(p => p.Active)
                .Select(p => new PaymentMethodDto(p.Id, p.Name, p.Currency.ToString(), p.Balance, p.IncomeTotal, p.ExpenseTotal)).ToListAsync(ct),
            await db.Products.Where(p => p.Active).OrderBy(p => p.Name)
                .Select(p => new { p.Id, p.Name, p.SubName, p.Keywords, p.CostPrice, p.SellingPrice, p.CategoryId }).ToListAsync(ct),
            await db.Workmen.Where(w => w.Active).OrderBy(w => w.Name)
                .Select(w => new ProductDto(w.Id, w.Name)).ToListAsync(ct)
        );
        var currencies = await db.CurrencyRates.Where(c => c.Active)
            .Select(c => new { c.Id, c.Code, c.Name, c.RateToUsd, c.IsBase }).ToListAsync(ct);
        return Ok(new { branches, regions, categories = cats, paymentMethods = pms, products, workmen, currencies });
    }

    [HttpPost("categories")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> AddCategory([FromBody] AddRefRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Name)) return BadRequest(new { message = "Name is required." });
        if (await db.Categories.AnyAsync(c => c.Name == req.Name.Trim(), ct))
            return Conflict(new { message = $"Category '{req.Name.Trim()}' already exists." });
        var entity = new Domain.Entities.Category { Name = req.Name.Trim() };
        db.Categories.Add(entity);
        await db.SaveChangesAsync(ct);
        return Ok(new { message = "Category added.", id = entity.Id });
    }

    [HttpPost("branches")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> AddBranch([FromBody] AddBranchRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Name)) return BadRequest(new { message = "Name is required." });
        if (await db.Branches.AnyAsync(b => b.Name == req.Name.Trim(), ct))
            return Conflict(new { message = $"Branch '{req.Name.Trim()}' already exists." });
        if (!await db.Regions.AnyAsync(r => r.Id == req.RegionId, ct))
            return BadRequest(new { message = "Selected region does not exist." });
        var entity = new Domain.Entities.Branch { Name = req.Name.Trim(), RegionId = req.RegionId };
        db.Branches.Add(entity);
        await db.SaveChangesAsync(ct);
        return Ok(new { message = "Branch added.", id = entity.Id });
    }

    [HttpPost("payment-methods")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> AddPaymentMethod([FromBody] AddPmRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Name)) return BadRequest(new { message = "Name is required." });
        if (await db.PaymentMethods.AnyAsync(p => p.Name == req.Name.Trim(), ct))
            return Conflict(new { message = $"Payment method '{req.Name.Trim()}' already exists." });
        if (!Enum.TryParse<Domain.Enums.Currency>(req.Currency, true, out var currency))
            return BadRequest(new { message = $"Invalid currency '{req.Currency}'." });
        var entity = new Domain.Entities.PaymentMethod { Name = req.Name.Trim(), Currency = currency };
        db.PaymentMethods.Add(entity);
        await db.SaveChangesAsync(ct);
        return Ok(new { message = "Payment method added.", id = entity.Id });
    }

    [HttpPost("regions")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> AddRegion([FromBody] AddRefRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Name)) return BadRequest(new { message = "Name is required." });
        if (await db.Regions.AnyAsync(r => r.Name == req.Name.Trim(), ct))
            return Conflict(new { message = $"Region '{req.Name.Trim()}' already exists." });
        var entity = new Domain.Entities.Region { Name = req.Name.Trim() };
        db.Regions.Add(entity);
        await db.SaveChangesAsync(ct);
        return Ok(new { message = "Region added.", id = entity.Id });
    }

    [HttpPost("products")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> AddProduct([FromBody] AddProductRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Name)) return BadRequest(new { message = "Product name is required." });
        var entity = new Domain.Entities.Product
        {
            Name = req.Name.Trim(), SubName = req.SubName?.Trim(), Keywords = req.Keywords,
            CostPrice = req.CostPrice, SellingPrice = req.SellingPrice, CategoryId = req.CategoryId
        };
        db.Products.Add(entity);
        await db.SaveChangesAsync(ct);
        return Ok(new { message = "Product added.", id = entity.Id });
    }

    [HttpPut("products/{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateProduct(Guid id, [FromBody] AddProductRequest req, CancellationToken ct)
    {
        var p = await db.Products.FindAsync([id], ct);
        if (p == null) return NotFound();
        // Track history
        if (p.Name != req.Name || p.CostPrice != req.CostPrice || p.SellingPrice != req.SellingPrice)
        {
            db.ProductNameHistory.Add(new Domain.Entities.ProductNameHistory
            {
                ProductId = id, OldName = p.Name, NewName = req.Name,
                OldCostPrice = p.CostPrice, NewCostPrice = req.CostPrice,
                OldSellingPrice = p.SellingPrice, NewSellingPrice = req.SellingPrice,
                ChangedById = cu.UserId
            });
        }
        p.Name = req.Name; p.SubName = req.SubName; p.Keywords = req.Keywords;
        p.CostPrice = req.CostPrice; p.SellingPrice = req.SellingPrice; p.CategoryId = req.CategoryId;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPost("workmen")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> AddWorkman([FromBody] AddRefRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Name)) return BadRequest(new { message = "Name is required." });
        var entity = new Domain.Entities.Workman { Name = req.Name.Trim() };
        db.Workmen.Add(entity);
        await db.SaveChangesAsync(ct);
        return Ok(new { message = "Workman added.", id = entity.Id });
    }

    [HttpGet("currencies")]
    public async Task<IActionResult> GetCurrencies(CancellationToken ct)
    {
        var items = await db.CurrencyRates.Where(c => c.Active).AsNoTracking()
            .OrderBy(c => c.Code).ToListAsync(ct);
        return Ok(items);
    }

    [HttpPost("currencies")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> AddCurrency([FromBody] AddCurrencyRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Code) || string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { message = "Code and name are required." });
        if (await db.CurrencyRates.AnyAsync(c => c.Code == req.Code.Trim(), ct))
            return Conflict(new { message = $"Currency '{req.Code.Trim()}' already exists." });
        var entity = new Domain.Entities.CurrencyRate
        {
            Code = req.Code.Trim(), Name = req.Name.Trim(), RateToUsd = req.RateToUsd
        };
        db.CurrencyRates.Add(entity);
        await db.SaveChangesAsync(ct);
        return Ok(new { message = "Currency added.", id = entity.Id });
    }

    [HttpPut("currencies/{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateCurrencyRate(Guid id, [FromBody] UpdateRateRequest req, CancellationToken ct)
    {
        var c = await db.CurrencyRates.FindAsync([id], ct);
        if (c == null) return NotFound();
        if (!c.IsBase) c.RateToUsd = req.RateToUsd;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}

public record AddRefRequest(string Name);
public record AddBranchRequest(string Name, Guid RegionId);
public record AddPmRequest(string Name, string Currency);
public record AddProductRequest(string Name, string? SubName, string? Keywords,
    decimal CostPrice, decimal SellingPrice, Guid? CategoryId);
public record AddCurrencyRequest(string Code, string Name, decimal RateToUsd);
public record UpdateRateRequest(decimal RateToUsd);
