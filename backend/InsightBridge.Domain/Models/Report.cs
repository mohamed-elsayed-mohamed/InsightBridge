namespace InsightBridge.Domain.Models;

public class Report
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Query { get; set; } = string.Empty;
    public string VisualizationType { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public string CreatedBy { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
    public int DatabaseConnectionId { get; set; }
    public DatabaseConnection? DatabaseConnection { get; set; }
    public string? Parameters { get; set; }
    public string? Schedule { get; set; }
} 