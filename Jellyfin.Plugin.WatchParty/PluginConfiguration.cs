using MediaBrowser.Model.Plugins;

namespace Jellyfin.Plugin.WatchParty;

/// <summary>
/// Plugin configuration for WatchParty &amp; Tokoshan Netflix-style UI.
/// </summary>
public class PluginConfiguration : BasePluginConfiguration
{
    /// <summary>
    /// Gets or sets a value indicating whether Watch Party feature is enabled.
    /// </summary>
    public bool EnableWatchParty { get; set; } = true;

    /// <summary>
    /// Gets or sets a value indicating whether the custom Netflix-style UI at /tokoshan is enabled.
    /// </summary>
    public bool EnableTokoshanUi { get; set; } = true;

    /// <summary>
    /// Gets or sets the default room chat retention in days.
    /// </summary>
    public int ChatHistoryRetentionDays { get; set; } = 30;

    /// <summary>
    /// Gets or sets the custom brand or theater name displayed in UI.
    /// </summary>
    public string TheaterName { get; set; } = "Tokoshan Cinema";
}
