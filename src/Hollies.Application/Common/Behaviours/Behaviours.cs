using FluentValidation;
using Hollies.Application.Common.Interfaces;
using MediatR;
using Microsoft.Extensions.Logging;

namespace Hollies.Application.Common.Behaviours;

// ── Validation pipeline behaviour ────────────────────────────────
public class ValidationBehaviour<TRequest, TResponse>(
    IEnumerable<IValidator<TRequest>> validators,
    ILogger<ValidationBehaviour<TRequest, TResponse>> logger)
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    public async Task<TResponse> Handle(
        TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken ct)
    {
        if (!validators.Any()) return await next();

        var context = new ValidationContext<TRequest>(request);
        var results = await Task.WhenAll(validators.Select(v => v.ValidateAsync(context, ct)));
        var failures = results.SelectMany(r => r.Errors).Where(f => f != null).ToList();

        if (failures.Count != 0)
        {
            logger.LogWarning("Validation failed for {RequestType}: {Errors}",
                typeof(TRequest).Name, string.Join(", ", failures.Select(f => f.ErrorMessage)));
            throw new ValidationException(failures);
        }

        return await next();
    }
}

// ── Logging pipeline behaviour ────────────────────────────────────
public class LoggingBehaviour<TRequest, TResponse>(
    ILogger<LoggingBehaviour<TRequest, TResponse>> logger,
    ICurrentUserService currentUser)
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    public async Task<TResponse> Handle(
        TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken ct)
    {
        logger.LogInformation("Handling {RequestType} for user {UserId}",
            typeof(TRequest).Name, currentUser.UserId);

        var response = await next();

        logger.LogInformation("Handled {RequestType}", typeof(TRequest).Name);
        return response;
    }
}

// ── Performance behaviour (warn if > 500ms) ──────────────────────
public class PerformanceBehaviour<TRequest, TResponse>(
    ILogger<PerformanceBehaviour<TRequest, TResponse>> logger,
    ICurrentUserService currentUser)
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    public async Task<TResponse> Handle(
        TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken ct)
    {
        var sw = System.Diagnostics.Stopwatch.StartNew();
        var response = await next();
        sw.Stop();

        if (sw.ElapsedMilliseconds > 500)
            logger.LogWarning("Slow request: {RequestType} took {ElapsedMs}ms for user {UserId}",
                typeof(TRequest).Name, sw.ElapsedMilliseconds, currentUser.UserId);

        return response;
    }
}

