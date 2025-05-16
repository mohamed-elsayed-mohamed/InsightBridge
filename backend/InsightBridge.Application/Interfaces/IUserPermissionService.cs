using InsightBridge.Domain.Models;

namespace InsightBridge.Application.Interfaces;

public interface IUserPermissionService
{
    Task<UserPermission> CreatePermissionAsync(UserPermission permission);
    Task<UserPermission?> GetPermissionByIdAsync(int id);
    Task<IEnumerable<UserPermission>> GetUserPermissionsAsync(string userId);
    Task<IEnumerable<UserPermission>> GetDatabasePermissionsAsync(int databaseConnectionId);
    Task<bool> UpdatePermissionAsync(UserPermission permission);
    Task<bool> DeletePermissionAsync(int id);
    Task<bool> HasDatabaseAccessAsync(string userId, int databaseConnectionId);
    Task<bool> HasTableAccessAsync(string userId, int databaseConnectionId, string tableName);
    Task<bool> HasColumnAccessAsync(string userId, int databaseConnectionId, string tableName, string columnName);
} 