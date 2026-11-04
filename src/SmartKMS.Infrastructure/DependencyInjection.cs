using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SmartKMS.Application.Common.Interfaces;
using SmartKMS.Infrastructure.Persistence;
using SmartKMS.Infrastructure.Services;

namespace SmartKMS.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Connection string 'DefaultConnection' is missing (appsettings.json / user-secrets).");

        // ADD §5.3: Npgsql + snake_case naming convention
        services.AddDbContext<ApplicationDbContext>(options =>
            options.UseNpgsql(connectionString).UseSnakeCaseNamingConvention());

        services.AddScoped<IApplicationDbContext>(sp => sp.GetRequiredService<ApplicationDbContext>());
        services.AddScoped<IDateTimeProvider, DateTimeProvider>();
        services.AddHttpClient<ApiClient>();

        return services;
    }
}
