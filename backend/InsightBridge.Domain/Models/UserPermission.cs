using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace InsightBridge.Domain.Models;

public class UserPermission
{
    public int Id { get; set; }

    [Required]
    public string UserId { get; set; } = string.Empty;

    [ForeignKey("UserId")]
    public ApplicationUser? User { get; set; }

    [Required]
    public int DatabaseConnectionId { get; set; }

    [ForeignKey("DatabaseConnectionId")]
    public DatabaseConnection? DatabaseConnection { get; set; }

    public string? AllowedTables { get; set; } // JSON string of allowed table names
    public string? AllowedColumns { get; set; } // JSON string of allowed column names per table
    public DateTime CreatedAt { get; set; }
    public string CreatedBy { get; set; } = string.Empty;
    public DateTime? LastModifiedAt { get; set; }
    public string? LastModifiedBy { get; set; }
}