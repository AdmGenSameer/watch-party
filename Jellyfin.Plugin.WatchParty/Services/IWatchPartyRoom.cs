using System;
using System.Collections.Generic;
using Jellyfin.Plugin.WatchParty.Models;

namespace Jellyfin.Plugin.WatchParty.Services;

/// <summary>
/// Represents an in-memory synchronized Watch Party room instance.
/// </summary>
public interface IWatchPartyRoom
{
    /// <summary>
    /// Gets the room identifier.
    /// </summary>
    Guid RoomId { get; }

    /// <summary>
    /// Gets the room display name.
    /// </summary>
    string RoomName { get; }

    /// <summary>
    /// Gets the short invite code.
    /// </summary>
    string InviteCode { get; }

    /// <summary>
    /// Gets the host's user identifier.
    /// </summary>
    Guid HostId { get; }

    /// <summary>
    /// Gets or sets current media item identifier.
    /// </summary>
    Guid? CurrentItemId { get; set; }

    /// <summary>
    /// Gets current playback position in ticks.
    /// </summary>
    long PositionTicks { get; }

    /// <summary>
    /// Gets a value indicating whether playback is paused.
    /// </summary>
    bool IsPaused { get; }

    /// <summary>
    /// Gets current playback rate.
    /// </summary>
    float PlaybackRate { get; }

    /// <summary>
    /// Gets current room permissions.
    /// </summary>
    RoomPermissions Permissions { get; }

    /// <summary>
    /// Gets all active participants.
    /// </summary>
    IReadOnlyList<WatchPartyMember> Members { get; }

    /// <summary>
    /// Adds a member to the room.
    /// </summary>
    void AddMember(WatchPartyMember member);

    /// <summary>
    /// Removes a member from the room.
    /// </summary>
    void RemoveMember(Guid userId);

    /// <summary>
    /// Updates playback state.
    /// </summary>
    void UpdatePlayback(long positionTicks, bool isPaused, float playbackRate);

    /// <summary>
    /// Converts the current room state into a DTO.
    /// </summary>
    WatchPartyRoomDto ToDto();
}
