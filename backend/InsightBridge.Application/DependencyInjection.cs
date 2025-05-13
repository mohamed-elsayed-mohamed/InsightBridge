using Microsoft.Extensions.DependencyInjection;
using InsightBridge.Application.Services;

namespace InsightBridge.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.AddScoped<IAuthService, AuthService>();
        return services;
    }
} 