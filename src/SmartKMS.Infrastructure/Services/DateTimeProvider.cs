using SmartKMS.Application.Common.Interfaces;

namespace SmartKMS.Infrastructure.Services;

/// <summary>AD-4: nguồn thời gian chuẩn — mọi thời gian lưu trữ theo UTC.</summary>
public sealed class DateTimeProvider : IDateTimeProvider
{
    public DateTimeOffset UtcNow => DateTimeOffset.UtcNow;
}
