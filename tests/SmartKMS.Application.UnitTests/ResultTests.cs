using SmartKMS.Application.Common.Models;

namespace SmartKMS.Application.UnitTests;

public class ResultTests
{
    [Fact]
    public void Success_HoldsValue_WithImplicitConversion()
    {
        Result<int> result = 42;

        Assert.True(result.IsSuccess);
        Assert.Equal(42, result.Value);
    }

    [Fact]
    public void Failure_CarriesAllErrors()
    {
        var error = Error.NotFound("child.not_found", "Không tìm thấy trẻ");

        var result = Result<int>.Failure(error);

        Assert.True(result.IsFailure);
        Assert.Single(result.Errors);
        Assert.Equal("child.not_found", result.Errors[0].Code);
    }

    [Fact]
    public void NonGenericFailure_IsFailure()
    {
        var result = Result.Failure(Error.Validation("name", "Tên không được trống"));

        Assert.True(result.IsFailure);
        Assert.False(result.IsSuccess);
    }

    [Fact]
    public void Error_None_IsEmpty()
    {
        Assert.Equal(string.Empty, Error.None.Code);
    }

    [Fact]
    public void PagedResult_ComputesNavigation()
    {
        var page = new PagedResult<string>(["a", "b"], Page: 1, PageSize: 2, TotalCount: 5);

        Assert.Equal(3, page.TotalPages);
        Assert.True(page.HasNext);
        Assert.False(page.HasPrevious);
    }
}
