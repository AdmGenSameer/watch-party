using System;
using System.Collections.Generic;

namespace Jellyfin.Plugin.WatchParty.Models;

/// <summary>
/// Data transfer object representing a synchronized Watch Party session.
/// </summary>
public class WatchPartyRoomDto
{
    /// <summary>
    /// Gets or sets the unique room identifier.
    /// </summary>
    public Guid RoomId { get; set; }

    /// <summary>
    /// Gets or sets the human-readable room name.
    /// </summary>
    public string RoomName { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the 6-character shareable invite code.
    /// </summary>
    public string InviteCode { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the user identifier of the host.
    /// </summary>
    public Guid HostId { get; set; }

    /// <summary>
    /// Gets or sets the currently playing Jellyfin item identifier.
    /// </summary>
    public Guid? CurrentItemId { get; set; }

    /// <summary>
    /// Gets or sets playback position in ticks (1 tick = 100ns).
    /// </summary>
    public long PositionTicks { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether playback is paused.
    /// </summary>
    public bool IsPaused { get; set; }

    /// <summary>
    /// Gets or sets the playback rate (e.g. 1.0).
    /// </summary>
    public float PlaybackRate { get; set; } = 1.0f;

    /// <summary>
    /// Gets or sets room permissions.
    /// </summary>
    public RoomPermissions Permissions { get; set; } = RoomPermissions.Default;

    /// <summary>
    /// Gets or sets the list of connected participants.
    /// </summary>
    public IReadOnlyList<WatchPartyMember> Members { get; set; } = Array.Empty<WatchPartyMember>();
}
