namespace InsightBridge.Domain.Models;

public class DatabaseConnection
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string ConnectionString { get; set; } = string.Empty;
    public string DatabaseType { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? LastUsedAt { get; set; }
    public bool IsActive { get; set; } = true;
    public string? Description { get; set; }
    public string? CreatedBy { get; set; }
}