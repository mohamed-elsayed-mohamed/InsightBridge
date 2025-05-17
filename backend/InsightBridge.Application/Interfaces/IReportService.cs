using InsightBridge.Domain.Models;

namespace InsightBridge.Application.Interfaces;

public interface IReportService
{
    Task<Report> CreateReportAsync(Report report);
    Task<Report?> GetReportByIdAsync(int id);
    Task<IEnumerable<Report>> GetAllReportsAsync();
    Task<IEnumerable<Report>> GetReportsByConnectionIdAsync(int connectionId);
    Task<bool> UpdateReportAsync(Report report);
    Task<bool> DeleteReportAsync(int id);
    Task<object> ExecuteReportAsync(int reportId);
}