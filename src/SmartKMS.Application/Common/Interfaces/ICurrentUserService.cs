namespace SmartKMS.Application.Common.Interfaces;

/// <summary>AD-2: danh tính người dùng hiện tại — implement ở Infrastructure từ HttpContext.</summary>
public interface ICurrentUserService
{
    Guid? UserId { get; }
}
