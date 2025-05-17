using Microsoft.EntityFrameworkCore.Migrations;

namespace InsightBridge.Infrastructure.Migrations
{
    public partial class AddSchedulingFields : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Frequency",
                table: "ScheduledReports",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "once");

            migrationBuilder.AddColumn<string>(
                name: "Timezone",
                table: "ScheduledReports",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "UTC");

            migrationBuilder.AddColumn<DateTime>(
                name: "EndDate",
                table: "ScheduledReports",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DaysOfWeek",
                table: "ScheduledReports",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DayOfMonth",
                table: "ScheduledReports",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastRunTime",
                table: "ScheduledReports",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "NextRunTime",
                table: "ScheduledReports",
                type: "datetime2",
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Frequency",
                table: "ScheduledReports");

            migrationBuilder.DropColumn(
                name: "Timezone",
                table: "ScheduledReports");

            migrationBuilder.DropColumn(
                name: "EndDate",
                table: "ScheduledReports");

            migrationBuilder.DropColumn(
                name: "DaysOfWeek",
                table: "ScheduledReports");

            migrationBuilder.DropColumn(
                name: "DayOfMonth",
                table: "ScheduledReports");

            migrationBuilder.DropColumn(
                name: "LastRunTime",
                table: "ScheduledReports");

            migrationBuilder.DropColumn(
                name: "NextRunTime",
                table: "ScheduledReports");
        }
    }
}