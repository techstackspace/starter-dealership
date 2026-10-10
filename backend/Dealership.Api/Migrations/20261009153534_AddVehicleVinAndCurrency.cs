using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Dealership.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddVehicleVinAndCurrency : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Currency",
                table: "Vehicles",
                type: "nvarchar(12)",
                maxLength: 12,
                nullable: false,
                defaultValue: "USD");

            migrationBuilder.AddColumn<string>(
                name: "Vin",
                table: "Vehicles",
                type: "nvarchar(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: "");

            migrationBuilder.Sql("""
                WITH ExistingVehicles AS (
                    SELECT Id, ROW_NUMBER() OVER (ORDER BY Id) AS RowNumber
                    FROM Vehicles
                    WHERE Vin = ''
                )
                UPDATE vehicle
                SET Vin = CONCAT('LEGACY-', existing.RowNumber)
                FROM Vehicles AS vehicle
                INNER JOIN ExistingVehicles AS existing ON existing.Id = vehicle.Id;
                """);

            migrationBuilder.CreateIndex(
                name: "IX_Vehicles_Vin",
                table: "Vehicles",
                column: "Vin",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Vehicles_Vin",
                table: "Vehicles");

            migrationBuilder.DropColumn(
                name: "Currency",
                table: "Vehicles");

            migrationBuilder.DropColumn(
                name: "Vin",
                table: "Vehicles");
        }
    }
}
