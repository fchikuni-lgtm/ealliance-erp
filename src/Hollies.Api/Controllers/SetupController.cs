using BCrypt.Net;
using Hollies.Application.Common.Interfaces;
using Hollies.Domain.Entities;
using Hollies.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Hollies.Api.Controllers;

// ── Setup Controller ─────────────────────────────────────────────
// Handles first-time setup. Disabled permanently after first admin is created.
[Route("api/setup")]
[ApiController]
public class SetupController(IApplicationDbContext db) : ControllerBase
{
    // Check if setup is needed
    [HttpGet("status")]
    [AllowAnonymous]
    public async Task<IActionResult> Status(CancellationToken ct)
    {
        var hasUsers = await db.Users.AnyAsync(u => u.Active, ct);
        return Ok(new { setupComplete = hasUsers });
    }

    // Create first admin — only works when zero users exist
    [HttpPost]
    [AllowAnonymous]
    public async Task<IActionResult> CreateAdmin([FromBody] SetupRequest req, CancellationToken ct)
    {
        // Block if already set up
        var hasUsers = await db.Users.AnyAsync(ct);
        if (hasUsers)
            return BadRequest(new { message = "Setup already complete. This endpoint is disabled." });

        if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Password))
            return BadRequest(new { message = "Email and password are required." });

        var admin = new User
        {
            Name        = req.Name,
            Initials    = string.Concat(req.Name.Split(' ').Select(n => n.Length > 0 ? n[0].ToString().ToUpper() : "")),
            Email       = req.Email.ToLower().Trim(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
            Role        = UserRole.Admin,
            Permissions = ["create","review","approve","pay","acquit","audit","reverse","flag","unflag","income_approve"],
            Active      = true
        };

        db.Users.Add(admin);
        await db.SaveChangesAsync(ct);

        return Ok(new { message = "Admin created successfully.", userId = admin.Id });
    }

    // Create additional users during setup (requires auth token from admin login)
    [HttpPost("user")]
    [Authorize]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserRequest req, CancellationToken ct)
    {
        var exists = await db.Users.AnyAsync(u => u.Email == req.Email.ToLower(), ct);
        if (exists) return Conflict(new { message = $"User with email {req.Email} already exists." });

        var permsMap = new Dictionary<string, List<string>>
        {
            ["Reviewer"]        = ["review"],
            ["Approver"]        = ["review","approve"],
            ["AccountsManager"] = ["review","approve","pay","acquit","income_approve"],
            ["HrOfficer"]       = ["create","review"],
            ["BranchManager"]   = ["create","review"],
            ["Cashier"]         = ["create"],
            ["Admin"]           = ["create","review","approve","pay","acquit","audit","reverse","flag","unflag","income_approve"],
        };

        var role = Enum.TryParse<UserRole>(req.Role, out var r) ? r : UserRole.Cashier;
        var perms = req.Permissions?.Count > 0 ? req.Permissions : (permsMap.TryGetValue(req.Role, out var p) ? p : ["create"]);

        var user = new User
        {
            Name         = req.Name,
            Initials     = string.Concat(req.Name.Split(' ').Select(n => n.Length > 0 ? n[0].ToString().ToUpper() : "")),
            Email        = req.Email.ToLower().Trim(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
            Role         = role,
            Permissions  = perms,
            Active       = true
        };

        db.Users.Add(user);
        await db.SaveChangesAsync(ct);
        return Ok(new { message = "User created.", userId = user.Id });
    }
}

// ── Users Management Controller ──────────────────────────────────
// In-app user management so Biggie never needs to use Swagger or any external tool
[Route("api/users")]
[Authorize]
public class UsersController(IApplicationDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var users = await db.Users
            .Where(u => u.Active)
            .OrderBy(u => u.Name)
            .Select(u => new UserListDto(
                u.Id, u.Name, u.Initials, u.Email,
                u.Role.ToString(), u.Permissions,
                u.BranchId.HasValue ? u.BranchId.Value.ToString() : null,
                u.Branch != null ? u.Branch.Name : null,
                u.Active))
            .ToListAsync(ct);
        return Ok(users);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] CreateUserRequest req, CancellationToken ct)
    {
        var exists = await db.Users.AnyAsync(u => u.Email == req.Email.ToLower(), ct);
        if (exists) return Conflict(new { message = "A user with this email already exists." });

        var role = Enum.TryParse<UserRole>(req.Role, out var r) ? r : UserRole.Cashier;
        var user = new User
        {
            Name         = req.Name,
            Initials     = string.Concat(req.Name.Split(' ').Select(n => n.Length > 0 ? n[0].ToString().ToUpper() : "")),
            Email        = req.Email.ToLower().Trim(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
            Role         = role,
            Permissions  = req.Permissions ?? [],
            WhatsApp     = req.WhatsApp,
            BranchId     = req.BranchId,
            Active       = true
        };
        db.Users.Add(user);
        await db.SaveChangesAsync(ct);
        return Ok(new { message = "User created.", userId = user.Id });
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateUserRequest req, CancellationToken ct)
    {
        var user = await db.Users.FindAsync([id], ct);
        if (user == null) return NotFound();

        user.Name        = req.Name ?? user.Name;
        user.Role        = req.Role != null && Enum.TryParse<UserRole>(req.Role, out var r) ? r : user.Role;
        user.Permissions = req.Permissions ?? user.Permissions;
        user.WhatsApp    = req.WhatsApp ?? user.WhatsApp;
        user.BranchId    = req.BranchId ?? user.BranchId;

        if (!string.IsNullOrWhiteSpace(req.NewPassword))
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.NewPassword);

        await db.SaveChangesAsync(ct);
        return Ok(new { message = "User updated." });
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Deactivate(Guid id, CancellationToken ct)
    {
        var user = await db.Users.FindAsync([id], ct);
        if (user == null) return NotFound();
        user.Active = false;
        await db.SaveChangesAsync(ct);
        return Ok(new { message = "User deactivated." });
    }

    [HttpPost("{id}/reset-password")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> ResetPassword(Guid id, [FromBody] ResetPasswordRequest req, CancellationToken ct)
    {
        var user = await db.Users.FindAsync([id], ct);
        if (user == null) return NotFound();
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.NewPassword);
        await db.SaveChangesAsync(ct);
        return Ok(new { message = "Password reset." });
    }
}

// ── DTOs for these controllers ────────────────────────────────────
public record SetupRequest(string Name, string Email, string Password, string Role, List<string>? Permissions);
public record CreateUserRequest(string Name, string Email, string Password, string Role, List<string>? Permissions, string? WhatsApp, Guid? BranchId);
public record UpdateUserRequest(string? Name, string? Role, List<string>? Permissions, string? WhatsApp, Guid? BranchId, string? NewPassword);
public record ResetPasswordRequest(string NewPassword);
public record UserListDto(Guid Id, string Name, string Initials, string Email, string Role, List<string> Permissions, string? BranchId, string? BranchName, bool Active);
