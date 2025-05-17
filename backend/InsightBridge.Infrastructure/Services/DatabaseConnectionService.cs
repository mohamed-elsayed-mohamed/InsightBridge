using InsightBridge.Application.Interfaces;
using InsightBridge.Domain.Models;
using InsightBridge.Infrastructure.Data;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using MySql.Data.MySqlClient;
using Npgsql;
using System.Data.Common;

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

    public async Task<DatabaseSchema> GetDatabaseSchemaAsync(string connectionString)
    {
        var schema = new DatabaseSchema();
        try
        {
            // Get tables
            schema.Tables = await GetTablesAsync(connectionString);

            // Get views
            schema.Views = await GetViewsAsync(connectionString);

            // Get stored procedures
            schema.StoredProcedures = await GetStoredProceduresAsync(connectionString);

            return schema;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving database schema");
            throw;
        }
    }

    private async Task<List<TableInfo>> GetTablesAsync(string connectionString)
    {
        var tables = new List<TableInfo>();
        string query = @"
            SELECT 
                t.name AS TableName,
                s.name AS SchemaName,
                p.rows AS [RowCount]
            FROM sys.tables t
            INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
            INNER JOIN sys.partitions p ON t.object_id = p.object_id
            WHERE p.index_id IN (0,1)
            ORDER BY s.name, t.name";

        using var connection = GetDbConnection(connectionString);
        await connection.OpenAsync();

        using var command = connection.CreateCommand();
        command.CommandText = query;

        using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            tables.Add(new TableInfo
            {
                Name = reader.GetString(0),
                Schema = reader.GetString(1),
                RowCount = reader.GetInt64(2),
                Columns = new List<ColumnInfo>() // Initialize empty columns list
            });
        }

        // Get columns for all tables in a separate step
        foreach (var table in tables)
        {
            table.Columns = await GetTableColumnsAsync(connectionString, table.Name, table.Schema);
        }

        return tables;
    }

    private async Task<List<ColumnInfo>> GetTableColumnsAsync(string connectionString, string tableName, string schema)
    {
        var columns = new List<ColumnInfo>();
        string query = @"
            SELECT 
                c.name AS ColumnName,
                t.name AS DataType,
                c.max_length AS MaxLength,
                CAST(c.is_nullable AS bit) AS IsNullable,
                CAST(CASE WHEN pk.column_id IS NOT NULL THEN 1 ELSE 0 END AS bit) AS IsPrimaryKey
            FROM sys.columns c
            INNER JOIN sys.types t ON c.user_type_id = t.user_type_id
            LEFT JOIN (
                SELECT ic.column_id, ic.object_id
                FROM sys.index_columns ic
                INNER JOIN sys.indexes i ON ic.object_id = i.object_id AND ic.index_id = i.index_id
                WHERE i.is_primary_key = 1
            ) pk ON c.object_id = pk.object_id AND c.column_id = pk.column_id
            WHERE c.object_id = OBJECT_ID(@TableName)
            ORDER BY c.column_id";

        using var connection = GetDbConnection(connectionString);
        await connection.OpenAsync();

        using var command = connection.CreateCommand();
        command.CommandText = query;
        command.Parameters.Add(new SqlParameter("@TableName", $"{schema}.{tableName}"));

        using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            columns.Add(new ColumnInfo
            {
                Name = reader.GetString(0),
                DataType = reader.GetString(1),
                MaxLength = reader.IsDBNull(2) ? null : (int?)reader.GetInt16(2),
                IsNullable = reader.GetBoolean(3),
                IsPrimaryKey = reader.GetBoolean(4)
            });
        }

        return columns;
    }

    private async Task<List<ViewInfo>> GetViewsAsync(string connectionString)
    {
        var views = new List<ViewInfo>();
        string query = @"
            SELECT 
                v.name AS ViewName,
                s.name AS SchemaName,
                OBJECT_DEFINITION(v.object_id) AS Definition
            FROM sys.views v
            INNER JOIN sys.schemas s ON v.schema_id = s.schema_id
            ORDER BY s.name, v.name";

        using var connection = GetDbConnection(connectionString);
        await connection.OpenAsync();

        using var command = connection.CreateCommand();
        command.CommandText = query;

        using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            views.Add(new ViewInfo
            {
                Name = reader.GetString(0),
                Schema = reader.GetString(1),
                Definition = reader.GetString(2)
            });
        }

        return views;
    }

    private async Task<List<StoredProcedureInfo>> GetStoredProceduresAsync(string connectionString)
    {
        var procedures = new List<StoredProcedureInfo>();
        string query = @"
            SELECT 
                p.name AS ProcedureName,
                s.name AS SchemaName,
                OBJECT_DEFINITION(p.object_id) AS Definition
            FROM sys.procedures p
            INNER JOIN sys.schemas s ON p.schema_id = s.schema_id
            ORDER BY s.name, p.name";

        using var connection = GetDbConnection(connectionString);
        await connection.OpenAsync();

        using var command = connection.CreateCommand();
        command.CommandText = query;

        using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            procedures.Add(new StoredProcedureInfo
            {
                Name = reader.GetString(0),
                Schema = reader.GetString(1),
                Definition = reader.GetString(2)
            });
        }

        return procedures;
    }

    private DbConnection GetDbConnection(string connectionString)
    {
        if (connectionString.Contains("Server=", StringComparison.OrdinalIgnoreCase) &&
            !connectionString.Contains("Host=", StringComparison.OrdinalIgnoreCase))
        {
            return new SqlConnection(connectionString);
        }
        else if (connectionString.Contains("Host=", StringComparison.OrdinalIgnoreCase))
        {
            return new NpgsqlConnection(connectionString);
        }
        else
        {
            return new MySqlConnection(connectionString);
        }
    }
}