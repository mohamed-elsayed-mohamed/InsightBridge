using Microsoft.AspNetCore.Identity;

namespace InsightBridge.Infrastructure.Models;

public class ApplicationUser : IdentityUser
{
    public string Name { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastLoginAt { get; set; }
    public bool IsActive { get; set; } = true;
}