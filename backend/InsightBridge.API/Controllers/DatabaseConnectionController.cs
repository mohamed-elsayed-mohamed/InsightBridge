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
    private readonly IDatabaseConnectionService _connectionService;

    public DatabaseConnectionController(IDatabaseConnectionService connectionService)
    {
        _connectionService = connectionService;
    }

    [HttpPost]
    public async Task<ActionResult<DatabaseConnection>> CreateConnection(DatabaseConnection connection)
    {
        var result = await _connectionService.CreateConnectionAsync(connection);
        return CreatedAtAction(nameof(GetConnection), new { id = result.Id }, result);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<DatabaseConnection>> GetConnection(int id)
    {
        var connection = await _connectionService.GetConnectionByIdAsync(id);
        if (connection == null)
            return NotFound();

        return connection;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<DatabaseConnection>>> GetAllConnections()
    {
        var connections = await _connectionService.GetAllConnectionsAsync();
        return Ok(connections);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateConnection(int id, DatabaseConnection connection)
    {
        if (id != connection.Id)
            return BadRequest();

        var success = await _connectionService.UpdateConnectionAsync(connection);
        if (!success)
            return NotFound();

        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteConnection(int id)
    {
        var success = await _connectionService.DeleteConnectionAsync(id);
        if (!success)
            return NotFound();

        return NoContent();
    }

    [HttpPost("test")]
    public async Task<ActionResult<bool>> TestConnection([FromBody] string connectionString)
    {
        var result = await _connectionService.TestConnectionAsync(connectionString);
        return Ok(result);
    }
} 