using InsightBridge.Domain.Models;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace InsightBridge.Infrastructure.Data;

public class ApplicationDbContext : IdentityDbContext<ApplicationUser>
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<DatabaseConnection> DatabaseConnections { get; set; }
    public DbSet<Report> Reports { get; set; }
    public DbSet<ScheduledReport> ScheduledReports { get; set; }
    public DbSet<UserPermission> UserPermissions { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Configure Report entity
        modelBuilder.Entity<Report>()
            .HasOne(r => r.DatabaseConnection)
            .WithMany()
            .HasForeignKey(r => r.DatabaseConnectionId)
            .OnDelete(DeleteBehavior.Restrict);

        // Configure ScheduledReport entity
        modelBuilder.Entity<ScheduledReport>()
            .HasOne(r => r.DatabaseConnection)
            .WithMany()
            .HasForeignKey(r => r.DatabaseConnectionId)
            .OnDelete(DeleteBehavior.Restrict);

        // Configure UserPermission entity
        modelBuilder.Entity<UserPermission>()
            .HasOne(up => up.User)
            .WithMany()
            .HasForeignKey(up => up.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<UserPermission>()
            .HasOne(up => up.DatabaseConnection)
            .WithMany()
            .HasForeignKey(up => up.DatabaseConnectionId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}