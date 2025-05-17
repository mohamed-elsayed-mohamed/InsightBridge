using InsightBridge.Domain.Models;

namespace InsightBridge.Application.Interfaces;

public interface IDatabaseConnectionService
{
    Task<DatabaseConnection> CreateConnectionAsync(DatabaseConnection connection);
    Task<DatabaseConnection?> GetConnectionByIdAsync(int id);
    Task<IEnumerable<DatabaseConnection>> GetAllConnectionsAsync();
    Task<bool> TestConnectionAsync(string connectionString);
    Task<bool> UpdateConnectionAsync(DatabaseConnection connection);
    Task<bool> DeleteConnectionAsync(int id);
    Task<DatabaseSchema> GetDatabaseSchemaAsync(string connectionString);
}