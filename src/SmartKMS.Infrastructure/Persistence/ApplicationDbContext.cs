using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using SmartKMS.Application.Common.Interfaces;
using SmartKMS.Infrastructure.Identity;

namespace SmartKMS.Infrastructure.Persistence;

/// <summary>
/// AD-1/ADD §3.3: DbContext duy nhất, implement IApplicationDbContext.
/// Config từng entity qua IEntityTypeConfiguration (ADD §5.3) — cấm DataAnnotations.
/// </summary>
public class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
    : IdentityDbContext<ApplicationUser, IdentityRole<Guid>, Guid>(options), IApplicationDbContext
{
    // DbSet cho từng module (Children, Staff, Attendance, Nutrition...) thêm ở wave có entity đầu tiên.

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.ApplyConfigurationsFromAssembly(typeof(ApplicationDbContext).Assembly);
    }
}
