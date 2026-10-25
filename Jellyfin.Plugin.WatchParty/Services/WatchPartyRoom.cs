using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using Jellyfin.Plugin.WatchParty.Models;

namespace Jellyfin.Plugin.WatchParty.Services;

/// <summary>
/// In-memory synchronized Watch Party room instance.
/// </summary>
public class WatchPartyRoom : IWatchPartyRoom
{
    private readonly ConcurrentDictionary<Guid, WatchPartyMember> _members = new();

    /// <summary>
    /// Initializes a new instance of the <see cref="WatchPartyRoom"/> class.
    /// </summary>
    public WatchPartyRoom(Guid roomId, string roomName, string inviteCode, Guid hostId, Guid? mediaItemId, RoomPermissions permissions)
    {
        RoomId = roomId;
        RoomName = roomName;
        InviteCode = inviteCode;
        HostId = hostId;
        CurrentItemId = mediaItemId;
        Permissions = permissions;
        PositionTicks = 0;
        IsPaused = true;
        PlaybackRate = 1.0f;
    }

    /// <inheritdoc />
    public Guid RoomId { get; }

    /// <inheritdoc />
    public string RoomName { get; }

    /// <inheritdoc />
    public string InviteCode { get; }

    /// <inheritdoc />
    public Guid HostId { get; }

    /// <inheritdoc />
    public Guid? CurrentItemId { get; set; }

    /// <inheritdoc />
    public long PositionTicks { get; private set; }

    /// <inheritdoc />
    public bool IsPaused { get; private set; }

    /// <inheritdoc />
    public float PlaybackRate { get; private set; }

    /// <inheritdoc />
    public RoomPermissions Permissions { get; }

    /// <inheritdoc />
    public IReadOnlyList<WatchPartyMember> Members => _members.Values.ToList();

    /// <inheritdoc />
    public void AddMember(WatchPartyMember member)
    {
        _members[member.UserId] = member;
    }

    /// <inheritdoc />
    public void RemoveMember(Guid userId)
    {
        _members.TryRemove(userId, out _);
    }

    /// <inheritdoc />
    public void UpdatePlayback(long positionTicks, bool isPaused, float playbackRate)
    {
        PositionTicks = positionTicks;
        IsPaused = isPaused;
        PlaybackRate = playbackRate;
    }

    /// <inheritdoc />
    public WatchPartyRoomDto ToDto()
    {
        return new WatchPartyRoomDto
        {
            RoomId = RoomId,
            RoomName = RoomName,
            InviteCode = InviteCode,
            HostId = HostId,
            CurrentItemId = CurrentItemId,
            PositionTicks = PositionTicks,
            IsPaused = IsPaused,
            PlaybackRate = PlaybackRate,
            Permissions = Permissions,
            Members = Members
        };
    }
}
