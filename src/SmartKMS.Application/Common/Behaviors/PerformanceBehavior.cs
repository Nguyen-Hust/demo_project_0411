using System.Diagnostics;
using MediatR;
using Microsoft.Extensions.Logging;

namespace SmartKMS.Application.Common.Behaviors;

/// <summary>AD-4: cảnh báo khi một Handler chạy quá 500ms (ADD §4.1 — PerformanceBehavior).</summary>
public sealed class PerformanceBehavior<TRequest, TResponse>(ILogger<PerformanceBehavior<TRequest, TResponse>> logger)
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    private const int WarningThresholdMs = 500;

    public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken cancellationToken)
    {
        var stopwatch = Stopwatch.StartNew();
        var response = await next();
        stopwatch.Stop();

        if (stopwatch.ElapsedMilliseconds > WarningThresholdMs)
        {
            logger.LogWarning(
                "{RequestName} took {ElapsedMilliseconds} ms (threshold {Threshold} ms)",
                typeof(TRequest).Name, stopwatch.ElapsedMilliseconds, WarningThresholdMs);
        }

        return response;
    }
}
