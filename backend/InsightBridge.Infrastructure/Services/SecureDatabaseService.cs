using InsightBridge.Domain.Interfaces;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Logging;
using System.Data;

namespace InsightBridge.Infrastructure.Services
{
    public class SecureDatabaseService
    {
        private readonly IPermissionService _permissionService;
        private readonly ILogger<SecureDatabaseService> _logger;

        public SecureDatabaseService(
            IPermissionService permissionService,
            ILogger<SecureDatabaseService> logger)
        {
            _permissionService = permissionService;
            _logger = logger;
        }

        public async Task<DataTable> ExecuteQueryAsync(string userId, string connectionString, string query)
        {
            try
            {
                // Validate permissions before executing the query
                await _permissionService.ValidateQueryPermissionsAsync(connectionString, userId, query);

                using var connection = new SqlConnection(connectionString);
                await connection.OpenAsync();

                using var command = new SqlCommand(query, connection);
                using var reader = await command.ExecuteReaderAsync();

                var dataTable = new DataTable();
                dataTable.Load(reader);

                return dataTable;
            }
            catch (UnauthorizedAccessException)
            {
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error executing query");
                throw new Exception($"Database error: {ex.Message}", ex);
            }
        }

        public async Task<int> ExecuteNonQueryAsync(string userId, string connectionString, string query)
        {
            try
            {
                // Validate permissions before executing the query
                await _permissionService.ValidateQueryPermissionsAsync(connectionString, userId, query);

                using var connection = new SqlConnection(connectionString);
                await connection.OpenAsync();

                using var command = new SqlCommand(query, connection);
                return await command.ExecuteNonQueryAsync();
            }
            catch (UnauthorizedAccessException)
            {
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error executing non-query");
                throw new Exception($"Database error: {ex.Message}", ex);
            }
        }

        public async Task<object> ExecuteScalarAsync(string userId, string connectionString, string query)
        {
            try
            {
                // Validate permissions before executing the query
                await _permissionService.ValidateQueryPermissionsAsync(connectionString, userId, query);

                using var connection = new SqlConnection(connectionString);
                await connection.OpenAsync();

                using var command = new SqlCommand(query, connection);
                return await command.ExecuteScalarAsync();
            }
            catch (UnauthorizedAccessException)
            {
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error executing scalar query");
                throw new Exception($"Database error: {ex.Message}", ex);
            }
        }
    }
}