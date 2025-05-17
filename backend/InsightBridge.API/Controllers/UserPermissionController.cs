using InsightBridge.Application.Interfaces;
using InsightBridge.Domain.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace InsightBridge.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class UserPermissionController : ControllerBase
{
    private readonly IUserPermissionService _permissionService;
    private readonly IDatabaseConnectionService _databaseConnectionService;
    private readonly ILogger<UserPermissionController> _logger;

    public UserPermissionController(
        IUserPermissionService permissionService,
        IDatabaseConnectionService databaseConnectionService,
        ILogger<UserPermissionController> logger)
    {
        _permissionService = permissionService;
        _databaseConnectionService = databaseConnectionService;
        _logger = logger;
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> CreatePermission([FromBody] UserPermission permission)
    {
        try
        {
            // Verify database connection exists
            var dbConnection = await _databaseConnectionService.GetConnectionByIdAsync(permission.DatabaseConnectionId);
            if (dbConnection == null)
                return BadRequest("Database connection not found");

            permission.CreatedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "system";
            var result = await _permissionService.CreatePermissionAsync(permission);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating user permission");
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("user/{userId}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetUserPermissions(string userId)
    {
        try
        {
            var permissions = await _permissionService.GetUserPermissionsAsync(userId);
            return Ok(permissions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting user permissions");
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("database/{databaseConnectionId}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetDatabasePermissions(int databaseConnectionId)
    {
        try
        {
            var permissions = await _permissionService.GetDatabasePermissionsAsync(databaseConnectionId);
            return Ok(permissions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting database permissions");
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdatePermission(int id, [FromBody] UserPermission permission)
    {
        try
        {
            permission.Id = id;
            permission.LastModifiedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "system";
            var result = await _permissionService.UpdatePermissionAsync(permission);
            if (!result)
                return NotFound();

            return Ok(permission);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating user permission");
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeletePermission(int id)
    {
        try
        {
            var result = await _permissionService.DeletePermissionAsync(id);
            if (!result)
                return NotFound();

            return Ok();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting user permission");
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("check/database/{databaseConnectionId}")]
    public async Task<IActionResult> CheckDatabaseAccess(int databaseConnectionId)
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            var hasAccess = await _permissionService.HasDatabaseAccessAsync(userId, databaseConnectionId);
            return Ok(new { hasAccess });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking database access");
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("check/table/{databaseConnectionId}/{tableName}")]
    public async Task<IActionResult> CheckTableAccess(int databaseConnectionId, string tableName)
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            var hasAccess = await _permissionService.HasTableAccessAsync(userId, databaseConnectionId, tableName);
            return Ok(new { hasAccess });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking table access");
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("check/column/{databaseConnectionId}/{tableName}/{columnName}")]
    public async Task<IActionResult> CheckColumnAccess(int databaseConnectionId, string tableName, string columnName)
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            var hasAccess = await _permissionService.HasColumnAccessAsync(userId, databaseConnectionId, tableName, columnName);
            return Ok(new { hasAccess });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking column access");
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("my-connections")]
    public async Task<IActionResult> GetMyConnections()
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            var permissions = await _permissionService.GetUserPermissionsAsync(userId);
            var connections = permissions.Select(p => new
            {
                p.DatabaseConnectionId,
                p.DatabaseConnection?.Name,
                p.DatabaseConnection?.DatabaseType
            }).Where(c => c.Name != null);

            return Ok(connections);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting user's connections");
            return BadRequest(new { error = ex.Message });
        }
    }
}