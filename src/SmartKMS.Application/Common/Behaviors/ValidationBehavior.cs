using FluentValidation;
using MediatR;
using SmartKMS.Application.Common.Models;

namespace SmartKMS.Application.Common.Behaviors;

/// <summary>
/// AD-3: chạy mọi FluentValidation validator trước Handler (ADD §4.1).
/// Nếu TResponse là Result&lt;T&gt; hoặc Result, trả failure thay vì throw ValidationException.
/// </summary>
public sealed class ValidationBehavior<TRequest, TResponse>(IEnumerable<IValidator<TRequest>> validators)
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
    where TResponse : class
{
    public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken cancellationToken)
    {
        if (!validators.Any())
            return await next();

        var context = new ValidationContext<TRequest>(request);
        var validationResults = await Task.WhenAll(
            validators.Select(v => v.ValidateAsync(context, cancellationToken)));

        var failures = validationResults
            .SelectMany(r => r.Errors)
            .Where(f => f is not null)
            .ToList();

        if (failures.Count == 0)
            return await next();

        var errors = failures.Select(f => Error.Validation(f.PropertyName, f.ErrorMessage)).ToArray();

        if (TryCreateFailureResult(typeof(TResponse), errors, out var failure) && failure is TResponse failureResponse)
            return failureResponse;

        throw new ValidationException(failures);
    }

    private static bool TryCreateFailureResult(Type responseType, Error[] errors, out object? failure)
    {
        if (responseType.IsGenericType && responseType.GetGenericTypeDefinition() == typeof(Result<>))
        {
            var failureMethod = responseType.GetMethod("Failure", [typeof(Error[])]);
            if (failureMethod is not null)
            {
                failure = failureMethod.Invoke(null, [errors]);
                return failure is not null;
            }
        }
        else if (responseType == typeof(Result))
        {
            failure = Result.Failure(errors);
            return true;
        }

        failure = null;
        return false;
    }
}
