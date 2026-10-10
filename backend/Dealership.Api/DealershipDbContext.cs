using Microsoft.EntityFrameworkCore;

public sealed class DealershipDbContext(DbContextOptions<DealershipDbContext> options) : DbContext(options)
{
    public DbSet<Vehicle> Vehicles => Set<Vehicle>();
    public DbSet<CustomerInquiry> CustomerInquiries => Set<CustomerInquiry>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var vehicle = modelBuilder.Entity<Vehicle>();
        vehicle.ToTable("Vehicles", table => table.HasCheckConstraint(
            "CK_Vehicles_Status",
            "[Status] IN ('Available', 'Pending', 'Low Stock')"));
        vehicle.HasKey(item => item.Id);
        vehicle.Property(item => item.Id).HasMaxLength(36);
        vehicle.Property(item => item.Vin).HasMaxLength(32).IsRequired();
        vehicle.Property(item => item.Year).HasMaxLength(4).IsRequired();
        vehicle.Property(item => item.Make).HasMaxLength(80).IsRequired();
        vehicle.Property(item => item.Model).HasMaxLength(100).IsRequired();
        vehicle.Property(item => item.Trim).HasMaxLength(100).IsRequired();
        vehicle.Property(item => item.Status).HasMaxLength(24).IsRequired();
        vehicle.Property(item => item.Description).HasMaxLength(2000).IsRequired();
        vehicle.Property(item => item.Category).HasMaxLength(40).IsRequired();
        vehicle.Property(item => item.Fuel).HasMaxLength(40).IsRequired();
        vehicle.Property(item => item.Location).HasMaxLength(120).IsRequired();
        vehicle.Property(item => item.Image).HasMaxLength(2048).IsRequired();
        vehicle.Property(item => item.Deal).HasMaxLength(100).IsRequired();
        vehicle.Property(item => item.Currency).HasMaxLength(12).HasDefaultValue("NGN").IsRequired();
        vehicle.HasIndex(item => new { item.Make, item.Model, item.Year });
        vehicle.HasIndex(item => item.Status);
        vehicle.HasIndex(item => item.Price);
        vehicle.HasIndex(item => item.Vin).IsUnique();

        var inquiry = modelBuilder.Entity<CustomerInquiry>();
        inquiry.ToTable("CustomerInquiries");
        inquiry.HasKey(item => item.Id);
        inquiry.Property(item => item.Id).HasMaxLength(36);
        inquiry.Property(item => item.Name).HasMaxLength(120).IsRequired();
        inquiry.Property(item => item.Email).HasMaxLength(254).IsRequired();
        inquiry.Property(item => item.FormSource).HasMaxLength(24).IsRequired();
        inquiry.Property(item => item.InquiryType).HasMaxLength(32).IsRequired();
        inquiry.Property(item => item.Vehicle).HasMaxLength(120).IsRequired();
        inquiry.Property(item => item.Message).HasMaxLength(4000).IsRequired();
        inquiry.HasIndex(item => item.CreatedAtUtc);
    }
}

public sealed class CustomerInquiry
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string FormSource { get; set; } = string.Empty;
    public string InquiryType { get; set; } = string.Empty;
    public string Vehicle { get; set; } = string.Empty;
    public DateOnly? PreferredDate { get; set; }
    public string Message { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? EmailSentAtUtc { get; set; }
}

public sealed class Vehicle
{
    public string Id { get; set; } = string.Empty;
    public string Vin { get; set; } = string.Empty;
    public string Year { get; set; } = string.Empty;
    public string Make { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public string Trim { get; set; } = string.Empty;
    public int Price { get; set; }
    public int Mileage { get; set; }
    public string Status { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Fuel { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string Image { get; set; } = string.Empty;
    public string Deal { get; set; } = string.Empty;
    public string Currency { get; set; } = "NGN";

    public Vehicle() { }

    public Vehicle(string id, string year, string make, string model, string trim, int price, int mileage, string status,
        string description, string category, string fuel, string location, string image, string deal, string? vin = null, string currency = "NGN")
    {
        Id = id;
        Vin = vin ?? string.Empty;
        Year = year;
        Make = make;
        Model = model;
        Trim = trim;
        Price = price;
        Mileage = mileage;
        Status = status;
        Description = description;
        Category = category;
        Fuel = fuel;
        Location = location;
        Image = image;
        Deal = deal;
        Currency = currency;
    }
}