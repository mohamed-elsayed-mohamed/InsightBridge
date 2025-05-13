using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using InsightBridge.Application.Interfaces;
using InsightBridge.Domain.Models;
using System.Threading.Tasks;

namespace InsightBridge.API.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class ConnectionsController : ControllerBase
    {
        private readonly IDatabaseConnectionService _connectionService;

        public ConnectionsController(IDatabaseConnectionService connectionService)
        {
            _connectionService = connectionService;
        }

        [HttpGet]
        public async Task<IActionResult> GetConnections()
        {
            var connections = await _connectionService.GetAllConnectionsAsync();
            return Ok(connections);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetConnection(int id)
        {
            var connection = await _connectionService.GetConnectionByIdAsync(id);
            if (connection == null)
                return NotFound();
            return Ok(connection);
        }

        [HttpPost]
        public async Task<IActionResult> CreateConnection([FromBody] DatabaseConnection connection)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var result = await _connectionService.CreateConnectionAsync(connection);
            return CreatedAtAction(nameof(GetConnection), new { id = result.Id }, result);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateConnection(int id, [FromBody] DatabaseConnection connection)
        {
            if (id != connection.Id)
                return BadRequest();

            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var result = await _connectionService.UpdateConnectionAsync(connection);
            if (!result)
                return NotFound();

            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteConnection(int id)
        {
            var result = await _connectionService.DeleteConnectionAsync(id);
            if (!result)
                return NotFound();

            return NoContent();
        }

        [HttpPost("test")]
        public async Task<IActionResult> TestConnection([FromBody] DatabaseConnection connection)
        {
            var result = await _connectionService.TestConnectionAsync(connection.ConnectionString);
            return Ok(new { success = result });
        }
    }
} 