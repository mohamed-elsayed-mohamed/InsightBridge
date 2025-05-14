using System;

namespace InsightBridge.Domain.Models
{
    public class ScheduledReport
    {
        public int Id { get; set; }
        public string ConnectionString { get; set; } = string.Empty;
        public string SqlQuery { get; set; } = string.Empty;
        public string Format { get; set; } = "pdf"; // or "excel"
        public DateTime ScheduledTimeUtc { get; set; }
        public string Email { get; set; } = string.Empty;
        public string? Status { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
} 