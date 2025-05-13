using Microsoft.AspNetCore.Mvc;
using InsightBridge.Application.Services;
using InsightBridge.Domain.Models;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Logging;

namespace InsightBridge.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly InsightBridge.Application.Services.IAuthService _authService;
    private readonly ILogger<AuthController> _logger;

    public AuthController(InsightBridge.Application.Services.IAuthService authService, ILogger<AuthController> logger)
    {
        _authService = authService;
        _logger = logger;
    }

    [HttpPost("login")]
    public async Task<ActionResult<TokenResponse>> Login(InsightBridge.Domain.Models.LoginRequest request)
    {
        try
        {
            var response = await _authService.LoginAsync(request);
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during login");
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("register")]
    public async Task<ActionResult<TokenResponse>> Register(InsightBridge.Domain.Models.RegisterRequest request)
    {
        try
        {
            var response = await _authService.RegisterAsync(request);
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during registration");
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword(InsightBridge.Domain.Models.ForgotPasswordRequest request)
    {
        try
        {
            await _authService.ForgotPasswordAsync(request);
            return Ok(new { message = "If your email is registered, you will receive a password reset link." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during forgot password");
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword(InsightBridge.Domain.Models.ResetPasswordRequest request)
    {
        try
        {
            await _authService.ResetPasswordAsync(request);
            return Ok(new { message = "Password has been reset successfully." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during password reset");
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("refresh-token")]
    public async Task<ActionResult<TokenResponse>> RefreshToken([FromBody] string refreshToken)
    {
        try
        {
            var response = await _authService.RefreshTokenAsync(refreshToken);
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during token refresh");
            return BadRequest(new { message = ex.Message });
        }
    }

    [Authorize(Roles = "Admin")]
    [HttpGet("users")]
    public async Task<ActionResult<List<UserResponse>>> GetAllUsers()
    {
        try
        {
            var users = await _authService.GetAllUsersAsync();
            return Ok(users);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting all users");
            return BadRequest(new { message = ex.Message });
        }
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("users/{userId}/roles")]
    public async Task<IActionResult> UpdateUserRoles(string userId, [FromBody] List<string> roles)
    {
        try
        {
            await _authService.UpdateUserRolesAsync(userId, roles);
            return Ok(new { message = "User roles updated successfully." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating user roles");
            return BadRequest(new { message = ex.Message });
        }
    }
} 