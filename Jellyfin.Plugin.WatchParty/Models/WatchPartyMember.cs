using System;

namespace Jellyfin.Plugin.WatchParty.Models;

/// <summary>
/// Represents an active participant in a Watch Party session.
/// </summary>
public class WatchPartyMember
{
    /// <summary>
    /// Gets or sets the Jellyfin user identifier.
    /// </summary>
    public Guid UserId { get; set; }

    /// <summary>
    /// Gets or sets the user's display name.
    /// </summary>
    public string DisplayName { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the user avatar URL or tag.
    /// </summary>
    public string? AvatarUrl { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether the participant is the party host.
    /// </summary>
    public bool IsHost { get; set; }

    /// <summary>
    /// Gets or sets the estimated round-trip latency in milliseconds.
    /// </summary>
    public long PingMs { get; set; }

    /// <summary>
    /// Gets or sets the estimated clock drift from server in milliseconds.
    /// </summary>
    public long ClockOffsetMs { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether the client is currently buffering.
    /// </summary>
    public bool IsBuffering { get; set; }

    /// <summary>
    /// Gets or sets the connection timestamp.
    /// </summary>
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
}
