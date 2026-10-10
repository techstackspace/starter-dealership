using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
var connectionString = Environment.GetEnvironmentVariable("DATABASE_URL")
    ?? builder.Configuration.GetConnectionString("DefaultConnection")
    ?? "Server=localhost,1433;Database=dealership;User Id=sa;Password=YourStrong!Passw0rd;TrustServerCertificate=True;Encrypt=False";
var storageConnectionString = Environment.GetEnvironmentVariable("STORAGE_CONNECTION_STRING")
    ?? "UseDevelopmentStorage=true";
const string defaultCurrency = "NGN";
var supportedCurrencies = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
{
    "USD", "NGN", "EUR", "GBP", "AED", "ZAR", "CAD", "JPY"
};

static string GenerateVin()
{
    const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";
    var random = new Random();
    var segment = new string(Enumerable.Range(0, 12).Select(_ => chars[random.Next(chars.Length)]).ToArray());
    return $"VIN-{segment}";
}

builder.Services.AddOpenApi();
builder.Services.AddDbContext<DealershipDbContext>(options => options.UseSqlServer(connectionString));
builder.Services.AddSingleton(new BlobServiceClient(storageConnectionString));
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.AllowAnyHeader().AllowAnyMethod().AllowAnyOrigin();
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors("AllowFrontend");

static bool IsValidStatus(string? status) => status is "Available" or "Pending" or "Low Stock";

app.MapGet("/api/health", async (DealershipDbContext db, BlobServiceClient blobService) =>
{
    try
    {
        var databaseConnected = await db.Database.CanConnectAsync();
        var storageConnected = false;
        try
        {
            await blobService.GetPropertiesAsync();
            storageConnected = true;
        }
        catch
        {
            storageConnected = false;
        }

        var healthy = databaseConnected && storageConnected;
        var statusCode = healthy ? StatusCodes.Status200OK : StatusCodes.Status503ServiceUnavailable;
        return Results.Json(new
        {
            status = healthy ? "ok" : "degraded",
            services = new
            {
                database = databaseConnected ? "ok" : "unavailable",
                storage = storageConnected ? "ok" : "unavailable"
            }
        }, statusCode: statusCode);
    }
    catch
    {
        return Results.Json(new
        {
            status = "degraded",
            services = new { database = "unavailable", storage = "unavailable" }
        }, statusCode: StatusCodes.Status503ServiceUnavailable);
    }
});

app.MapGet("/api/vehicles", async (DealershipDbContext db) =>
{
    var vehicles = await db.Vehicles.AsNoTracking().OrderBy(vehicle => vehicle.Year).ThenBy(vehicle => vehicle.Make).ToListAsync();
    var payload = new { vehicles, total = vehicles.Count };
    return Results.Ok(payload);
});

app.MapGet("/api/vehicles/{id}", async (string id, DealershipDbContext db) =>
{
    var vehicle = await db.Vehicles.AsNoTracking().FirstOrDefaultAsync(item => item.Id == id);
    return vehicle is null ? Results.NotFound(new { error = "Vehicle not found" }) : Results.Ok(new { vehicle });
});

