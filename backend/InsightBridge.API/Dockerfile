FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy csproj and restore dependencies
COPY ["InsightBridge.API/InsightBridge.API.csproj", "InsightBridge.API/"]
COPY ["InsightBridge.Application/InsightBridge.Application.csproj", "InsightBridge.Application/"]
COPY ["InsightBridge.Domain/InsightBridge.Domain.csproj", "InsightBridge.Domain/"]
COPY ["InsightBridge.Infrastructure/InsightBridge.Infrastructure.csproj", "InsightBridge.Infrastructure/"]
RUN dotnet restore "InsightBridge.API/InsightBridge.API.csproj"

# Copy the rest of the code
COPY . .
WORKDIR "/src/InsightBridge.API"
RUN dotnet build "InsightBridge.API.csproj" -c Release -o /app/build

# Publish
FROM build AS publish
RUN dotnet publish "InsightBridge.API.csproj" -c Release -o /app/publish

# Final image
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "InsightBridge.API.dll"] 