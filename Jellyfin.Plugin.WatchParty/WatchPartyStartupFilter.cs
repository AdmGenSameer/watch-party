using System;
using Jellyfin.Plugin.WatchParty.Hubs;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;

namespace Jellyfin.Plugin.WatchParty;

/// <summary>
/// Startup filter that automatically wires up the WatchParty SignalR hub endpoint into ASP.NET Core pipeline.
/// </summary>
public class WatchPartyStartupFilter : IStartupFilter
{
    /// <inheritdoc />
    public Action<IApplicationBuilder> Configure(Action<IApplicationBuilder> next)
    {
        return app =>
        {
            next(app);

            app.UseEndpoints(endpoints =>
            {
                endpoints.MapHub<WatchPartyHub>("/hubs/watchparty");
            });
        };
    }
}
