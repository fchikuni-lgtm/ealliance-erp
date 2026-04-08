using FluentValidation;
using Hollies.Application.Common.Interfaces;
using Hollies.Application.Common.Models;
using Hollies.Domain.Entities;
using Hollies.Domain.Enums;
using Hollies.Domain.Exceptions;
using MediatR;
using Microsoft.EntityFrameworkCore;

// ═══════════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════════
namespace Hollies.Application.Features.Auth.Commands
{
    public record LoginCommand(string Email, string Password) : IRequest<AuthResponse>;

    public class LoginValidator : AbstractValidator<LoginCommand>
    {
        public LoginValidator()
        {
            RuleFor(x => x.Email).NotEmpty().EmailAddress();
            RuleFor(x => x.Password).NotEmpty().MinimumLength(6);
        }
    }

    public class LoginHandler(IApplicationDbContext db, IJwtService jwt) : IRequestHandler<LoginCommand, AuthResponse>
    {
        public async Task<AuthResponse> Handle(LoginCommand request, CancellationToken ct)
        {
            var user = await db.Users.Include(u => u.Branch)
                .FirstOrDefaultAsync(u => u.Email == request.Email && u.Active, ct)
                ?? throw new NotFoundException("User", request.Email);

            if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
                throw new ForbiddenException("Invalid credentials.");

            var (access, refresh) = jwt.GenerateTokens(user);
            user.RefreshToken = refresh;
            user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(7);
            await db.SaveChangesAsync(ct);

            return new AuthResponse(access, refresh, MapUser(user));
        }

        private static UserDto MapUser(User u) => new(u.Id, u.Name, u.Initials, u.Email, u.Role,
            u.Permissions, u.BranchId?.ToString(), u.Branch?.Name);
    }

    public interface IJwtService
    {
        (string AccessToken, string RefreshToken) GenerateTokens(User user);
        Guid? ValidateRefreshToken(string refreshToken);
    }
}

// ═══════════════════════════════════════════════════════════════
// EXPENSES — COMMANDS
// ═══════════════════════════════════════════════════════════════
namespace Hollies.Application.Features.Expenses.Commands
{
    public record CreateExpenseCommand(
        DateOnly Date, DateOnly ValueDate,
        Guid BranchId, Guid RegionId, Guid CategoryId,
        string? BudgetId, string ExpenseType,
        Guid? SupplierId, string? NewSupplierName,
        Guid? WorkmanId,
        string Currency, decimal Amount, Guid PaymentMethodId,
        string? WhatsAppNotify, string? Notes) : IRequest<string>;

    public class CreateExpenseValidator : AbstractValidator<CreateExpenseCommand>
    {
        public CreateExpenseValidator()
        {
            RuleFor(x => x.Date).NotEmpty();
            RuleFor(x => x.BranchId).NotEmpty();
            RuleFor(x => x.RegionId).NotEmpty();
            RuleFor(x => x.CategoryId).NotEmpty();
            RuleFor(x => x.Amount).GreaterThan(0);
            RuleFor(x => x.PaymentMethodId).NotEmpty();
        }
    }