app.MapPost("/api/inquiries", async (CreateInquiryRequest request, DealershipDbContext db, IConfiguration configuration, ILogger<Program> logger) =>
{
    var name = request.Name?.Trim();
    var email = request.Email?.Trim();
    var formSource = request.FormSource?.Trim().ToLowerInvariant();
    var inquiryType = request.InquiryType?.Trim().ToLowerInvariant();
    var vehicle = request.Vehicle?.Trim() ?? string.Empty;
    var message = request.Message?.Trim() ?? string.Empty;

    if (string.IsNullOrWhiteSpace(name) || name.Length > 120
        || !System.Net.Mail.MailAddress.TryCreate(email, out _)
        || email!.Length > 254
        || formSource is not ("contact" or "inventory")
        || inquiryType is not ("sales" or "financing" or "test-drive")
        || vehicle.Length > 120
        || message.Length > 4000)
    {
        return Results.BadRequest(new { error = "Enter a valid name and email address, and keep your message within the allowed length." });
    }

    var inquiry = new CustomerInquiry
    {
        Id = Guid.NewGuid().ToString(),
        Name = name,
        Email = email,
        FormSource = formSource,
        InquiryType = inquiryType,
        Vehicle = vehicle,
        PreferredDate = request.PreferredDate,
        Message = message,
        CreatedAtUtc = DateTime.UtcNow
    };

    db.CustomerInquiries.Add(inquiry);
    await db.SaveChangesAsync();

    var emailConfigured = !string.IsNullOrWhiteSpace(configuration["Email:SmtpHost"])
        && !string.IsNullOrWhiteSpace(configuration["Email:From"]);
    if (!emailConfigured)
    {
        return Results.Created($"/api/inquiries/{inquiry.Id}", new { id = inquiry.Id, emailConfigured, emailSent = false });
    }

    try
    {
        using var mail = new System.Net.Mail.MailMessage
        {
            From = new System.Net.Mail.MailAddress(configuration["Email:From"]!),
            Subject = $"Starter Dealership - {formSource} page - {inquiryType} inquiry",
            Body = $"Form: {formSource} page\nType: {inquiryType}\nName: {name}\nEmail: {email}\nVehicle: {vehicle}\nPreferred date: {request.PreferredDate?.ToString("yyyy-MM-dd") ?? "Not specified"}\n\n{message}",
            IsBodyHtml = false
        };
        mail.To.Add("osagienoah555@gmail.com");
        mail.ReplyToList.Add(new System.Net.Mail.MailAddress(email, name));

        using var smtp = new System.Net.Mail.SmtpClient(configuration["Email:SmtpHost"]!)
        {
            Port = int.TryParse(configuration["Email:SmtpPort"], out var port) ? port : 587,
            EnableSsl = !bool.TryParse(configuration["Email:EnableSsl"], out var enableSsl) || enableSsl
        };
        var username = configuration["Email:Username"];
        var password = configuration["Email:Password"];
        if (!string.IsNullOrWhiteSpace(username))
        {
            smtp.Credentials = new System.Net.NetworkCredential(username, password);
        }

        await smtp.SendMailAsync(mail);
        inquiry.EmailSentAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Results.Created($"/api/inquiries/{inquiry.Id}", new { id = inquiry.Id, emailConfigured, emailSent = true });
    }
    catch (Exception exception)
    {
        logger.LogWarning(exception, "Inquiry {InquiryId} was saved but its email notification failed.", inquiry.Id);
        return Results.Created($"/api/inquiries/{inquiry.Id}", new { id = inquiry.Id, emailConfigured, emailSent = false });
    }
});

app.MapPost("/api/vehicles", async (CreateVehicleRequest request, DealershipDbContext db) =>
{
    if (string.IsNullOrWhiteSpace(request.Make)
        || string.IsNullOrWhiteSpace(request.Model)
        || !IsValidStatus(request.Status)
        || request.Year < 1886
        || request.Price < 0
        || request.Mileage < 0)
    {
        return Results.BadRequest(new { error = "Make, model, a valid status, year, price, and mileage are required." });
    }

    var normalizedCurrency = string.IsNullOrWhiteSpace(request.Currency) ? defaultCurrency : request.Currency.Trim().ToUpperInvariant();
    if (!supportedCurrencies.Contains(normalizedCurrency))
    {
        return Results.BadRequest(new { error = "Currency must be one of USD, NGN, EUR, GBP, AED, ZAR, CAD, or JPY." });
    }

    var requestedVin = string.IsNullOrWhiteSpace(request.Vin) ? null : request.Vin.Trim().ToUpperInvariant();
    var vin = requestedVin ?? GenerateVin();

    while (await db.Vehicles.AnyAsync(vehicle => vehicle.Vin == vin))
    {
        vin = GenerateVin();
    }

    var vehicle = new Vehicle(
        Guid.NewGuid().ToString(),
        request.Year.ToString(),
        request.Make,
        request.Model,
        request.Trim ?? string.Empty,
        request.Price,
        request.Mileage,
        request.Status!,
        request.Description ?? string.Empty,
        request.Category ?? string.Empty,
        request.Fuel ?? string.Empty,
        request.Location ?? string.Empty,
        request.Image ?? string.Empty,
        request.Deal ?? string.Empty,
        vin,
        normalizedCurrency);

    db.Vehicles.Add(vehicle);
    await db.SaveChangesAsync();
    return Results.Created($"/api/vehicles/{vehicle.Id}", new { id = vehicle.Id, vin = vehicle.Vin, currency = vehicle.Currency, createdAt = DateTime.UtcNow });
});

