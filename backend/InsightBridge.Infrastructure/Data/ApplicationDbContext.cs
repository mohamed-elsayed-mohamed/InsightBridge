using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using InsightBridge.Domain.Models;

namespace InsightBridge.Infrastructure.Data;

public class ApplicationDbContext : IdentityDbContext<ApplicationUser>
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<DatabaseConnection> DatabaseConnections { get; set; }
    public DbSet<Report> Reports { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        
        // Configure Report entity
        modelBuilder.Entity<Report>()
            .HasOne(r => r.DatabaseConnection)
            .WithMany()
            .HasForeignKey(r => r.DatabaseConnectionId)
            .OnDelete(DeleteBehavior.Restrict);
    }
} 