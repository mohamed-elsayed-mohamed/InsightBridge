using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using InsightBridge.Infrastructure.Data;

namespace InsightBridge.Infrastructure.Migrations
{
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20250515120549_UpdateScheduledReportToUseDatabaseConnection")]
    partial class UpdateScheduledReportToUseDatabaseConnection
    {
        protected override void BuildTargetModel(ModelBuilder modelBuilder)
        {
            modelBuilder
                .HasAnnotation("ProductVersion", "8.0.4")
                .HasAnnotation("Relational:MaxIdentifierLength", 128);

            SqlServerModelBuilderExtensions.UseIdentityColumns(modelBuilder);

            modelBuilder.Entity("InsightBridge.Domain.Models.ScheduledReport", b =>
            {
                b.Property<int>("Id")
                    .ValueGeneratedOnAdd()
                    .HasColumnType("int");

                SqlServerPropertyBuilderExtensions.UseIdentityColumn(b.Property<int>("Id"));

                b.Property<int>("DatabaseConnectionId")
                    .HasColumnType("int");

                b.Property<DateTime>("CreatedAt")
                    .HasColumnType("datetime2");

                b.Property<string>("DaysOfWeek")
                    .HasColumnType("nvarchar(max)");

                b.Property<int?>("DayOfMonth")
                    .HasColumnType("int");

                b.Property<DateTime?>("EndDate")
                    .HasColumnType("datetime2");

                b.Property<string>("Email")
                    .IsRequired()
                    .HasColumnType("nvarchar(max)");

                b.Property<string>("Format")
                    .IsRequired()
                    .HasColumnType("nvarchar(max)");

                b.Property<string>("Frequency")
                    .IsRequired()
                    .HasMaxLength(50)
                    .HasColumnType("nvarchar(50)");

                b.Property<DateTime?>("LastRunTime")
                    .HasColumnType("datetime2");

                b.Property<DateTime?>("NextRunTime")
                    .HasColumnType("datetime2");

                b.Property<DateTime>("ScheduledTimeUtc")
                    .HasColumnType("datetime2");

                b.Property<string>("SqlQuery")
                    .IsRequired()
                    .HasColumnType("nvarchar(max)");

                b.Property<string>("Status")
                    .HasColumnType("nvarchar(max)");

                b.Property<string>("Timezone")
                    .IsRequired()
                    .HasMaxLength(100)
                    .HasColumnType("nvarchar(100)");

                b.HasKey("Id");

                b.HasIndex("DatabaseConnectionId");

                b.ToTable("ScheduledReports");
            });

            modelBuilder.Entity("InsightBridge.Domain.Models.ScheduledReport", b =>
            {
                b.HasOne("InsightBridge.Domain.Models.DatabaseConnection", "DatabaseConnection")
                    .WithMany()
                    .HasForeignKey("DatabaseConnectionId")
                    .OnDelete(DeleteBehavior.Restrict)
                    .IsRequired();
            });
        }
    }
} 