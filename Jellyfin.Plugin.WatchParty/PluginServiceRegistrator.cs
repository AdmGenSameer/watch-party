using Jellyfin.Plugin.WatchParty.Data;
using Jellyfin.Plugin.WatchParty.Services;
using MediaBrowser.Controller;
using MediaBrowser.Controller.Plugins;
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
        // Core Watch Party Room management (singleton)
        serviceCollection.AddSingleton<IWatchPartyManager, WatchPartyManager>();

        // Chat service persistence (singleton with thread-safe caching and JSON backup)
        serviceCollection.AddSingleton<IChatService, ChatService>();

        // Real-time WebSocket synchronization service (singleton)
        serviceCollection.AddSingleton<IWatchPartyWebSocketService, WatchPartyWebSocketService>();
    }
}
