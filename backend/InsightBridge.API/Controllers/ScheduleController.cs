using InsightBridge.Domain.Models;
using InsightBridge.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace InsightBridge.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ScheduleController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public ScheduleController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpPost("schedule")]
        public async Task<IActionResult> ScheduleReport([FromBody] ScheduledReport report)
        {
            if (report.DatabaseConnectionId <= 0 ||
                string.IsNullOrEmpty(report.SqlQuery) ||
                string.IsNullOrEmpty(report.Format) ||
                string.IsNullOrEmpty(report.Email))
            {
                return BadRequest("Missing required fields");
            }

            // Verify database connection exists
            var dbConnection = await _context.DatabaseConnections.FindAsync(report.DatabaseConnectionId);
            if (dbConnection == null)
            {
                return BadRequest("Database connection not found");
            }

            // Validate frequency
            if (string.IsNullOrEmpty(report.Frequency))
            {
                report.Frequency = "once"; // Default to once if not specified
            }
            else if (!new[] { "once", "daily", "weekly", "monthly" }.Contains(report.Frequency.ToLower()))
            {
                return BadRequest("Invalid frequency. Must be one of: once, daily, weekly, monthly");
            }

            // Validate timezone
            if (string.IsNullOrEmpty(report.Timezone))
            {
                report.Timezone = "UTC"; // Default to UTC if not specified
            }

            // Validate schedule-specific fields
            if (report.Frequency == "weekly" && string.IsNullOrEmpty(report.DaysOfWeek))
            {
                return BadRequest("Days of week are required for weekly schedules");
            }

            if (report.Frequency == "monthly" && !report.DayOfMonth.HasValue)
            {
                return BadRequest("Day of month is required for monthly schedules");
            }

            // Convert scheduled time to UTC
            if (report.ScheduledTimeUtc.Kind != DateTimeKind.Utc)
            {
                report.ScheduledTimeUtc = TimeZoneInfo.ConvertTimeToUtc(report.ScheduledTimeUtc,
                    TimeZoneInfo.FindSystemTimeZoneById(report.Timezone));
            }

            // Calculate next run time
            report.CalculateNextRunTime();

            report.Status = "Scheduled";
            _context.ScheduledReports.Add(report);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                id = report.Id,
                nextRunTime = report.NextRunTime,
                status = report.Status
            });
        }

        [HttpGet("reports")]
        public async Task<IActionResult> GetScheduledReports()
        {
            var reports = await _context.ScheduledReports
                .Include(r => r.DatabaseConnection)
                .OrderByDescending(r => r.ScheduledTimeUtc)
                .ToListAsync();

            return Ok(reports);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteScheduledReport(int id)
        {
            var report = await _context.ScheduledReports.FindAsync(id);
            if (report == null)
            {
                return NotFound();
            }

            _context.ScheduledReports.Remove(report);
            await _context.SaveChangesAsync();

            return Ok();
        }
    }
}