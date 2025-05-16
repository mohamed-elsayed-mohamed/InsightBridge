using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Threading.Tasks;
using System;
using System.IO;
using System.Text;
using OfficeOpenXml; // For Excel
using PuppeteerSharp; // For PDF
using ClosedXML.Excel; // For ClosedXML
using System.Net.Mail;
using System.Net;

namespace InsightBridge.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ExportController : ControllerBase
    {
        private static readonly List<object> ExportHistory = new();
        private static readonly List<object> ScheduledReports = new();

        [HttpPost("pdf")]
        public async Task<IActionResult> ExportPdf([FromBody] ExportRequest request)
        {
            // Use PuppeteerSharp to generate PDF from HTML
            await new BrowserFetcher().DownloadAsync();
            using var browser = await Puppeteer.LaunchAsync(new LaunchOptions { Headless = true });
            using var page = await browser.NewPageAsync();
            await page.SetContentAsync(request.Html ?? "<h1>No Content</h1>");
            var pdfBytes = await page.PdfDataAsync();
            var fileName = $"report_{DateTime.UtcNow:yyyyMMdd_HHmmss}.pdf";
            ExportHistory.Add(new { Type = "PDF", Timestamp = DateTime.UtcNow, FileName = fileName });
            return File(pdfBytes, "application/pdf", fileName);
        }

        [HttpPost("excel")]
        public async Task<IActionResult> ExportExcel([FromBody] ExportRequest request)
        {
            using var workbook = new XLWorkbook();
            var ws = workbook.Worksheets.Add("Report");
            if (request.Columns != null && request.Data != null)
            {
                for (int col = 0; col < request.Columns.Length; col++)
                    ws.Cell(1, col + 1).Value = request.Columns[col];
                for (int row = 0; row < request.Data.Length; row++)
                {
                    if (request.Data[row] is object[] rowArray)
                    {
                        for (int col = 0; col < request.Columns.Length && col < rowArray.Length; col++)
                            ws.Cell(row + 2, col + 1).Value = rowArray[col]?.ToString() ?? "";
                    }
                }
            }
            using var ms = new MemoryStream();
            workbook.SaveAs(ms);
            ms.Position = 0;
            var fileName = $"report_{DateTime.UtcNow:yyyyMMdd_HHmmss}.xlsx";
            ExportHistory.Add(new { Type = "Excel", Timestamp = DateTime.UtcNow, FileName = fileName });
            return File(ms.ToArray(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
        }

        [HttpPost("schedule")]
        public IActionResult ScheduleReport([FromBody] object schedule)
        {
            // TODO: Store schedule and set up background job
            ScheduledReports.Add(schedule);
            return Ok(new { success = true });
        }

        [HttpGet("history")]
        public IActionResult GetExportHistory()
        {
            return Ok(ExportHistory);
        }

        [HttpPost("email")]
        public async Task<IActionResult> SendEmail([FromBody] EmailExportRequest request)
        {
            try
            {
                byte[] fileBytes;
                string fileName;
                string mimeType;

                if (request.Format == "pdf")
                {
                    // Generate PDF using Puppeteer
                    await new BrowserFetcher().DownloadAsync();
                    using var browser = await Puppeteer.LaunchAsync(new LaunchOptions { Headless = true });
                    using var page = await browser.NewPageAsync();
                    await page.SetContentAsync(request.Html ?? "<h1>No Content</h1>");
                    fileBytes = await page.PdfDataAsync();
                    fileName = $"{request.Title}_{DateTime.UtcNow:yyyyMMdd_HHmmss}.pdf";
                    mimeType = "application/pdf";
                }
                else // excel
                {
                    using var workbook = new XLWorkbook();
                    var ws = workbook.Worksheets.Add("Report");
                    if (request.Columns != null && request.Data != null)
                    {
                        for (int col = 0; col < request.Columns.Length; col++)
                            ws.Cell(1, col + 1).Value = request.Columns[col];
                        for (int row = 0; row < request.Data.Length; row++)
                        {
                            if (request.Data[row] is object[] rowArray)
                            {
                                for (int col = 0; col < request.Columns.Length && col < rowArray.Length; col++)
                                    ws.Cell(row + 2, col + 1).Value = rowArray[col]?.ToString() ?? "";
                            }
                        }
                    }
                    using var ms = new MemoryStream();
                    workbook.SaveAs(ms);
                    fileBytes = ms.ToArray();
                    fileName = $"{request.Title}_{DateTime.UtcNow:yyyyMMdd_HHmmss}.xlsx";
                    mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                }

                // Send email
                var mail = new MailMessage("m.elsayed.m.1995@gmail.com", request.Email.To)
                {
                    Subject = request.Email.Subject,
                    Body = request.Email.Message,
                    IsBodyHtml = true
                };
                mail.Attachments.Add(new Attachment(new MemoryStream(fileBytes), fileName, mimeType));

                using var smtp = new SmtpClient("smtp.gmail.com")
                {
                    Port = 587,
                    Credentials = new NetworkCredential("m.elsayed.m.1995@gmail.com", "milk vtyx yhti bqaj"),
                    EnableSsl = true
                };
                await smtp.SendMailAsync(mail);

                // Add to history
                ExportHistory.Add(new { 
                    Type = request.Format.ToUpper(), 
                    Timestamp = DateTime.UtcNow, 
                    FileName = fileName,
                    SentTo = request.Email.To 
                });

                return Ok(new { success = true, message = "Email sent successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        public class ExportRequest
        {
            public string? Html { get; set; } // For PDF
            public string[]? Columns { get; set; } // For Excel
            public object[][]? Data { get; set; } // For Excel
        }

        public class EmailExportRequest
        {
            public string Format { get; set; } = "pdf";
            public string Title { get; set; } = string.Empty;
            public string? Html { get; set; } // For PDF
            public string[]? Columns { get; set; } // For Excel
            public object[][]? Data { get; set; } // For Excel
            public EmailInfo Email { get; set; } = new();
        }

        public class EmailInfo
        {
            public string To { get; set; } = string.Empty;
            public string Subject { get; set; } = string.Empty;
            public string Message { get; set; } = string.Empty;
        }
    }
} 