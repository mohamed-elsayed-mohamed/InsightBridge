using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using InsightBridge.Infrastructure.Data;

namespace InsightBridge.Infrastructure.Migrations
{
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20250515120548_AddSchedulingFields")]
    partial class AddSchedulingFields
    {
        protected override void BuildTargetModel(ModelBuilder modelBuilder)
        {
            modelBuilder
                .HasAnnotation("ProductVersion", "7.0.0")
                .HasAnnotation("Relational:MaxIdentifierLength", 128);

            modelBuilder.Entity("InsightBridge.Domain.Models.ScheduledReport", b =>
            {
                b.Property<int>("Id")
                    .ValueGeneratedOnAdd()
                    .HasColumnType("int");

                b.Property<string>("ConnectionString")
                    .IsRequired()
                    .HasColumnType("nvarchar(max)");

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

                b.ToTable("ScheduledReports");
            });
        }
    }
} 