using System;
using System.Collections.Generic;
using MediaBrowser.Common.Configuration;
using MediaBrowser.Common.Plugins;
using MediaBrowser.Model.Plugins;
using MediaBrowser.Model.Serialization;

namespace Jellyfin.Plugin.WatchParty;

/// <summary>
/// Main entry point for the Jellyfin WatchParty and Netflix UI plugin.
/// </summary>
public class Plugin : BasePlugin<PluginConfiguration>, IHasWebPages
{
    /// <summary>
    /// Gets the singleton plugin instance.
    /// </summary>
    public static Plugin? Instance { get; private set; }

    /// <summary>
    /// Initializes a new instance of the <see cref="Plugin"/> class.
    /// </summary>
    /// <param name="applicationPaths">The application paths.</param>
    /// <param name="xmlSerializer">The XML serializer.</param>
    public Plugin(IApplicationPaths applicationPaths, IXmlSerializer xmlSerializer)
        : base(applicationPaths, xmlSerializer)
    {
        Instance = this;
    }

    /// <inheritdoc />
    public override Guid Id => new Guid("d7e4b2f1-8c3a-4e91-b5d6-2f7a9c1e3b48");

    /// <inheritdoc />
    public override string Name => "WatchParty";

    /// <inheritdoc />
    public override string Description => "Netflix-style immersive UI and synchronized Watch Party for Jellyfin.";

    /// <inheritdoc />
    public override string ConfigurationFileName => "Jellyfin.Plugin.WatchParty.xml";

    /// <inheritdoc />
    public IEnumerable<PluginPageInfo> GetPages()
    {
        yield return new PluginPageInfo
        {
            Name = Name,
            EmbeddedResourcePath = $"{GetType().Namespace}.Configuration.config.html",
            EnableInMainMenu = true,
            MenuSection = "server",
            MenuIcon = "play_circle"
        };
    }
}
