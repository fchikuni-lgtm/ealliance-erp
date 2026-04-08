# eAlliance API Dockerfile — Multi-stage build for Railway deployment
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Restore dependencies (cached layer)
COPY ["src/Hollies.Api/Hollies.Api.csproj", "src/Hollies.Api/"]
COPY ["src/Hollies.Application/Hollies.Application.csproj", "src/Hollies.Application/"]
COPY ["src/Hollies.Domain/Hollies.Domain.csproj", "src/Hollies.Domain/"]
COPY ["src/Hollies.Infrastructure/Hollies.Infrastructure.csproj", "src/Hollies.Infrastructure/"]
COPY ["Directory.Build.props", "./"]
RUN dotnet restore "src/Hollies.Api/Hollies.Api.csproj"

# Build and publish
COPY . .
RUN dotnet publish "src/Hollies.Api/Hollies.Api.csproj" -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
# Railway uses port 8080 by default; configurable via ASPNETCORE_URLS env var
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "Hollies.Api.dll"]
