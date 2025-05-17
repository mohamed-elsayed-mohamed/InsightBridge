using InsightBridge.Domain.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace InsightBridge.Infrastructure.Data;

public class DbSeeder
{
    private readonly ApplicationDbContext _context;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly RoleManager<IdentityRole> _roleManager;
    private readonly ILogger<DbSeeder> _logger;

    public DbSeeder(
        ApplicationDbContext context,
        UserManager<ApplicationUser> userManager,
        RoleManager<IdentityRole> roleManager,
        ILogger<DbSeeder> logger)
    {
        _context = context;
        _userManager = userManager;
        _roleManager = roleManager;
        _logger = logger;
    }

    public async Task SeedAsync()
    {
        try
        {
            // Ensure database is created and migrations are applied
            await _context.Database.MigrateAsync();

            // Seed roles if they don't exist
            await SeedRolesAsync();

            // Seed users if they don't exist
            await SeedUsersAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while seeding the database.");
            throw;
        }
    }

    private async Task SeedRolesAsync()
    {
        var roles = new[] { "Admin", "User" };

        foreach (var role in roles)
        {
            if (!await _roleManager.RoleExistsAsync(role))
            {
                await _roleManager.CreateAsync(new IdentityRole(role));
                _logger.LogInformation($"Created role: {role}");
            }
        }
    }

    private async Task SeedUsersAsync()
    {
        // Check if any users exist
        if (await _userManager.Users.AnyAsync())
        {
            _logger.LogInformation("Users already exist, skipping user seeding.");
            return;
        }

        // Create admin user
        var adminUser = new ApplicationUser
        {
            UserName = "admin@insightbridge.com",
            Email = "admin@insightbridge.com",
            EmailConfirmed = true,
            FirstName = "Admin",
            LastName = "User",
            CreatedAt = DateTime.UtcNow,
            IsActive = true
        };

        var result = await _userManager.CreateAsync(adminUser, "Admin123!");
        if (result.Succeeded)
        {
            await _userManager.AddToRoleAsync(adminUser, "Admin");
            _logger.LogInformation("Created admin user");
        }
        else
        {
            _logger.LogError($"Failed to create admin user: {string.Join(", ", result.Errors.Select(e => e.Description))}");
        }

        // Create regular user
        var regularUser = new ApplicationUser
        {
            UserName = "user@insightbridge.com",
            Email = "user@insightbridge.com",
            EmailConfirmed = true,
            FirstName = "Regular",
            LastName = "User",
            CreatedAt = DateTime.UtcNow,
            IsActive = true
        };

        result = await _userManager.CreateAsync(regularUser, "User123!");
        if (result.Succeeded)
        {
            await _userManager.AddToRoleAsync(regularUser, "User");
            _logger.LogInformation("Created regular user");
        }
        else
        {
            _logger.LogError($"Failed to create regular user: {string.Join(", ", result.Errors.Select(e => e.Description))}");
        }
    }
}