using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Dealership.Api.Migrations
{
    /// <inheritdoc />
    public partial class DefaultCurrencyToNgn : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "Currency",
                table: "Vehicles",
                type: "nvarchar(12)",
                maxLength: 12,
                nullable: false,
                defaultValue: "NGN",
                oldClrType: typeof(string),
                oldType: "nvarchar(12)",
                oldMaxLength: 12,
                oldDefaultValue: "USD");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "Currency",
                table: "Vehicles",
                type: "nvarchar(12)",
                maxLength: 12,
                nullable: false,
                defaultValue: "USD",
                oldClrType: typeof(string),
                oldType: "nvarchar(12)",
                oldMaxLength: 12,
                oldDefaultValue: "NGN");
        }
    }
}
