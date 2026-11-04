namespace SmartKMS.Application.Common.Models;

/// <summary>AD-1: Result Pattern không generic (ADD §4.2) — dùng cho Command không có dữ liệu trả về.</summary>
public class Result
{
    public bool IsSuccess { get; }
    public bool IsFailure => !IsSuccess;
    public Error[] Errors { get; }

    private Result(bool isSuccess, Error[] errors)
    {
        IsSuccess = isSuccess;
        Errors = errors;
    }

    public static Result Success() => new(true, []);
    public static Result Failure(params Error[] errors) => new(false, errors);
    public static Result<TValue> Success<TValue>(TValue value) => Result<TValue>.Success(value);
    public static Result<TValue> Failure<TValue>(params Error[] errors) => Result<TValue>.Failure(errors);
}

/// <summary>AD-1: Result Pattern (ADD §4.2). Mọi use case trả về kiểu này — KHÔNG throw cho lỗi nghiệp vụ.</summary>
public class Result<TValue>
{
    public bool IsSuccess { get; }
    public bool IsFailure => !IsSuccess;
    public TValue Value { get; }
    public Error[] Errors { get; }

    private Result(TValue value)
    {
        IsSuccess = true;
        Value = value;
        Errors = [];
    }

    private Result(Error[] errors)
    {
        IsSuccess = false;
        Value = default!;
        Errors = errors;
    }

    public static Result<TValue> Success(TValue value) => new(value);
    public static Result<TValue> Failure(params Error[] errors) => new(errors);

    public static implicit operator Result<TValue>(TValue value) => Success(value);
}
