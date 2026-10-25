using System.IO;
using Jellyfin.Plugin.WatchParty.Data;
using Jellyfin.Plugin.WatchParty.Services;
using MediaBrowser.Common.Configuration;
using MediaBrowser.Controller;
using MediaBrowser.Controller.Plugins;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Jellyfin.Plugin.WatchParty;

/// <summary>
/// Registers Watch Party plugin services and dependencies into Jellyfin's DI container.
/// </summary>
public class PluginServiceRegistrator : IPluginServiceRegistrator
{
    /// <inheritdoc />
    public void RegisterServices(IServiceCollection serviceCollection, IServerApplicationHost applicationHost)
    {
        // SignalR services
        serviceCollection.AddSignalR();

        // Core Watch Party Room management
        serviceCollection.AddSingleton<IWatchPartyManager, WatchPartyManager>();

        // Chat service & SQLite persistence
        serviceCollection.AddScoped<IChatService, ChatService>();
        serviceCollection.AddHostedService<WatchPartyDbMigrator>();

        // Wire SignalR endpoint through ASP.NET Core startup filter
        serviceCollection.AddTransient<IStartupFilter, WatchPartyStartupFilter>();

        // Isolated SQLite database in Jellyfin Data folder
        serviceCollection.AddDbContext<WatchPartyDbContext>((serviceProvider, options) =>
        {
            var paths = serviceProvider.GetRequiredService<IApplicationPaths>();
            var databasePath = Path.Combine(paths.DataPath, "watchparty.db");
            options.UseSqlite($"Data Source={databasePath}");
        });
    }
}
