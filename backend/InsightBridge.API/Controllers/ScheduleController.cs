using Microsoft.AspNetCore.Mvc;
using InsightBridge.Domain.Models;
using InsightBridge.Infrastructure.Data;
using System.Threading.Tasks;
using System;

namespace InsightBridge.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ScheduleController : ControllerBase
    {
        private readonly ApplicationDbContext _db;
        public ScheduleController(ApplicationDbContext db)
        {
            _db = db;
        }

        [HttpPost]
        public async Task<IActionResult> ScheduleReport([FromBody] ScheduledReport report)
        {
            if (string.IsNullOrWhiteSpace(report.ConnectionString) || string.IsNullOrWhiteSpace(report.SqlQuery) || string.IsNullOrWhiteSpace(report.Email))
                return BadRequest(new { error = "ConnectionString, SqlQuery, and Email are required." });
            report.Status = "Scheduled";
            report.CreatedAt = DateTime.UtcNow;
            _db.ScheduledReports.Add(report);
            await _db.SaveChangesAsync();
            return Ok(new { success = true, reportId = report.Id });
        }
    }
} 