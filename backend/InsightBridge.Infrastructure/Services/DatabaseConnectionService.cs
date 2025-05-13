using InsightBridge.Application.Interfaces;
using InsightBridge.Domain.Models;
using Microsoft.EntityFrameworkCore;
using InsightBridge.Infrastructure.Data;
using System.Data;
using Microsoft.Data.SqlClient;
using Npgsql;
using MySql.Data.MySqlClient;
using Microsoft.Extensions.Logging;

namespace InsightBridge.Infrastructure.Services;

public class DatabaseConnectionService : IDatabaseConnectionService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<DatabaseConnectionService> _logger;

    public DatabaseConnectionService(ApplicationDbContext context, ILogger<DatabaseConnectionService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<DatabaseConnection> CreateConnectionAsync(DatabaseConnection connection)
    {
        try
        {
            // Test the connection before saving
            if (!await TestConnectionAsync(connection.ConnectionString))
            {
                throw new Exception("Invalid connection string");
            }

            connection.CreatedAt = DateTime.UtcNow;
            _context.DatabaseConnections.Add(connection);
            await _context.SaveChangesAsync();
            return connection;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating database connection");
            throw;
        }
    }

    public async Task<DatabaseConnection?> GetConnectionByIdAsync(int id)
    {
        return await _context.DatabaseConnections.FindAsync(id);
    }

    public async Task<IEnumerable<DatabaseConnection>> GetAllConnectionsAsync()
    {
        return await _context.DatabaseConnections.ToListAsync();
    }

    public async Task<bool> TestConnectionAsync(string connectionString)
    {
        try
        {
            // Determine database type from connection string
            if (connectionString.Contains("Server=", StringComparison.OrdinalIgnoreCase))
            {
                using var connection = new SqlConnection(connectionString);
                await connection.OpenAsync();
                return true;
            }
            else if (connectionString.Contains("Host=", StringComparison.OrdinalIgnoreCase))
            {
                using var connection = new NpgsqlConnection(connectionString);
                await connection.OpenAsync();
                return true;
            }
            else if (connectionString.Contains("Server=", StringComparison.OrdinalIgnoreCase) && 
                     connectionString.Contains("Database=", StringComparison.OrdinalIgnoreCase))
            {
                using var connection = new MySqlConnection(connectionString);
                await connection.OpenAsync();
                return true;
            }
            else
            {
                throw new Exception("Unsupported database type");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error testing database connection");
            return false;
        }
    }

    public async Task<bool> UpdateConnectionAsync(DatabaseConnection connection)
    {
        try
        {
            var existingConnection = await _context.DatabaseConnections.FindAsync(connection.Id);
            if (existingConnection == null)
                return false;

            // Test the new connection string before updating
            if (!await TestConnectionAsync(connection.ConnectionString))
            {
                throw new Exception("Invalid connection string");
            }

            _context.Entry(existingConnection).CurrentValues.SetValues(connection);
            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating database connection");
            throw;
        }
    }

    public async Task<bool> DeleteConnectionAsync(int id)
    {
        try
        {
            var connection = await _context.DatabaseConnections.FindAsync(id);
            if (connection == null)
                return false;

            _context.DatabaseConnections.Remove(connection);
            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting database connection");
            throw;
        }
    }
} 