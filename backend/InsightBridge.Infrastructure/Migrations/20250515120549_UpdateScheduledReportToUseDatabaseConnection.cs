using Microsoft.EntityFrameworkCore.Migrations;

namespace InsightBridge.Infrastructure.Migrations
{
    public partial class UpdateScheduledReportToUseDatabaseConnection : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // First add DatabaseConnectionId as nullable
            migrationBuilder.AddColumn<int>(
                name: "DatabaseConnectionId",
                table: "ScheduledReports",
                type: "int",
                nullable: true);

            // Update existing records with a valid DatabaseConnectionId
            // Get the first DatabaseConnection ID
            migrationBuilder.Sql(@"
                DECLARE @FirstConnectionId int;
                SELECT TOP 1 @FirstConnectionId = Id FROM DatabaseConnections;
                
                IF @FirstConnectionId IS NOT NULL
                BEGIN
                    UPDATE ScheduledReports 
                    SET DatabaseConnectionId = @FirstConnectionId 
                    WHERE DatabaseConnectionId IS NULL;
                END
            ");

            // Make the column non-nullable
            migrationBuilder.AlterColumn<int>(
                name: "DatabaseConnectionId",
                table: "ScheduledReports",
                type: "int",
                nullable: false);

            // Add foreign key constraint
            migrationBuilder.AddForeignKey(
                name: "FK_ScheduledReports_DatabaseConnections_DatabaseConnectionId",
                table: "ScheduledReports",
                column: "DatabaseConnectionId",
                principalTable: "DatabaseConnections",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            // Drop the old ConnectionString column
            migrationBuilder.DropColumn(
                name: "ConnectionString",
                table: "ScheduledReports");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Add back the ConnectionString column
            migrationBuilder.AddColumn<string>(
                name: "ConnectionString",
                table: "ScheduledReports",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            // Drop the foreign key constraint
            migrationBuilder.DropForeignKey(
                name: "FK_ScheduledReports_DatabaseConnections_DatabaseConnectionId",
                table: "ScheduledReports");

            // Drop the DatabaseConnectionId column
            migrationBuilder.DropColumn(
                name: "DatabaseConnectionId",
                table: "ScheduledReports");
        }
    }
}