using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WeeklyPlanner.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddBacklogItemStatusField : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsActive",
                table: "BacklogItems");

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "BacklogItems",
                type: "nvarchar(450)",
                nullable: false,
                defaultValue: "Available");

            migrationBuilder.CreateIndex(
                name: "IX_BacklogItems_Status",
                table: "BacklogItems",
                column: "Status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_BacklogItems_Status",
                table: "BacklogItems");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "BacklogItems");

            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                table: "BacklogItems",
                type: "bit",
                nullable: false,
                defaultValue: true);
        }
    }
}
