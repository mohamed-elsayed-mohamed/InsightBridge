using Dapper;
using InsightBridge.Application.Interfaces;
using InsightBridge.Domain.Models;
using InsightBridge.Infrastructure.Data;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Data;

namespace InsightBridge.Infrastructure.Services;

public class ReportService : IReportService
{
    private readonly ApplicationDbContext _context;
    private readonly IDatabaseConnectionService _connectionService;
    private readonly ILogger<ReportService> _logger;

    public ReportService(
        ApplicationDbContext context,
        IDatabaseConnectionService connectionService,
        ILogger<ReportService> logger)
    {
        _context = context;
        _connectionService = connectionService;
        _logger = logger;
    }

    public async Task<Report> CreateReportAsync(Report report)
    {
        try
        {
            // Validate the query before saving
            await ValidateQueryAsync(report.Query, report.DatabaseConnectionId);

            report.CreatedAt = DateTime.UtcNow;
            _context.Reports.Add(report);
            await _context.SaveChangesAsync();
            return report;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating report");
            throw;
        }
    }

    public async Task<Report?> GetReportByIdAsync(int id)
    {
        return await _context.Reports
            .Include(r => r.DatabaseConnection)
            .FirstOrDefaultAsync(r => r.Id == id);
    }

    public async Task<IEnumerable<Report>> GetAllReportsAsync()
    {
        return await _context.Reports
            .Include(r => r.DatabaseConnection)
            .ToListAsync();
    }

    public async Task<IEnumerable<Report>> GetReportsByConnectionIdAsync(int connectionId)
    {
        return await _context.Reports
            .Include(r => r.DatabaseConnection)
            .Where(r => r.DatabaseConnectionId == connectionId)
            .ToListAsync();
    }

    public async Task<bool> UpdateReportAsync(Report report)
    {
        try
        {
            var existingReport = await _context.Reports.FindAsync(report.Id);
            if (existingReport == null)
                return false;

            // Validate the query before updating
            await ValidateQueryAsync(report.Query, report.DatabaseConnectionId);

            _context.Entry(existingReport).CurrentValues.SetValues(report);
            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating report");
            throw;
        }
    }

    public async Task<bool> DeleteReportAsync(int id)
    {
        try
        {
            var report = await _context.Reports.FindAsync(id);
            if (report == null)
                return false;

            _context.Reports.Remove(report);
            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting report");
            throw;
        }
    }

    public async Task<object> ExecuteReportAsync(int reportId)
    {
        try
        {
            var report = await GetReportByIdAsync(reportId);
            if (report == null)
                throw new ArgumentException("Report not found");

            var connection = await _connectionService.GetConnectionByIdAsync(report.DatabaseConnectionId);
            if (connection == null)
                throw new ArgumentException("Database connection not found");

            using var dbConnection = new SqlConnection(connection.ConnectionString);
            await dbConnection.OpenAsync();

            // Execute the query with a timeout
            var result = await dbConnection.QueryAsync(report.Query, commandTimeout: 300); // 5 minutes timeout
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error executing report {ReportId}", reportId);
            throw;
        }
    }

    private async Task ValidateQueryAsync(string query, int connectionId)
    {
        var connection = await _connectionService.GetConnectionByIdAsync(connectionId);
        if (connection == null)
            throw new ArgumentException("Database connection not found");

        using var dbConnection = new SqlConnection(connection.ConnectionString);
        await dbConnection.OpenAsync();

        // Create a command to validate the query
        using var command = dbConnection.CreateCommand();
        command.CommandText = query;
        command.CommandTimeout = 30; // 30 seconds timeout for validation

        try
        {
            // Try to prepare the command to validate the query
            command.Prepare();
        }
        catch (Exception ex)
        {
            throw new ArgumentException($"Invalid query: {ex.Message}");
        }
    }
}