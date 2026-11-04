using Microsoft.EntityFrameworkCore;

namespace SmartKMS.Application.Common.Interfaces;

/// <summary>
/// AD-1/ADD §3.3: Handler chỉ thấy interface này — quản lý giao dịch qua đây,
/// không qua DbContext cụ thể của Infrastructure.
/// </summary>
public interface IApplicationDbContext
{
    DbSet<TEntity> Set<TEntity>() where TEntity : class;

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
