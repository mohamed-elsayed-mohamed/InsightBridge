using InsightBridge.Infrastructure.Data;
using InsightBridge.Domain.Models;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Data.SqlClient;
using ClosedXML.Excel;
using System.Data;
using System.Threading;
using System.Threading.Tasks;
using System;
using System.IO;
using System.Linq;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using iText.Kernel.Pdf;
using iText.Layout;
using iText.Layout.Element;
using iText.Kernel.Colors;
using iText.Layout.Properties;
using iText.IO.Font.Constants;
using iText.Kernel.Font;
using iText.Kernel.Pdf.Canvas.Draw;
using iText.Layout.Borders;
using System.Collections.Generic;

namespace InsightBridge.Infrastructure.Services
{
    public class ScheduledReportService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly IEmailService _emailService;

        public ScheduledReportService(IServiceProvider serviceProvider, IEmailService emailService)
        {
            _serviceProvider = serviceProvider;
            _emailService = emailService;
        }

        private byte[] GeneratePdf(DataTable data)
        {
            string tempFile = Path.GetTempFileName();
            try
            {
                using (var writer = new PdfWriter(tempFile))
                using (var pdf = new PdfDocument(writer))
                using (var document = new Document(pdf))
                {
                    // Add title
                    document.Add(new Paragraph($"Report Generated on {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC"));

                    // Create table
                    var table = new Table(data.Columns.Count);

                    // Add headers
                    foreach (DataColumn column in data.Columns)
                    {
                        table.AddHeaderCell(new Cell().Add(new Paragraph(column.ColumnName)));
                    }

                    // Add data
                    foreach (DataRow row in data.Rows)
                    {
                        foreach (var item in row.ItemArray)
                        {
                            table.AddCell(new Cell().Add(new Paragraph(item?.ToString() ?? string.Empty)));
                        }
                    }

                    document.Add(table);
                }

                // Read the generated PDF file into memory
                return File.ReadAllBytes(tempFile);
            }
            catch (Exception ex)
            {
                throw new Exception($"PDF Generation failed at step: {ex.Message}", ex);
            }
            finally
            {
                // Clean up the temporary file
                if (File.Exists(tempFile))
                {
                    try
                    {
                        File.Delete(tempFile);
                    }
                    catch
                    {
                        // Ignore cleanup errors
                    }
                }
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
                                    fileBytes = GeneratePdf(dataTable);
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
    }
} 