using InsightBridge.Infrastructure.Data;
using InsightBridge.Domain.Models;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Data.SqlClient;
using ClosedXML.Excel;
using System.Data;
using System.Net.Mail;
using System.Net;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System;
using System.IO;
using System.Linq;

namespace InsightBridge.Infrastructure.Services
{
    public class ScheduledReportService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        public ScheduledReportService(IServiceProvider serviceProvider)
        {
            _serviceProvider = serviceProvider;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                using (var scope = _serviceProvider.CreateScope())
                {
                    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                    var now = DateTime.UtcNow;
                    var dueReports = db.ScheduledReports.Where(r => r.Status == "Scheduled" && r.ScheduledTimeUtc <= now).ToList();
                    foreach (var report in dueReports)
                    {
                        try
                        {
                            // Run SQL
                            var dt = new DataTable();
                            using (var conn = new SqlConnection(report.ConnectionString))
                            {
                                conn.Open();
                                using (var cmd = new SqlCommand(report.SqlQuery, conn))
                                using (var reader = cmd.ExecuteReader())
                                {
                                    dt.Load(reader);
                                }
                            }
                            // Export
                            byte[] fileBytes;
                            string fileName;
                            string mimeType;
                            if (report.Format == "excel")
                            {
                                using var wb = new XLWorkbook();
                                var ws = wb.Worksheets.Add("Report");
                                for (int col = 0; col < dt.Columns.Count; col++)
                                    ws.Cell(1, col + 1).Value = dt.Columns[col].ColumnName;
                                for (int row = 0; row < dt.Rows.Count; row++)
                                    for (int col = 0; col < dt.Columns.Count; col++)
                                        ws.Cell(row + 2, col + 1).Value = dt.Rows[row][col]?.ToString() ?? "";
                                using var ms = new MemoryStream();
                                wb.SaveAs(ms);
                                fileBytes = ms.ToArray();
                                fileName = $"ScheduledReport_{report.Id}_{DateTime.UtcNow:yyyyMMdd_HHmmss}.xlsx";
                                mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                            }
                            else // PDF (send as HTML table in email for simplicity)
                            {
                                var sb = new StringBuilder();
                                sb.Append("<table border='1'><tr>");
                                foreach (DataColumn col in dt.Columns)
                                    sb.Append($"<th>{col.ColumnName}</th>");
                                sb.Append("</tr>");
                                foreach (DataRow row in dt.Rows)
                                {
                                    sb.Append("<tr>");
                                    foreach (DataColumn col in dt.Columns)
                                        sb.Append($"<td>{row[col]}</td>");
                                    sb.Append("</tr>");
                                }
                                sb.Append("</table>");
                                fileBytes = Encoding.UTF8.GetBytes(sb.ToString());
                                fileName = $"ScheduledReport_{report.Id}_{DateTime.UtcNow:yyyyMMdd_HHmmss}.html";
                                mimeType = "text/html";
                            }
                            // Send email
                            var mail = new MailMessage("m.elsayed.m.1995@gmail.com", report.Email)
                            {
                                Subject = "Your Scheduled Report",
                                Body = "See attached report.",
                                IsBodyHtml = true
                            };
                            mail.Attachments.Add(new Attachment(new MemoryStream(fileBytes), fileName, mimeType));
                            using var smtp = new SmtpClient("smtp.gmail.com")
                            {
                                Port = 587,
                                Credentials = new System.Net.NetworkCredential("m.elsayed.m.1995@gmail.com", "milk vtyx yhti bqaj"),
                                EnableSsl = true
                            };
                            smtp.Send(mail);
                            // Mark as sent
                            report.Status = "Sent";
                            db.ScheduledReports.Update(report);
                            db.SaveChanges();
                        }
                        catch (Exception ex)
                        {
                            report.Status = "Error: " + ex.Message;
                            db.ScheduledReports.Update(report);
                            db.SaveChanges();
                        }
                    }
                }
                await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
            }
        }
    }
} 