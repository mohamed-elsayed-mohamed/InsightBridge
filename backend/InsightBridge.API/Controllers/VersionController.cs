using Microsoft.AspNetCore.Mvc;

namespace InsightBridge.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class VersionController : ControllerBase
{
    [HttpGet]
    public IActionResult Get()
    {
        var version = typeof(VersionController).Assembly.GetName().Version?.ToString() ?? "1.0.0";
        return Ok(new { version });
    }
} 