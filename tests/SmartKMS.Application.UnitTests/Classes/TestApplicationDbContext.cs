using Microsoft.EntityFrameworkCore;
using SmartKMS.Application.Common.Interfaces;
using SmartKMS.Domain.Modules.Classes;

namespace SmartKMS.Application.UnitTests.Classes;

/// <summary>
/// Test double ở seam công khai (`IApplicationDbContext`) — spec Testing Decisions:
/// handler test dùng in-memory DB, không test internal.
/// </summary>
public sealed class TestApplicationDbContext : DbContext, IApplicationDbContext
{
    public TestApplicationDbContext(DbContextOptions<TestApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<Class> Classes => Set<Class>();
}
