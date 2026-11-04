namespace SmartKMS.Application.Common.Models;

/// <summary>Kết quả phân trang chuẩn cho mọi query danh sách (dùng cùng MudDataGrid ServerData).</summary>
public sealed record PagedResult<T>(
    IReadOnlyList<T> Items,
    int Page,
    int PageSize,
    int TotalCount)
{
    public int TotalPages => TotalCount == 0 ? 0 : (int)Math.Ceiling(TotalCount / (double)PageSize);
    public bool HasPrevious => Page > 1;
    public bool HasNext => Page < TotalPages;
}
