namespace SmartKMS.Application.Common.Interfaces;

/// <summary>AD-4: nguồn thời gian testable — không gọi DateTime.UtcNow trực tiếp trong Handler.</summary>
public interface IDateTimeProvider
{
    DateTimeOffset UtcNow { get; }
}