app.MapPut("/api/vehicles/{id}", async (string id, UpdateVehicleRequest request, DealershipDbContext db) =>
{
    var existing = await db.Vehicles.FirstOrDefaultAsync(item => item.Id == id);
    if (existing is null)
    {
        return Results.NotFound(new { error = "Vehicle not found." });
    }

    if ((request.Status is not null && !IsValidStatus(request.Status))
        || (request.Price is not null && request.Price < 0)
        || (request.Mileage is not null && request.Mileage < 0))
    {
        return Results.BadRequest(new { error = "Status, price, or mileage is invalid." });
    }

    if (request.Currency is not null)
    {
        var normalizedCurrency = request.Currency.Trim().ToUpperInvariant();
        if (!supportedCurrencies.Contains(normalizedCurrency))
        {
            return Results.BadRequest(new { error = "Currency must be one of USD, NGN, EUR, GBP, AED, ZAR, CAD, or JPY." });
        }

        existing.Currency = normalizedCurrency;
    }

    if (request.Vin is not null)
    {
        var normalizedVin = request.Vin.Trim().ToUpperInvariant();
        if (await db.Vehicles.AnyAsync(vehicle => vehicle.Id != existing.Id && vehicle.Vin == normalizedVin))
        {
            return Results.Conflict(new { error = "VIN already exists." });
        }

        existing.Vin = normalizedVin;
    }

    existing.Year = request.Year?.ToString() ?? existing.Year;
    existing.Make = request.Make ?? existing.Make;
    existing.Model = request.Model ?? existing.Model;
    existing.Trim = request.Trim ?? existing.Trim;
    existing.Price = request.Price ?? existing.Price;
    existing.Mileage = request.Mileage ?? existing.Mileage;
    existing.Status = request.Status ?? existing.Status;
    existing.Description = request.Description ?? existing.Description;
    existing.Category = request.Category ?? existing.Category;
    existing.Fuel = request.Fuel ?? existing.Fuel;
    existing.Location = request.Location ?? existing.Location;
    existing.Image = request.Image ?? existing.Image;
    existing.Deal = request.Deal ?? existing.Deal;

    await db.SaveChangesAsync();
    return Results.Ok(new { vehicle = existing });
});

app.MapDelete("/api/vehicles/{id}", async (string id, DealershipDbContext db) =>
{
    var vehicle = await db.Vehicles.FirstOrDefaultAsync(item => item.Id == id);
    if (vehicle is null)
    {
        return Results.NotFound(new { error = "Vehicle not found." });
    }

    db.Vehicles.Remove(vehicle);
    await db.SaveChangesAsync();
    return Results.Ok(new { success = true });
});

app.MapPost("/api/upload", async (HttpRequest request, DealershipDbContext db, BlobServiceClient blobService) =>
{
    if (!request.HasFormContentType)
    {
        return Results.BadRequest(new { error = "A multipart form with vehicleId and file is required." });
    }

    var form = await request.ReadFormAsync();
    var vehicleId = form["vehicleId"].ToString();
    var file = form.Files.GetFile("file");
    if (string.IsNullOrWhiteSpace(vehicleId) || file is null || file.Length == 0)
    {
        return Results.BadRequest(new { error = "Vehicle ID and a non-empty file are required." });
    }

    var vehicle = await db.Vehicles.FirstOrDefaultAsync(item => item.Id == vehicleId);
    if (vehicle is null)
    {
        return Results.NotFound(new { error = "Vehicle not found." });
    }

    var container = blobService.GetBlobContainerClient("vehicles");
    await container.CreateIfNotExistsAsync(PublicAccessType.Blob);
    var blob = container.GetBlobClient($"{vehicleId}/{Guid.NewGuid()}{Path.GetExtension(file.FileName)}");
    await using var stream = file.OpenReadStream();
    await blob.UploadAsync(stream, new BlobUploadOptions
    {
        HttpHeaders = new BlobHttpHeaders { ContentType = file.ContentType }
    });

    vehicle.Image = blob.Uri.ToString();
    await db.SaveChangesAsync();
    return Results.Created(blob.Uri, new { url = blob.Uri.ToString(), vehicleId });
});

app.Run();

public partial class Program { }

public record CreateVehicleRequest(
    string? Make,
    string? Model,
    int Year,
    string? Trim,
    int Price,
    int Mileage,
    string? Status,
    string? Description,
    string? Category,
    string? Fuel,
    string? Location,
    string? Image,
    string? Deal,
    string? PhotoUrl = null,
    string? Vin = null,
    string Currency = "NGN");

public record UpdateVehicleRequest(
    string? Make = null,
    string? Model = null,
    int? Year = null,
    string? Trim = null,
    int? Price = null,
    int? Mileage = null,
    string? Status = null,
    string? Description = null,
    string? Category = null,
    string? Fuel = null,
    string? Location = null,
    string? Image = null,
    string? Deal = null,
    string? PhotoUrl = null,
    string? Vin = null,
    string? Currency = null);

public record CreateInquiryRequest(
    string? Name,
    string? Email,
    string? FormSource,
    string? InquiryType,
    string? Vehicle = null,
    DateOnly? PreferredDate = null,
    string? Message = null);
