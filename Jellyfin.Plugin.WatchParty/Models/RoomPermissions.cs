using System;

namespace Jellyfin.Plugin.WatchParty.Models;

/// <summary>
/// Watch Party room permission flags.
/// </summary>
[Flags]
public enum RoomPermissions
{
    /// <summary>
    /// No permissions granted.
    /// </summary>
    None = 0,

    /// <summary>
    /// Only host can control play and pause.
    /// </summary>
    MasterControlPlayPause = 1 << 0,

    /// <summary>
    /// Only host can perform seeking.
    /// </summary>
    MasterControlSeek = 1 << 1,

    /// <summary>
    /// Room members are permitted to send chat messages.
    /// </summary>
    MembersCanChat = 1 << 2,

    /// <summary>
    /// Room members are permitted to send floating reactions.
    /// </summary>
    MembersCanReact = 1 << 3,

    /// <summary>
    /// Room members can queue items.
    /// </summary>
    MembersCanAddToQueue = 1 << 4,

    /// <summary>
    /// Shareable 6-character room codes are enabled.
    /// </summary>
    AllowInviteLinks = 1 << 5,

    /// <summary>
    /// Default balanced watch party configuration.
    /// </summary>
    Default = MasterControlPlayPause | MembersCanChat | MembersCanReact | AllowInviteLinks
}