    public class CreateExpenseHandler(
        IApplicationDbContext db, ISequenceService seq,
        ICurrentUserService currentUser, IWhatsAppService? whatsApp)
        : IRequestHandler<CreateExpenseCommand, string>
    {
        public async Task<string> Handle(CreateExpenseCommand req, CancellationToken ct)
        {
            // Handle new supplier on the fly
            Guid? supplierId = req.SupplierId;
            if (supplierId == null && !string.IsNullOrWhiteSpace(req.NewSupplierName))
            {
                var existing = await db.Suppliers.FirstOrDefaultAsync(s => s.Name == req.NewSupplierName, ct);
                if (existing == null)
                {
                    var sup = new Supplier { Name = req.NewSupplierName, Flag = SupplierFlag.Orange };
                    db.Suppliers.Add(sup);
                    supplierId = sup.Id;
                }
                else supplierId = existing.Id;
            }

            var expNum = await seq.NextExpenseNumberAsync();
            var expense = new Expense
            {
                ExpenseNumber = expNum,
                Date = req.Date, ValueDate = req.ValueDate,
                BranchId = req.BranchId, RegionId = req.RegionId,
                CategoryId = req.CategoryId, BudgetId = req.BudgetId,
                ExpenseType = Enum.Parse<ExpenseType>(req.ExpenseType, true),
                SupplierId = supplierId, WorkmanId = req.WorkmanId,
                Currency = Enum.Parse<Currency>(req.Currency, true),
                Amount = req.Amount, PaymentMethodId = req.PaymentMethodId,
                WhatsAppNotify = req.WhatsAppNotify, Notes = req.Notes,
                CreatedById = currentUser.UserId,
            };
            db.Expenses.Add(expense);
            db.ExpenseHistory.Add(new ExpenseHistory
            {
                ExpenseId = expense.Id, Action = "Created",
                DoneById = currentUser.UserId, Notes = req.Notes
            });
            await db.SaveChangesAsync(ct);

            // WhatsApp notification
            if (whatsApp != null && !string.IsNullOrWhiteSpace(req.WhatsAppNotify))
                _ = whatsApp.SendMessageAsync(req.WhatsAppNotify,
                    $"Expense {expNum} of {req.Currency} {req.Amount:N2} created and pending approval.");

            return expNum;
        }
    }

    public record UpdateExpenseStatusCommand(
        string ExpenseNumber, string Action, string? Notes) : IRequest<Unit>;

