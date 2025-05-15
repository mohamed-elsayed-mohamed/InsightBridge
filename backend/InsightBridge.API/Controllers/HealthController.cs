using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using InsightBridge.Infrastructure.Data;
using Microsoft.Extensions.Logging;

namespace InsightBridge.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<HealthController> _logger;

    public HealthController(ApplicationDbContext context, ILogger<HealthController> logger)
    {
        _context = context;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> Check()
    {
        try
        {
            // Check database connection
            await _context.Database.CanConnectAsync();

            return Ok(new
            {
                status = "healthy",
                timestamp = DateTime.UtcNow,
                database = "connected"
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new
            {
                status = "unhealthy",
                timestamp = DateTime.UtcNow,
                error = ex.Message
            });
        }
    }

    [HttpGet("version")]
    public IActionResult GetVersion()
    {
        var version = typeof(Program).Assembly.GetName().Version?.ToString() ?? "1.0.0";
        return Ok(new { Version = version });
    }
} 