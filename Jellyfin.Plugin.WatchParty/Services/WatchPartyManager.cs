using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using Jellyfin.Plugin.WatchParty.Models;

namespace Jellyfin.Plugin.WatchParty.Services;

/// <summary>
/// Thread-safe manager for active Watch Party rooms.
/// </summary>
public class WatchPartyManager : IWatchPartyManager
{
    private readonly ConcurrentDictionary<Guid, IWatchPartyRoom> _rooms = new();
    private readonly ConcurrentDictionary<string, Guid> _codeToRoomId = new(StringComparer.OrdinalIgnoreCase);

    /// <inheritdoc />
    public IWatchPartyRoom CreateRoom(string roomName, Guid hostId, Guid? mediaItemId, RoomPermissions permissions)
    {
        var roomId = Guid.NewGuid();
        var inviteCode = GenerateUniqueInviteCode();

        var room = new WatchPartyRoom(roomId, roomName, inviteCode, hostId, mediaItemId, permissions);
        _rooms[roomId] = room;
        _codeToRoomId[inviteCode] = roomId;

        return room;
    }

    /// <inheritdoc />
    public IWatchPartyRoom? GetRoom(Guid roomId)
    {
        _rooms.TryGetValue(roomId, out var room);
        return room;
    }

    /// <inheritdoc />
    public IWatchPartyRoom? GetRoomByCode(string inviteCode)
    {
        if (string.IsNullOrWhiteSpace(inviteCode))
        {
            return null;
        }

        if (_codeToRoomId.TryGetValue(inviteCode.Trim(), out var roomId))
        {
            return GetRoom(roomId);
        }

        return null;
    }

    /// <inheritdoc />
    public IReadOnlyList<IWatchPartyRoom> GetActiveRooms()
    {
        return _rooms.Values.ToList();
    }

    /// <inheritdoc />
    public void CloseRoom(Guid roomId)
    {
        if (_rooms.TryRemove(roomId, out var room))
        {
            _codeToRoomId.TryRemove(room.InviteCode, out _);
        }
    }

    private string GenerateUniqueInviteCode()
    {
        const string Chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        Span<char> code = stackalloc char[6];

        while (true)
        {
            for (var i = 0; i < 6; i++)
            {
                code[i] = Chars[RandomNumberGenerator.GetInt32(Chars.Length)];
            }

            var result = new string(code);
            if (!_codeToRoomId.ContainsKey(result))
            {
                return result;
            }
        }
    }
}
