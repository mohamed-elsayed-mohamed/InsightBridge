namespace InsightBridge.Domain.Interfaces
{
    public interface IScheduledReportService
    {
        Task ExecuteAsync(System.Threading.CancellationToken stoppingToken);
    }
}