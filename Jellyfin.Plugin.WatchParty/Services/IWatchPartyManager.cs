using System;
using System.Collections.Generic;
using Jellyfin.Plugin.WatchParty.Models;

namespace Jellyfin.Plugin.WatchParty.Services;

/// <summary>
/// Service managing Watch Party sessions and room routing.
/// </summary>
public interface IWatchPartyManager
{
    /// <summary>
    /// Creates a new Watch Party room.
    /// </summary>
    IWatchPartyRoom CreateRoom(string roomName, Guid hostId, Guid? mediaItemId, RoomPermissions permissions);

    /// <summary>
    /// Retrieves an existing room by its identifier.
    /// </summary>
    IWatchPartyRoom? GetRoom(Guid roomId);

    /// <summary>
    /// Retrieves an existing room by its 6-character code.
    /// </summary>
    IWatchPartyRoom? GetRoomByCode(string inviteCode);

    /// <summary>
    /// Lists all currently active public rooms.
    /// </summary>
    IReadOnlyList<IWatchPartyRoom> GetActiveRooms();

    /// <summary>
    /// Closes and cleans up a room.
    /// </summary>
    void CloseRoom(Guid roomId);
}
