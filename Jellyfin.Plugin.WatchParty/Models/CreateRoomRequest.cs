using System;

namespace Jellyfin.Plugin.WatchParty.Models;

/// <summary>
/// Request payload for creating a new Watch Party room.
/// </summary>
public class CreateRoomRequest
{
    /// <summary>
    /// Gets or sets the display name for the room.
    /// </summary>
    public string Name { get; set; } = "Movie Night";

    /// <summary>
    /// Gets or sets the optional Jellyfin media item identifier.
    /// </summary>
    public Guid? MediaItemId { get; set; }

    /// <summary>
    /// Gets or sets the permissions for the room.
    /// </summary>
    public RoomPermissions Permissions { get; set; } = RoomPermissions.Default;
}
