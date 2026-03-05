using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WeeklyPlanner.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddSelectedMemberIds : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "SelectedMemberIdsJson",
                table: "WeeklyPlans",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SelectedMemberIdsJson",
                table: "WeeklyPlans");
        }
    }
}
