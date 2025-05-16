using InsightBridge.Application.Interfaces;
using InsightBridge.Domain.Models;
using InsightBridge.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using Microsoft.Extensions.Logging;

namespace InsightBridge.Infrastructure.Services;

public class UserPermissionService : IUserPermissionService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<UserPermissionService> _logger;

    public UserPermissionService(ApplicationDbContext context, ILogger<UserPermissionService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<UserPermission> CreatePermissionAsync(UserPermission permission)
    {
        try
        {
            permission.CreatedAt = DateTime.UtcNow;
            _context.UserPermissions.Add(permission);
            await _context.SaveChangesAsync();
            return permission;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating user permission");
            throw;
        }
    }

    public async Task<UserPermission?> GetPermissionByIdAsync(int id)
    {
        return await _context.UserPermissions
            .Include(p => p.User)
            .Include(p => p.DatabaseConnection)
            .FirstOrDefaultAsync(p => p.Id == id);
    }

    public async Task<IEnumerable<UserPermission>> GetUserPermissionsAsync(string userId)
    {
        return await _context.UserPermissions
            .Include(p => p.DatabaseConnection)
            .Where(p => p.UserId == userId)
            .ToListAsync();
    }

    public async Task<IEnumerable<UserPermission>> GetDatabasePermissionsAsync(int databaseConnectionId)
    {
        return await _context.UserPermissions
            .Include(p => p.User)
            .Where(p => p.DatabaseConnectionId == databaseConnectionId)
            .ToListAsync();
    }

    public async Task<bool> UpdatePermissionAsync(UserPermission permission)
    {
        try
        {
            var existingPermission = await _context.UserPermissions.FindAsync(permission.Id);
            if (existingPermission == null)
                return false;

            permission.LastModifiedAt = DateTime.UtcNow;
            _context.Entry(existingPermission).CurrentValues.SetValues(permission);
            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating user permission");
            throw;
        }
    }

    public async Task<bool> DeletePermissionAsync(int id)
    {
        try
        {
            var permission = await _context.UserPermissions.FindAsync(id);
            if (permission == null)
                return false;

            _context.UserPermissions.Remove(permission);
            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting user permission");
            throw;
        }
    }

    public async Task<bool> HasDatabaseAccessAsync(string userId, int databaseConnectionId)
    {
        return await _context.UserPermissions
            .AnyAsync(p => p.UserId == userId && p.DatabaseConnectionId == databaseConnectionId);
    }

    public async Task<bool> HasTableAccessAsync(string userId, int databaseConnectionId, string tableName)
    {
        var permission = await _context.UserPermissions
            .FirstOrDefaultAsync(p => p.UserId == userId && p.DatabaseConnectionId == databaseConnectionId);

        if (permission == null || string.IsNullOrEmpty(permission.AllowedTables))
            return false;

        try
        {
            var allowedTables = JsonSerializer.Deserialize<List<string>>(permission.AllowedTables);
            return allowedTables?.Contains(tableName) ?? false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking table access");
            return false;
        }
    }

    public async Task<bool> HasColumnAccessAsync(string userId, int databaseConnectionId, string tableName, string columnName)
    {
        var permission = await _context.UserPermissions
            .FirstOrDefaultAsync(p => p.UserId == userId && p.DatabaseConnectionId == databaseConnectionId);

        if (permission == null || string.IsNullOrEmpty(permission.AllowedColumns))
            return false;

        try
        {
            var allowedColumns = JsonSerializer.Deserialize<Dictionary<string, List<string>>>(permission.AllowedColumns);
            return allowedColumns?.TryGetValue(tableName, out var columns) == true && 
                   columns?.Contains(columnName) == true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking column access");
            return false;
        }
    }
} 