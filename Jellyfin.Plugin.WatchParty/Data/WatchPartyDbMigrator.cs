using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.WatchParty.Data;

/// <summary>
/// Hosted service that ensures the WatchParty SQLite database exists on startup.
/// </summary>
public class WatchPartyDbMigrator : IHostedService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<WatchPartyDbMigrator> _logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="WatchPartyDbMigrator"/> class.
    /// </summary>
    public WatchPartyDbMigrator(IServiceScopeFactory scopeFactory, ILogger<WatchPartyDbMigrator> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task StartAsync(CancellationToken cancellationToken)
    {
        try
        {
            await using var scope = _scopeFactory.CreateAsyncScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<WatchPartyDbContext>();
            await dbContext.Database.EnsureCreatedAsync(cancellationToken).ConfigureAwait(false);
            _logger.LogInformation("WatchParty SQLite database initialized successfully.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to initialize WatchParty SQLite database.");
        }
    }

    /// <inheritdoc />
    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
