using Microsoft.AspNetCore.Identity;

namespace SmartKMS.Infrastructure.Identity;

/// <summary>AD-2: user Identity. Role-based + resource-based policy authorization.</summary>
public class ApplicationUser : IdentityUser<Guid>
{
    public string FullName { get; set; } = string.Empty;
}
