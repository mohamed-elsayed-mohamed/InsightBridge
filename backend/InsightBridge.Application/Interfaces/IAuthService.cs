using System.Security.Claims;

namespace InsightBridge.Application.Interfaces;

public interface IAuthService
{
    Task<string> GenerateJwtTokenAsync(string userId, string email, IEnumerable<string> roles);
    Task<bool> ValidateUserAsync(string email, string password);
    Task<bool> CreateUserAsync(string email, string password, string name);
    Task<IEnumerable<Claim>> GetUserClaimsAsync(string userId);
    Task<bool> ChangePasswordAsync(string userId, string currentPassword, string newPassword);
    Task<bool> ResetPasswordAsync(string email);
} 