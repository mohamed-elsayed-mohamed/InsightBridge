using InsightBridge.API.Middleware;
using InsightBridge.Application;
using InsightBridge.Application.AI.Interfaces;
using InsightBridge.Application.AI.Services;
using InsightBridge.Application.Interfaces;
using InsightBridge.Domain.Interfaces;
using InsightBridge.Infrastructure;
using InsightBridge.Infrastructure.Data;
using InsightBridge.Infrastructure.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.Bot.Builder;
using Microsoft.Bot.Builder.Integration.AspNet.Core;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Globalization;
using System.Text;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

// Configure URLs
builder.WebHost.UseUrls("http://localhost:5000");

// Configure culture for database operations
CultureInfo.DefaultThreadCurrentCulture = CultureInfo.InvariantCulture;
CultureInfo.DefaultThreadCurrentUICulture = CultureInfo.InvariantCulture;
CultureInfo.CurrentCulture = CultureInfo.InvariantCulture;
CultureInfo.CurrentUICulture = CultureInfo.InvariantCulture;

// Add services to the container.
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
    });

// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Insight Bridge API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// Configure DbContext
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// Configure Identity
builder.Services.AddIdentity<InsightBridge.Domain.Models.ApplicationUser, IdentityRole>(options =>
{
    // Password settings
    options.Password.RequireDigit = true;
    options.Password.RequireLowercase = true;
    options.Password.RequireNonAlphanumeric = true;
    options.Password.RequireUppercase = true;
    options.Password.RequiredLength = 8;
    options.Password.RequiredUniqueChars = 1;

    // Lockout settings
    options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(5);
    options.Lockout.MaxFailedAccessAttempts = 5;
    options.Lockout.AllowedForNewUsers = true;

    // User settings
    options.User.RequireUniqueEmail = true;
})
.AddEntityFrameworkStores<ApplicationDbContext>()
.AddDefaultTokenProviders();

// Configure JWT Authentication
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["JWT:ValidIssuer"],
        ValidAudience = builder.Configuration["JWT:ValidAudience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["JWT:Secret"]!))
    };
});

// Configure Authorization
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("RequireAdminRole", policy => policy.RequireRole("Admin"));
    options.AddPolicy("RequireAnalystRole", policy => policy.RequireRole("Analyst"));
    options.AddPolicy("RequireViewerRole", policy => policy.RequireRole("Viewer"));
});

// Register Services
builder.Services.AddScoped<IDatabaseConnectionService, DatabaseConnectionService>();
builder.Services.AddScoped<IReportService, ReportService>();
builder.Services.AddScoped<InsightBridge.Application.Services.IAuthService, InsightBridge.Application.Services.AuthService>();

// Add AI services
builder.Services.AddScoped<IAIQueryService, AIQueryService>();

// Configure CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", builder =>
        builder.AllowAnyOrigin()
               .AllowAnyMethod()
               .AllowAnyHeader());
});

// Add Application Services
builder.Services.AddApplicationServices();

// Add Infrastructure Services
builder.Services.AddInfrastructureServices(builder.Configuration);
builder.Services.AddInfrastructure();

// Register EmailService as singleton
builder.Services.AddSingleton<IEmailService, EmailService>();

// Add ScheduledReportService as a hosted service
builder.Services.AddHostedService<InsightBridge.Infrastructure.Services.ScheduledReportService>();

// Add Bot Framework adapter and TeamsSqlBot
builder.Services.AddSingleton<IBotFrameworkHttpAdapter, BotFrameworkHttpAdapter>();
builder.Services.AddSingleton<IBot, TeamsSqlBot>();

// Add this after other service registrations
builder.Services.AddScoped<DbSeeder>();

// Register permission services
builder.Services.AddScoped<IPermissionService, PermissionService>();
builder.Services.AddScoped<SecureDatabaseService>();

var app = builder.Build();

// Configure the HTTP request pipeline.
app.UseSwagger();
app.UseSwaggerUI();

app.UseMiddleware<ErrorHandlingMiddleware>();

// Only use HTTPS redirection in production and when we have a valid HTTPS port
if (app.Environment.IsProduction() && !string.IsNullOrEmpty(builder.Configuration["HTTPS_PORT"]))
{
    // app.UseHttpsRedirection();
}

app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();

// Add a root endpoint that redirects to Swagger
app.MapGet("/", () => Results.Redirect("/swagger"));

app.MapControllers();

// Initialize the test database if it doesn't exist
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var context = services.GetRequiredService<ApplicationDbContext>();

    // Create TestDatabase if it doesn't exist
    var testDbConnectionString = builder.Configuration.GetConnectionString("TestDatabaseConnection");
    var masterConnectionString = testDbConnectionString.Replace("Database=TestAIDatabase", "Database=master");

    using (var connection = new SqlConnection(masterConnectionString))
    {
        connection.Open();
        using (var command = new SqlCommand())
        {
            command.Connection = connection;
            command.CommandText = @"
                IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'TestAIDatabase')
                BEGIN
                    CREATE DATABASE TestAIDatabase;
                END";
            command.ExecuteNonQuery();
        }
    }

    // Execute the test database initialization script
    using (var connection = new SqlConnection(testDbConnectionString))
    {
        connection.Open();
        
        // Extract database name from connection string
        var connectionStringBuilder = new SqlConnectionStringBuilder(testDbConnectionString);
        var databaseName = connectionStringBuilder.InitialCatalog;

        // Check if database exists
        var checkDbCommand = new SqlCommand(
            $"SELECT COUNT(*) FROM sys.databases WHERE name = '{databaseName}'", 
            connection);
        var dbExists = (int)checkDbCommand.ExecuteScalar() > 0;

        if (!dbExists)
        {
            var sqlScript = File.ReadAllText(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "TestDatabase", "CreateTestDatabase.sql"));

            // Split the script into individual commands and remove GO statements
            var commands = sqlScript.Split(new[] { "GO" }, StringSplitOptions.RemoveEmptyEntries)
                                .Select(cmd => cmd.Trim())
                                .Where(cmd => !string.IsNullOrWhiteSpace(cmd));

            foreach (var command in commands)
            {
                try
                {
                    using (var sqlCommand = new SqlCommand(command, connection))
                    {
                        sqlCommand.ExecuteNonQuery();
                    }
                }
                catch (SqlException ex) when (ex.Number == 1801) // Database already exists
                {
                    // Skip this error and continue with other commands
                    continue;
                }
            }
        }
    }
}

// Ensure database is created and migrations are applied
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var context = services.GetRequiredService<ApplicationDbContext>();
    context.Database.Migrate();
}

// Seed roles
using (var scope = app.Services.CreateScope())
{
    var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
    var roles = new[] { "Admin", "Analyst", "Viewer" };

    foreach (var role in roles)
    {
        if (!await roleManager.RoleExistsAsync(role))
        {
            await roleManager.CreateAsync(new IdentityRole(role));
        }
    }
}

// Add this after app.Build() but before app.Run()
using (var scope = app.Services.CreateScope())
{
    var seeder = scope.ServiceProvider.GetRequiredService<DbSeeder>();
    await seeder.SeedAsync();
}

app.Run();