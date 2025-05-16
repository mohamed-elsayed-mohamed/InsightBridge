using System;
using System.Text.Json;

namespace InsightBridge.Domain.Models
{
    public class ScheduledReport
    {
        public int Id { get; set; }
        public int DatabaseConnectionId { get; set; }
        public DatabaseConnection? DatabaseConnection { get; set; }
        public string SqlQuery { get; set; } = string.Empty;
        public string Format { get; set; } = "pdf"; // or "excel"
        public DateTime ScheduledTimeUtc { get; set; }
        public string Email { get; set; } = string.Empty;
        public string? Status { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        // New properties for recurring schedules
        public string Frequency { get; set; } = "once"; // once, daily, weekly, monthly
        public string Timezone { get; set; } = "UTC";
        public DateTime? EndDate { get; set; }
        public string? DaysOfWeek { get; set; } // JSON array of day numbers (0-6)
        public int? DayOfMonth { get; set; }
        public DateTime? LastRunTime { get; set; }
        public DateTime? NextRunTime { get; set; }

        // Helper methods
        public void SetDaysOfWeek(int[] days)
        {
            DaysOfWeek = JsonSerializer.Serialize(days);
        }

        public int[] GetDaysOfWeek()
        {
            if (string.IsNullOrEmpty(DaysOfWeek))
                return Array.Empty<int>();
            return JsonSerializer.Deserialize<int[]>(DaysOfWeek) ?? Array.Empty<int>();
        }

        public void CalculateNextRunTime()
        {
            if (Frequency == "once")
            {
                NextRunTime = null; // Set to null for one-time reports
                return;
            }

            var now = DateTime.UtcNow;
            var lastRun = LastRunTime ?? ScheduledTimeUtc;

            switch (Frequency)
            {
                case "daily":
                    NextRunTime = lastRun.AddDays(1);
                    break;

                case "weekly":
                    var days = GetDaysOfWeek();
                    if (days.Length == 0) return;

                    var currentDay = (int)lastRun.DayOfWeek;
                    var nextDay = days.FirstOrDefault(d => d > currentDay);
                    if (nextDay == 0) // If no day found after current day, take the first day of next week
                    {
                        nextDay = days[0];
                        NextRunTime = lastRun.AddDays(7 - currentDay + nextDay);
                    }
                    else
                    {
                        NextRunTime = lastRun.AddDays(nextDay - currentDay);
                    }
                    break;

                case "monthly":
                    if (!DayOfMonth.HasValue) return;
                    
                    var nextMonth = lastRun.AddMonths(1);
                    var daysInMonth = DateTime.DaysInMonth(nextMonth.Year, nextMonth.Month);
                    var targetDay = Math.Min(DayOfMonth.Value, daysInMonth);
                    
                    NextRunTime = new DateTime(nextMonth.Year, nextMonth.Month, targetDay, 
                        lastRun.Hour, lastRun.Minute, lastRun.Second, DateTimeKind.Utc);
                    break;
            }

            // If next run time is after end date, set to null
            if (EndDate.HasValue && NextRunTime > EndDate)
            {
                NextRunTime = null;
            }
        }
    }
} 