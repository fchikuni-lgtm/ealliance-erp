using Hollies.Domain.Exceptions;
using System.Net;
using System.Text.Json;

namespace Hollies.Api.Middleware;

public class ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext ctx)
    {
        try { await next(ctx); }
        catch (Exception ex) { await HandleAsync(ctx, ex, logger); }
    }

    private static async Task HandleAsync(HttpContext ctx, Exception ex, ILogger logger)
    {
        var (status, message) = ex switch
        {
            NotFoundException e     => (HttpStatusCode.NotFound, e.Message),
            ForbiddenException e    => (HttpStatusCode.Forbidden, e.Message),
            Domain.Exceptions.ValidationException e => (HttpStatusCode.BadRequest, e.Message),
            BusinessRuleException e => (HttpStatusCode.UnprocessableEntity, e.Message),
            DuplicateException e    => (HttpStatusCode.Conflict, e.Message),
            FluentValidation.ValidationException e =>
                (HttpStatusCode.BadRequest, string.Join("; ", e.Errors.Select(x => x.ErrorMessage))),
            UnauthorizedAccessException => (HttpStatusCode.Unauthorized, "Unauthorized."),
            _ => (HttpStatusCode.InternalServerError, "An unexpected error occurred.")
        };

        if (status == HttpStatusCode.InternalServerError)
            logger.LogError(ex, "Unhandled exception");

        ctx.Response.ContentType = "application/json";
        ctx.Response.StatusCode = (int)status;
        await ctx.Response.WriteAsync(JsonSerializer.Serialize(new
        {
            status = (int)status,
            message,
            traceId = ctx.TraceIdentifier
        }));
    }
}
