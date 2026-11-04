using Microsoft.AspNetCore.Identity;
using MudBlazor;
using MudBlazor.Services;
using Serilog;
using SmartKMS.Application;
using SmartKMS.Infrastructure;
using SmartKMS.Infrastructure.Identity;
using SmartKMS.Infrastructure.Persistence;
using SmartKMS.Web.Components;

// AD-4: Serilog bootstrap — log cả lỗi khởi động trước khi host dựng xong
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateBootstrapLogger();

try
{
    Log.Information("Starting SmartKMS.Web");

    var builder = WebApplication.CreateBuilder(args);

    // AD-4: Serilog structured + TraceId correlation (đọc cấu hình từ appsettings)
    builder.Host.UseSerilog((context, services, configuration) => configuration
        .ReadFrom.Configuration(context.Configuration)
        .ReadFrom.Services(services)
        .Enrich.FromLogContext()
        .WriteTo.Console());

    builder.Services.AddRazorComponents()
        .AddInteractiveServerComponents();

    builder.Services.AddMudServices();

    builder.Services.AddApplication();
    builder.Services.AddInfrastructure(builder.Configuration);

    // AD-2: hybrid — Identity cookie cho Blazor Server, JWT Bearer cho endpoint API
    builder.Services.AddAuthorization();
    builder.Services.AddAuthentication(options =>
    {
        options.DefaultScheme = IdentityConstants.ApplicationScheme;
        options.DefaultSignInScheme = IdentityConstants.ExternalScheme;
    })
    .AddIdentityCookies();

    builder.Services.AddAuthentication()
        .AddBearerToken(IdentityConstants.BearerScheme);

    builder.Services.AddIdentityCore<ApplicationUser>(options =>
        {
            options.Password.RequiredLength = 8;
            options.User.RequireUniqueEmail = true;
        })
        .AddRoles<IdentityRole<Guid>>()
        .AddEntityFrameworkStores<ApplicationDbContext>()
        .AddApiEndpoints();

    // AD-1: ProblemDetails RFC 9457 cho mọi endpoint API
    builder.Services.AddProblemDetails();

    var app = builder.Build();

    app.UseSerilogRequestLogging();

    if (!app.Environment.IsDevelopment())
    {
        app.UseExceptionHandler();
        app.UseHsts();
    }

    app.UseHttpsRedirection();
    app.UseStaticFiles();
    app.UseAntiforgery();

    app.UseAuthentication();
    app.UseAuthorization();

    app.MapRazorComponents<App>()
        .AddInteractiveServerRenderMode();

    app.MapGroup("/identity")
        .MapIdentityApi<ApplicationUser>();

    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "SmartKMS.Web terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}

// Visible cho WebApplicationFactory trong integration tests
public partial class Program
{
}
