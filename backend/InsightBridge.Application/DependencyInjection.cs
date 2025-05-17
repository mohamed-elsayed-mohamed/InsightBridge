using InsightBridge.Application.Services;
using Microsoft.Extensions.DependencyInjection;

namespace InsightBridge.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.AddScoped<IAuthService, AuthService>();
        return services;
    }
}