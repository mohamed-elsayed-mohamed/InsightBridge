using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using InsightBridge.Application.Interfaces;
using InsightBridge.Domain.Models;

namespace InsightBridge.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class DatabaseConnectionController : ControllerBase
{
    private readonly IDatabaseConnectionService _databaseConnectionService;

    public DatabaseConnectionController(IDatabaseConnectionService databaseConnectionService)
    {
        _databaseConnectionService = databaseConnectionService;
    }

    [HttpPost("test")]
    public async Task<IActionResult> TestConnection([FromBody] DatabaseConnection connection)
    {
        try
        {
            var isValid = await _databaseConnectionService.TestConnectionAsync(connection.ConnectionString);
            return Ok(new { isValid });
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("schema")]
    public async Task<IActionResult> GetSchema([FromBody] DatabaseConnection connection)
    {
        try
        {
            var schema = await _databaseConnectionService.GetDatabaseSchemaAsync(connection.ConnectionString);
            return Ok(schema);
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost]
    public async Task<IActionResult> CreateConnection([FromBody] DatabaseConnection connection)
    {
        try
        {
            var result = await _databaseConnectionService.CreateConnectionAsync(connection);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet]
    public async Task<IActionResult> GetAllConnections()
    {
        try
        {
            var connections = await _databaseConnectionService.GetAllConnectionsAsync();
            return Ok(connections);
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetConnectionById(int id)
    {
        try
        {
            var connection = await _databaseConnectionService.GetConnectionByIdAsync(id);
            if (connection == null)
                return NotFound();

            return Ok(connection);
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateConnection(int id, [FromBody] DatabaseConnection connection)
    {
        try
        {
            connection.Id = id;
            var result = await _databaseConnectionService.UpdateConnectionAsync(connection);
            if (!result)
                return NotFound();

            return Ok(connection);
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteConnection(int id)
    {
        try
        {
            var result = await _databaseConnectionService.DeleteConnectionAsync(id);
            if (!result)
                return NotFound();

            return Ok();
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }
} 