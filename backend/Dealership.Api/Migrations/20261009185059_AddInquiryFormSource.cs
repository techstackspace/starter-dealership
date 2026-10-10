using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Dealership.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddInquiryFormSource : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "FormSource",
                table: "CustomerInquiries",
                type: "nvarchar(24)",
                maxLength: 24,
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FormSource",
                table: "CustomerInquiries");
        }
    }
}