    public class UpdateExpenseStatusHandler(
        IApplicationDbContext db, ICurrentUserService currentUser,
        IWhatsAppService? whatsApp)
        : IRequestHandler<UpdateExpenseStatusCommand, Unit>
    {
        public async Task<Unit> Handle(UpdateExpenseStatusCommand req, CancellationToken ct)
        {
            var expense = await db.Expenses
                .Include(e => e.PaymentMethod)
                .Include(e => e.CreatedBy)
                .FirstOrDefaultAsync(e => e.ExpenseNumber == req.ExpenseNumber, ct)
                ?? throw new NotFoundException("Expense", req.ExpenseNumber);

            // State machine
            var sm = BuildStateMachine(expense);
            var trigger = req.Action.ToLower() switch
            {
                "review" => "review",
                "approve" => "approve",
                "pay" => "pay",
                "acquit" => "acquit",
                "audit" => "audit",
                "reverse" => "reverse",
                "flag" => "flag",
                "unflag" => "unflag",
                "reject" => "reject",
                _ => throw new BusinessRuleException($"Unknown action: {req.Action}")
            };

            if (!sm.CanFire(trigger))
                throw new BusinessRuleException($"Cannot '{req.Action}' an expense with status '{expense.Status}'.");

            sm.Fire(trigger);
            ApplySideEffects(expense, req.Action, currentUser);

            // Deduct from payment method if paid
            if (req.Action.Equals("pay", StringComparison.OrdinalIgnoreCase))
            {
                expense.PaymentMethod.Balance -= expense.Amount;
                expense.PaymentMethod.ExpenseTotal += expense.Amount;
            }

            // Restore on reverse
            if (req.Action.Equals("reverse", StringComparison.OrdinalIgnoreCase))
            {
                if (string.IsNullOrWhiteSpace(req.Notes))
                    throw new BusinessRuleException("Reversal reason is required.");
                expense.PaymentMethod.Balance += expense.Amount;
                expense.PaymentMethod.ExpenseTotal -= expense.Amount;
                expense.IsReversed = true;
            }

            db.ExpenseHistory.Add(new ExpenseHistory
            {
                ExpenseId = expense.Id, Action = req.Action,
                DoneById = currentUser.UserId, Notes = req.Notes
            });

            await db.SaveChangesAsync(ct);

            // Notify
            if (whatsApp != null && !string.IsNullOrWhiteSpace(expense.WhatsAppNotify))
                _ = whatsApp.SendMessageAsync(expense.WhatsAppNotify,
                    $"Expense {expense.ExpenseNumber}: {req.Action} by {currentUser.UserName}.");

            return Unit.Value;
        }

        private static Stateless.StateMachine<ExpenseStatus, string> BuildStateMachine(Expense e)
        {
            var sm = new Stateless.StateMachine<ExpenseStatus, string>(() => e.Status, s => e.Status = s);
            sm.Configure(ExpenseStatus.Pending).Permit("review", ExpenseStatus.Reviewed).Permit("flag", ExpenseStatus.Pending).Permit("reject", ExpenseStatus.Rejected);
            sm.Configure(ExpenseStatus.Reviewed).Permit("approve", ExpenseStatus.Approved).Permit("flag", ExpenseStatus.Reviewed).Permit("reject", ExpenseStatus.Rejected);
            sm.Configure(ExpenseStatus.Approved).Permit("pay", ExpenseStatus.Paid).Permit("flag", ExpenseStatus.Approved);
            sm.Configure(ExpenseStatus.Paid).Permit("acquit", ExpenseStatus.Acquitted).Permit("reverse", ExpenseStatus.Reversed);
            sm.Configure(ExpenseStatus.Acquitted).Permit("audit", ExpenseStatus.Audited);
            sm.Configure(ExpenseStatus.Rejected).Permit("unflag", ExpenseStatus.Pending);
            return sm;
        }

        private static void ApplySideEffects(Expense e, string action, ICurrentUserService u)
        {
            switch (action.ToLower())
            {
                case "review": e.ReviewedById = u.UserId; break;
                case "approve": e.ApprovedById = u.UserId; break;
                case "pay": e.PaidById = u.UserId; break;
                case "flag": e.IsFlagged = true; break;
                case "unflag": e.IsFlagged = false; e.FlagReason = null; break;
                case "reject": e.IsFlagged = true; break;
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// EXPENSES — QUERIES
// ═══════════════════════════════════════════════════════════════
namespace Hollies.Application.Features.Expenses.Queries
{
    public record GetExpensesQuery(
        string? Status, bool? IsFlagged, bool? IsReversed,
        string? BranchName, string? CategoryName, string? SupplierName,
        DateOnly? From, DateOnly? To, string? Search,
        int Page = 1, int PageSize = 50) : IRequest<PagedResult<ExpenseListDto>>;

    public class GetExpensesHandler(IApplicationDbContext db)
        : IRequestHandler<GetExpensesQuery, PagedResult<ExpenseListDto>>
    {
        public async Task<PagedResult<ExpenseListDto>> Handle(GetExpensesQuery q, CancellationToken ct)
        {
            var query = db.Expenses
                .Include(e => e.Branch).Include(e => e.Region).Include(e => e.Category)
                .Include(e => e.Supplier).Include(e => e.PaymentMethod).Include(e => e.CreatedBy)
                .AsNoTracking();

            if (!string.IsNullOrWhiteSpace(q.Status))
                query = query.Where(e => e.Status.ToString().ToLower() == q.Status.ToLower());
            if (q.IsFlagged == true) query = query.Where(e => e.IsFlagged);
            if (q.IsReversed == true) query = query.Where(e => e.IsReversed);
            if (!string.IsNullOrWhiteSpace(q.BranchName)) query = query.Where(e => e.Branch.Name == q.BranchName);
            if (!string.IsNullOrWhiteSpace(q.CategoryName)) query = query.Where(e => e.Category.Name == q.CategoryName);
            if (q.From.HasValue) query = query.Where(e => e.Date >= q.From.Value);
            if (q.To.HasValue) query = query.Where(e => e.Date <= q.To.Value);
            if (!string.IsNullOrWhiteSpace(q.Search))
                query = query.Where(e =>
                    e.ExpenseNumber.Contains(q.Search) ||
                    e.Category.Name.Contains(q.Search) ||
                    (e.Supplier != null && e.Supplier.Name.Contains(q.Search)) ||
                    e.Branch.Name.Contains(q.Search));

            var total = await query.CountAsync(ct);
            var items = await query
                .OrderByDescending(e => e.CreatedAt)
                .Skip((q.Page - 1) * q.PageSize)
                .Take(q.PageSize)
                .Select(e => new ExpenseListDto(
                    e.Id.ToString(), e.ExpenseNumber, e.Date,
                    e.Branch.Name, e.Region.Name, e.Category.Name,
                    e.Supplier != null ? e.Supplier.Name : null,
                    e.Currency.ToString(), e.Amount, e.PaymentMethod.Name,
                    e.Status.ToString(), e.IsFlagged, e.IsGreenFlagged, e.IsReversed,
                    e.CreatedBy.Name, e.CreatedAt))
                .ToListAsync(ct);

            return new PagedResult<ExpenseListDto>(items, total, q.Page, q.PageSize);
        }
    }

    public record GetExpenseByNumberQuery(string ExpenseNumber) : IRequest<ExpenseDetailDto>;

    public class GetExpenseByNumberHandler(IApplicationDbContext db)
        : IRequestHandler<GetExpenseByNumberQuery, ExpenseDetailDto>
    {
        public async Task<ExpenseDetailDto> Handle(GetExpenseByNumberQuery req, CancellationToken ct)
        {
            var e = await db.Expenses
                .Include(x => x.Branch).Include(x => x.Region).Include(x => x.Category)
                .Include(x => x.Supplier).Include(x => x.Workman).Include(x => x.PaymentMethod)
                .Include(x => x.CreatedBy).Include(x => x.ReviewedBy)
                .Include(x => x.ApprovedBy).Include(x => x.PaidBy)
                .Include(x => x.History).ThenInclude(h => h.DoneBy)
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.ExpenseNumber == req.ExpenseNumber, ct)
                ?? throw new NotFoundException("Expense", req.ExpenseNumber);

            return new ExpenseDetailDto(
                e.Id.ToString(), e.ExpenseNumber, e.Date, e.ValueDate,
                e.BranchId, e.Branch.Name, e.RegionId, e.Region.Name,
                e.CategoryId, e.Category.Name, e.BudgetId, e.ExpenseType.ToString(),
                e.SupplierId, e.Supplier?.Name, e.WorkmanId, e.Workman?.Name,
                e.Currency.ToString(), e.Amount, e.PaymentMethodId, e.PaymentMethod.Name,
                e.Status.ToString(), e.IsFlagged, e.FlagReason, e.IsGreenFlagged,
                e.IsReversed, e.Notes,
                e.CreatedBy.Name, e.ReviewedBy?.Name, e.ApprovedBy?.Name, e.PaidBy?.Name,
                e.History.OrderBy(h => h.CreatedAt)
                    .Select(h => new ExpenseHistoryDto(h.Id, h.Action, h.DoneBy.Name, h.Notes, h.CreatedAt))
                    .ToList());
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// GRV — COMMANDS & QUERIES
// ═══════════════════════════════════════════════════════════════
namespace Hollies.Application.Features.GRV.Commands
{
    public record CreateGrvCommand(
        DateOnly Date, Guid SupplierId, string? NewSupplierName,
        string? ReceiptNumber, Guid RegionId, string Warehouse,
        string PayType, string? ExpenseId, string Currency,
        List<GrvProductInput> Products) : IRequest<string>;

    public record GrvProductInput(string ProductName, decimal Quantity, decimal UnitCost, string Currency);

    public class CreateGrvHandler(
        IApplicationDbContext db, ISequenceService seq, ICurrentUserService currentUser)
        : IRequestHandler<CreateGrvCommand, string>
    {
        public async Task<string> Handle(CreateGrvCommand req, CancellationToken ct)
        {
            var supplierId = req.SupplierId;
            if (supplierId == Guid.Empty && !string.IsNullOrWhiteSpace(req.NewSupplierName))
            {
                var sup = new Supplier { Name = req.NewSupplierName, Flag = SupplierFlag.Orange };
                db.Suppliers.Add(sup);
                supplierId = sup.Id;
            }

            var isBlank = req.Products.Count == 0;
            var grvNum = await seq.NextGrvNumberAsync();
            var grv = new Grv
            {
                GrvNumber = grvNum, Date = req.Date,
                SupplierId = supplierId, ReceiptNumber = req.ReceiptNumber,
                RegionId = req.RegionId,
                Warehouse = Enum.Parse<Warehouse>(req.Warehouse, true),
                PayType = Enum.Parse<GrvPayType>(req.PayType, true),
                ExpenseId = req.ExpenseId,
                Currency = Enum.Parse<Currency>(req.Currency, true),
                Status = isBlank ? GrvStatus.Blank : GrvStatus.Received,
                IsFlagged = isBlank || req.PayType == "Credit",
                CreatedById = currentUser.UserId,
            };

            foreach (var p in req.Products)
                grv.Products.Add(new GrvProduct
                {
                    ProductName = p.ProductName, Quantity = p.Quantity,
                    UnitCost = p.UnitCost, Currency = Enum.Parse<Currency>(p.Currency, true)
                });

            db.Grvs.Add(grv);
            db.GrvHistory.Add(new GrvHistory
            {
                GrvId = grv.Id,
                Action = isBlank ? "Created (Prepay — blank GRV)" : "Created",
                DoneByName = currentUser.UserName
            });

            await db.SaveChangesAsync(ct);
            return grvNum;
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// HR — COMMANDS & QUERIES
// ═══════════════════════════════════════════════════════════════
namespace Hollies.Application.Features.HR.Commands
{
    public record CreateEmployeeCommand(
        string FirstName, string LastName, Guid BranchId,
        string? Department, string? Position, decimal GrossSalary, string Currency,
        DateOnly? StartDate, string? IdNumber, string? Phone, string? Address,
        bool DoubleShiftDefault) : IRequest<Guid>;

    public class CreateEmployeeHandler(
        IApplicationDbContext db, ISequenceService seq, ICurrentUserService currentUser)
        : IRequestHandler<CreateEmployeeCommand, Guid>
    {
        public async Task<Guid> Handle(CreateEmployeeCommand req, CancellationToken ct)
        {
            var branch = await db.Branches.FindAsync([req.BranchId], ct)
                ?? throw new NotFoundException("Branch", req.BranchId);

            var empNum = await seq.NextEmployeeNumberAsync();
            var emp = new Employee
            {
                EmployeeNumber = empNum,
                FirstName = req.FirstName, LastName = req.LastName,
                BranchId = req.BranchId,
                Department = req.Department, Position = req.Position,
                GrossSalary = req.GrossSalary,
                Currency = Enum.Parse<Currency>(req.Currency, true),
                StartDate = req.StartDate, IdNumber = req.IdNumber,
                Phone = req.Phone, Address = req.Address,
                DoubleShiftDefault = req.DoubleShiftDefault
            };
            db.Employees.Add(emp);
            await db.SaveChangesAsync(ct);
            return emp.Id;
        }
    }

    public record SaveAttendanceCommand(
        Guid BranchId, DateOnly Date,
        List<AttendanceInput> Records) : IRequest<Unit>;

    public record AttendanceInput(Guid EmployeeId, string Status, string? Notes);

    public class SaveAttendanceHandler(IApplicationDbContext db, ICurrentUserService currentUser)
        : IRequestHandler<SaveAttendanceCommand, Unit>
    {
        public async Task<Unit> Handle(SaveAttendanceCommand req, CancellationToken ct)
        {
            foreach (var rec in req.Records)
            {
                var existing = await db.Attendance
                    .FirstOrDefaultAsync(a => a.EmployeeId == rec.EmployeeId && a.Date == req.Date, ct);

                if (existing != null)
                {
                    existing.Status = Enum.Parse<AttendanceStatus>(rec.Status, true);
                    existing.Notes = rec.Notes;
                    existing.MarkedById = currentUser.UserId;
                }
                else
                {
                    db.Attendance.Add(new Attendance
                    {
                        EmployeeId = rec.EmployeeId, Date = req.Date,
                        Status = Enum.Parse<AttendanceStatus>(rec.Status, true),
                        Notes = rec.Notes, MarkedById = currentUser.UserId
                    });
                }
            }
            await db.SaveChangesAsync(ct);
            return Unit.Value;
        }
    }

    public record GeneratePayrollCommand(Guid BranchId, int Month, int Year) : IRequest<int>;

    public class GeneratePayrollHandler(IApplicationDbContext db, ICurrentUserService currentUser)
        : IRequestHandler<GeneratePayrollCommand, int>
    {
        public async Task<int> Handle(GeneratePayrollCommand req, CancellationToken ct)
        {
            var employees = await db.Employees
                .Where(e => e.BranchId == req.BranchId && e.Status == EmployeeStatus.Active)
                .ToListAsync(ct);

            var startDate = new DateOnly(req.Year, req.Month, 1);
            var endDate = startDate.AddMonths(1).AddDays(-1);

            var attendance = await db.Attendance
                .Where(a => a.Date >= startDate && a.Date <= endDate &&
                            employees.Select(e => e.Id).Contains(a.EmployeeId))
                .ToListAsync(ct);

            int count = 0;
            foreach (var emp in employees)
            {
                var empAtt = attendance.Where(a => a.EmployeeId == emp.Id).ToList();
                var present = empAtt.Count(a => a.Status is AttendanceStatus.Present or AttendanceStatus.DoubleShift);
                var half = empAtt.Count(a => a.Status == AttendanceStatus.HalfDay);
                var dbl = empAtt.Count(a => a.Status == AttendanceStatus.DoubleShift);
                var effectiveDays = present - half * 0.5m + dbl; // double shift adds extra day
                var pay = Math.Round((emp.GrossSalary / 30m) * effectiveDays, 2);

                var existing = await db.PayrollEntries
                    .FirstOrDefaultAsync(p => p.EmployeeId == emp.Id && p.Month == req.Month && p.Year == req.Year, ct);

                if (existing != null)
                {
                    existing.DaysWorked = present; existing.DoubleShiftDays = dbl;
                    existing.CalculatedPay = pay; existing.Status = PayrollStatus.Pending;
                }
                else
                {
                    db.PayrollEntries.Add(new PayrollEntry
                    {
                        EmployeeId = emp.Id, Month = req.Month, Year = req.Year,
                        DaysWorked = present, DoubleShiftDays = dbl,
                        GrossSalary = emp.GrossSalary, CalculatedPay = pay,
                        CreatedById = currentUser.UserId
                    });
                }
                count++;
            }

            await db.SaveChangesAsync(ct);
            return count;
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// INCOME
// ═══════════════════════════════════════════════════════════════
namespace Hollies.Application.Features.Income.Commands
{
    public record CreateIncomeCommand(
        DateOnly Date, string Source, Guid PaymentMethodId,
        string Currency, decimal Amount) : IRequest<string>;

    public class CreateIncomeHandler(
        IApplicationDbContext db, ISequenceService seq, ICurrentUserService currentUser)
        : IRequestHandler<CreateIncomeCommand, string>
    {
        public async Task<string> Handle(CreateIncomeCommand req, CancellationToken ct)
        {
            var num = await seq.NextIncomeNumberAsync();
            db.Incomes.Add(new Hollies.Domain.Entities.Income
            {
                IncomeNumber = num, Date = req.Date, Source = req.Source,
                PaymentMethodId = req.PaymentMethodId,
                Currency = Enum.Parse<Currency>(req.Currency, true),
                Amount = req.Amount, CreatedById = currentUser.UserId
            });
            await db.SaveChangesAsync(ct);
            return num;
        }
    }

    public record ApproveIncomeCommand(string IncomeNumber, bool Approve, string? Reason) : IRequest<Unit>;

    public class ApproveIncomeHandler(IApplicationDbContext db, ICurrentUserService currentUser)
        : IRequestHandler<ApproveIncomeCommand, Unit>
    {
        public async Task<Unit> Handle(ApproveIncomeCommand req, CancellationToken ct)
        {
            var income = await db.Incomes.Include(i => i.PaymentMethod)
                .FirstOrDefaultAsync(i => i.IncomeNumber == req.IncomeNumber, ct)
                ?? throw new NotFoundException("Income", req.IncomeNumber);

            if (req.Approve)
            {
                income.Status = IncomeStatus.Approved;
                income.ApprovedById = currentUser.UserId;
                income.PaymentMethod.Balance += income.Amount;
                income.PaymentMethod.IncomeTotal += income.Amount;
            }
            else
            {
                if (string.IsNullOrWhiteSpace(req.Reason))
                    throw new BusinessRuleException("Rejection reason is required.");
                income.Status = IncomeStatus.Rejected;
                income.RejectionReason = req.Reason;
                income.IsFlagged = true;
            }

            await db.SaveChangesAsync(ct);
            return Unit.Value;
        }
    }
}
