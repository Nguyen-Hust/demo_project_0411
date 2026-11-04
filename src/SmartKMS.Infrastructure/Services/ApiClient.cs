using System.Diagnostics;
using System.Net.Http.Json;
using SmartKMS.Application.Common.Models;

namespace SmartKMS.Infrastructure.Services;

/// <summary>
/// AD-1/AD-4: HttpClient wrapper chuẩn hóa — gắn TraceId vào mọi request,
/// decode envelope { data, error, meta } sang Result&lt;T&gt;.
/// </summary>
public sealed class ApiClient(HttpClient httpClient)
{
    public async Task<Result<TData>> GetAsync<TData>(string url, CancellationToken cancellationToken = default)
        where TData : class
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        request.Headers.TryAddWithoutValidation("TraceId", Activity.Current?.Id);

        var response = await httpClient.SendAsync(request, cancellationToken);
        return await ReadEnvelopeAsync<TData>(response, cancellationToken);
    }

    private static async Task<Result<TData>> ReadEnvelopeAsync<TData>(HttpResponseMessage response, CancellationToken cancellationToken)
        where TData : class
    {
        if (!response.IsSuccessStatusCode)
        {
            return Result<TData>.Failure(new Error(
                $"http_{(int)response.StatusCode}",
                $"HTTP {(int)response.StatusCode} {response.ReasonPhrase}",
                ErrorType.Failure));
        }

        var envelope = await response.Content.ReadFromJsonAsync<ApiEnvelope<TData>>(cancellationToken: cancellationToken);
        if (envelope is null)
            return Result<TData>.Failure(new Error("http.invalid_body", "Response body is empty or invalid", ErrorType.Failure));
        if (envelope.Error is not null)
            return Result<TData>.Failure(envelope.Error);

        return Result<TData>.Success(envelope.Data!);
    }
}

/// <summary>Envelope chuẩn cho mọi API endpoint công khai (AD-1).</summary>
public sealed record ApiEnvelope<TData>(TData? Data, Error? Error, object? Meta);
