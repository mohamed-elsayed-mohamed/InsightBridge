using ClosedXML.Excel;
using InsightBridge.Domain.Interfaces;
using InsightBridge.Infrastructure.Data;
using iText.Layout;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using PuppeteerSharp;
using System.Data;
using System.Text;
using System.Text.Json;

namespace InsightBridge.Infrastructure.Services
{
    public class ScheduledReportService : BackgroundService, IScheduledReportService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly IEmailService _emailService;
        private readonly ILogger<ScheduledReportService> _logger;

        public ScheduledReportService(
            IServiceProvider serviceProvider,
            IEmailService emailService,
            ILogger<ScheduledReportService> logger)
        {
            _serviceProvider = serviceProvider;
            _emailService = emailService;
            _logger = logger;
        }

        private async Task<byte[]> GeneratePdf(DataTable data)
        {
            try
            {
                var html = new StringBuilder();
                html.AppendLine("<!DOCTYPE html>");
                html.AppendLine("<html><head>");
                html.AppendLine("<script src='https://cdn.jsdelivr.net/npm/chart.js'></script>");
                html.AppendLine("<style>");
                html.AppendLine("body { font-family: Arial, sans-serif; margin: 20px; }");
                html.AppendLine("h1 { color: #333; text-align: center; }");
                html.AppendLine("table { width: 100%; border-collapse: collapse; margin-top: 20px; }");
                html.AppendLine("th { background-color: #f5f5f5; padding: 8px; text-align: left; border: 1px solid #ddd; }");
                html.AppendLine("td { padding: 8px; border: 1px solid #ddd; }");
                html.AppendLine("tr:nth-child(even) { background-color: #f9f9f9; }");
                html.AppendLine(".metadata { margin-top: 20px; padding: 10px; background-color: #f5f5f5; border-radius: 5px; }");
                html.AppendLine(".chart-container { margin: 20px 0; height: 300px; }");
                html.AppendLine("</style></head><body>");

                html.AppendLine($"<h1>Report Generated on {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC</h1>");

                // Generate charts for numeric columns
                var numericColumns = data.Columns.Cast<DataColumn>()
                    .Where(c => data.Rows.Count > 0 && data.Rows[0][c] is IConvertible &&
                           (data.Rows[0][c] is int || data.Rows[0][c] is double || data.Rows[0][c] is decimal))
                    .ToList();

                foreach (var column in numericColumns)
                {
                    html.AppendLine($"<div class='chart-container'>");
                    html.AppendLine($"<canvas id='chart_{column.ColumnName}'></canvas>");
                    html.AppendLine("</div>");
                    html.AppendLine("<script>");
                    html.AppendLine("(async () => {");
                    html.AppendLine($"const ctx = document.getElementById('chart_{column.ColumnName}');");
                    html.AppendLine("new Chart(ctx, {");
                    html.AppendLine("type: 'bar',");
                    html.AppendLine("data: {");
                    html.AppendLine("labels: " + JsonSerializer.Serialize(data.Rows.Cast<DataRow>().Select(r => r[0].ToString()).ToArray()) + ",");
                    html.AppendLine("datasets: [{");
                    html.AppendLine($"label: '{column.ColumnName}',");
                    html.AppendLine("data: " + JsonSerializer.Serialize(data.Rows.Cast<DataRow>().Select(r => Convert.ToDouble(r[column])).ToArray()) + ",");
                    html.AppendLine("backgroundColor: 'rgba(54, 162, 235, 0.5)',");
                    html.AppendLine("borderColor: 'rgba(54, 162, 235, 1)',");
                    html.AppendLine("borderWidth: 1");
                    html.AppendLine("}]");
                    html.AppendLine("},");
                    html.AppendLine("options: {");
                    html.AppendLine("responsive: true,");
                    html.AppendLine("maintainAspectRatio: false,");
                    html.AppendLine("scales: {");
                    html.AppendLine("y: {");
                    html.AppendLine("beginAtZero: true");
                    html.AppendLine("}");
                    html.AppendLine("}");
                    html.AppendLine("}");
                    html.AppendLine("});");
                    html.AppendLine("})();");
                    html.AppendLine("</script>");
                }

                // Add table
                html.AppendLine("<table><thead><tr>");
                foreach (DataColumn column in data.Columns)
                {
                    html.AppendLine($"<th>{column.ColumnName}</th>");
                }
                html.AppendLine("</tr></thead><tbody>");

                foreach (DataRow row in data.Rows)
                {
                    html.AppendLine("<tr>");
                    foreach (var item in row.ItemArray)
                    {
                        html.AppendLine($"<td>{item?.ToString() ?? string.Empty}</td>");
                    }
                    html.AppendLine("</tr>");
                }

                html.AppendLine("</tbody></table>");

                // Add metadata
                html.AppendLine("<div class='metadata'>");
                html.AppendLine("<h3>Report Metadata</h3>");
                html.AppendLine($"<p>Total Records: {data.Rows.Count}</p>");
                html.AppendLine($"<p>Generated: {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC</p>");
                html.AppendLine($"<p>Columns: {string.Join(", ", data.Columns.Cast<DataColumn>().Select(c => c.ColumnName))}</p>");
                html.AppendLine("</div></body></html>");

                await new BrowserFetcher().DownloadAsync();
                using var browser = await Puppeteer.LaunchAsync(new LaunchOptions { Headless = true });
                using var page = await browser.NewPageAsync();
                await page.SetContentAsync(html.ToString());

                // Wait for charts to render
                await Task.Delay(1000);

                return await page.PdfDataAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating PDF");
                throw new Exception($"PDF Generation Error: {ex.Message}", ex);
            }
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                using (var scope = _serviceProvider.CreateScope())
                {
                    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                    var now = DateTime.UtcNow;

                    // Get reports that are due to run
                    var dueReports = await db.ScheduledReports
                        .Include(r => r.DatabaseConnection)
                        .Where(r => r.Status == "Scheduled" &&
                            (r.NextRunTime <= now || r.ScheduledTimeUtc <= now))
                        .ToListAsync(stoppingToken);

                    foreach (var report in dueReports)
                    {
                        try
                        {
                            if (report.DatabaseConnection == null)
                            {
                                throw new Exception("Database connection not found");
                            }

                            // Execute the SQL query
                            using var connection = new SqlConnection(report.DatabaseConnection.ConnectionString);
                            await connection.OpenAsync(stoppingToken);
                            using var command = new SqlCommand(report.SqlQuery, connection);

                            // Load data into DataTable
                            var dataTable = new DataTable();
                            using var reader = await command.ExecuteReaderAsync(stoppingToken);
                            dataTable.Load(reader);

                            byte[] fileBytes;
                            string fileName;
                            string mimeType;

                            if (report.Format.ToLower() == "pdf")
                            {
                                try
                                {
                                    fileBytes = await GeneratePdf(dataTable);
                                    fileName = $"report_{DateTime.UtcNow:yyyyMMdd_HHmmss}.pdf";
                                    mimeType = "application/pdf";
                                }
                                catch (Exception pdfEx)
                                {
                                    throw new Exception($"PDF Generation Error: {pdfEx.Message}", pdfEx);
                                }
                            }
                            else
                            {
                                // Generate Excel
                                using var workbook = new XLWorkbook();
                                var worksheet = workbook.Worksheets.Add("Report");

                                // Add headers
                                for (int i = 0; i < dataTable.Columns.Count; i++)
                                {
                                    worksheet.Cell(1, i + 1).Value = dataTable.Columns[i].ColumnName;
                                }

                                // Add data
                                for (int row = 0; row < dataTable.Rows.Count; row++)
                                {
                                    for (int col = 0; col < dataTable.Columns.Count; col++)
                                    {
                                        worksheet.Cell(row + 2, col + 1).Value = dataTable.Rows[row][col].ToString();
                                    }
                                }

                                using var ms = new MemoryStream();
                                workbook.SaveAs(ms);
                                ms.Position = 0;
                                fileBytes = ms.ToArray();
                                fileName = $"report_{DateTime.UtcNow:yyyyMMdd_HHmmss}.xlsx";
                                mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                            }

                            // Send email
                            await _emailService.SendEmailAsync(
                                report.Email,
                                "Your Scheduled Report",
                                "Please find your scheduled report attached.",
                                fileBytes,
                                fileName,
                                mimeType
                            );

                            // Update report status and calculate next run time
                            report.LastRunTime = now;
                            report.CalculateNextRunTime();

                            if (report.NextRunTime == null)
                            {
                                report.Status = "Completed";
                            }
                            else
                            {
                                report.Status = "Scheduled";
                            }

                            db.ScheduledReports.Update(report);
                            await db.SaveChangesAsync(stoppingToken);
                        }
                        catch (Exception ex)
                        {
                            var errorMessage = $"Error: {ex.Message}";
                            if (ex.InnerException != null)
                            {
                                errorMessage += $" Inner Error: {ex.InnerException.Message}";
                            }
                            report.Status = errorMessage;
                            db.ScheduledReports.Update(report);
                            await db.SaveChangesAsync(stoppingToken);
                        }
                    }
                }

                // Wait for 1 minute before checking again
                await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
            }
        }

        // Explicit interface implementation for IScheduledReportService
        async Task IScheduledReportService.ExecuteAsync(CancellationToken stoppingToken)
        {
            await ExecuteAsync(stoppingToken);
        }
    }
}