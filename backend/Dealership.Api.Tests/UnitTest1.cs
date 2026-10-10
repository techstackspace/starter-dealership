using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Dealership.Api.Tests;

public class DealershipApiTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public DealershipApiTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task HealthCheck_ReturnsOk()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task VehicleList_ReturnsInventory()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/vehicles");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task CreateInquiry_RejectsInvalidEmail()
    {
        var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/inquiries", new
        {
            name = "Test Customer",
            email = "not-an-email",
            inquiryType = "sales",
            message = "Interested in a vehicle"
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CreateVehicle_AssignsGeneratedVinAndCurrency()
    {
        var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/vehicles", new
        {
            make = "Toyota",
            model = "Corolla",
            year = 2025,
            trim = "SE",
            price = 24000,
            mileage = 5000,
            status = "Available",
            description = "Test vehicle",
            category = "Sedan",
            fuel = "Hybrid",
            location = "Lagos",
            image = "",
            deal = ""
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        using var payload = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var vehicleId = payload.RootElement.GetProperty("id").GetString();
        var vin = payload.RootElement.GetProperty("vin").GetString();

        Assert.Equal("NGN", payload.RootElement.GetProperty("currency").GetString());
        Assert.False(string.IsNullOrWhiteSpace(vin));
        Assert.StartsWith("VIN-", vin);

        var cleanupResponse = await client.DeleteAsync($"/api/vehicles/{vehicleId}");
        Assert.Equal(HttpStatusCode.OK, cleanupResponse.StatusCode);
    }
}
