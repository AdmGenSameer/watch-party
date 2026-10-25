using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Jellyfin.Plugin.WatchParty.Data;
using Jellyfin.Plugin.WatchParty.Models;
using Jellyfin.Plugin.WatchParty.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.WatchParty.Hubs;

/// <summary>
/// SignalR Hub for real-time sub-100ms Watch Party synchronization.
/// </summary>
[AllowAnonymous]
public class WatchPartyHub : Hub
{
    private readonly IWatchPartyManager _roomManager;
    private readonly IChatService _chatService;
    private readonly ILogger<WatchPartyHub> _logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="WatchPartyHub"/> class.
    /// </summary>
    public WatchPartyHub(IWatchPartyManager roomManager, IChatService chatService, ILogger<WatchPartyHub> logger)
    {
        _roomManager = roomManager;
        _chatService = chatService;
        _logger = logger;
    }

    /// <summary>
    /// Joins a specific Watch Party group.
    /// </summary>
    public async Task JoinParty(Guid roomId)
    {
        var groupName = roomId.ToString();
        await Groups.AddToGroupAsync(Context.ConnectionId, groupName).ConfigureAwait(false);

        var userId = GetCurrentUserId();
        var displayName = Context.User?.Identity?.Name ?? "Viewer";

        var room = _roomManager.GetRoom(roomId);
        if (room != null)
        {
            var member = new WatchPartyMember
            {
                UserId = userId,
                DisplayName = displayName,
                IsHost = room.HostId == userId,
                JoinedAt = DateTime.UtcNow
            };
            room.AddMember(member);
        }

        await Clients.Group(groupName).SendAsync("UserConnected", new
        {
            ConnectionId = Context.ConnectionId,
            UserId = userId,
            DisplayName = displayName
        }).ConfigureAwait(false);
    }

    /// <summary>
    /// Leaves a Watch Party group.
    /// </summary>
    public async Task LeaveParty(Guid roomId)
    {
        var groupName = roomId.ToString();
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName).ConfigureAwait(false);

        var userId = GetCurrentUserId();
        var room = _roomManager.GetRoom(roomId);
        room?.RemoveMember(userId);

        await Clients.Group(groupName).SendAsync("UserDisconnected", new
        {
            ConnectionId = Context.ConnectionId,
            UserId = userId
        }).ConfigureAwait(false);
    }

    /// <summary>
    /// Relays arbitrary real-time synchronization payloads to other room members.
    /// </summary>
    public async Task BroadcastSync(Guid roomId, object payload)
    {
        await Clients.OthersInGroup(roomId.ToString()).SendAsync("SyncMessage", payload).ConfigureAwait(false);
    }

    /// <summary>
    /// Relays arbitrary real-time synchronization payloads to other connected clients.
    /// </summary>
    public async Task BroadcastSync(object payload)
    {
        await Clients.Others.SendAsync("SyncMessage", payload).ConfigureAwait(false);
    }

    /// <summary>
    /// Sends play command with target position.
    /// </summary>
    public async Task SendPlay(Guid roomId, long positionTicks)
    {
        var room = _roomManager.GetRoom(roomId);
        room?.UpdatePlayback(positionTicks, false, 1.0f);

        await Clients.Group(roomId.ToString()).SendAsync("PlayCommand", new
        {
            PositionTicks = positionTicks,
            ServerTime = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
        }).ConfigureAwait(false);
    }

    /// <summary>
    /// Sends pause command.
    /// </summary>
    public async Task SendPause(Guid roomId, long positionTicks)
    {
        var room = _roomManager.GetRoom(roomId);
        room?.UpdatePlayback(positionTicks, true, 1.0f);

        await Clients.Group(roomId.ToString()).SendAsync("PauseCommand", new
        {
            PositionTicks = positionTicks,
            ServerTime = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
        }).ConfigureAwait(false);
    }

    /// <summary>
    /// Sends seek command.
    /// </summary>
    public async Task SendSeek(Guid roomId, long positionTicks)
    {
        var room = _roomManager.GetRoom(roomId);
        if (room != null)
        {
            room.UpdatePlayback(positionTicks, room.IsPaused, room.PlaybackRate);
        }

        await Clients.Group(roomId.ToString()).SendAsync("SeekCommand", new
        {
            PositionTicks = positionTicks,
            ServerTime = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
        }).ConfigureAwait(false);
    }

    /// <summary>
    /// Relays chat message to room participants and persists to database.
    /// </summary>
    public async Task SendChat(Guid roomId, string message)
    {
        var userId = GetCurrentUserId();
        var displayName = Context.User?.Identity?.Name ?? "Viewer";

        try
        {
            await _chatService.SaveMessageAsync(roomId, userId, displayName, message).ConfigureAwait(false);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to persist chat message in room {RoomId}", roomId);
        }

        await Clients.Group(roomId.ToString()).SendAsync("ChatMessage", new
        {
            Message = message,
            SenderId = userId.ToString(),
            SenderName = displayName,
            Timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
        }).ConfigureAwait(false);
    }

    /// <summary>
    /// Relays floating reaction to room participants and records it.
    /// </summary>
    public async Task SendReaction(Guid roomId, string emoji)
    {
        var userId = GetCurrentUserId();
        var displayName = Context.User?.Identity?.Name ?? "Viewer";

        try
        {
            await _chatService.SaveMessageAsync(roomId, userId, displayName, string.Empty, emoji).ConfigureAwait(false);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to persist reaction in room {RoomId}", roomId);
        }

        await Clients.Group(roomId.ToString()).SendAsync("ReactionReceived", new
        {
            Emoji = emoji,
            SenderId = userId.ToString(),
            SenderName = displayName,
            Timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
        }).ConfigureAwait(false);
    }

    /// <summary>
    /// Precision clock sync NTP responder.
    /// </summary>
    public Task<long> Ping(long clientTimestamp)
    {
        return Task.FromResult(DateTimeOffset.UtcNow.ToUnixTimeMilliseconds());
    }

    private Guid GetCurrentUserId()
    {
        var val = Context.User?.FindFirst("Jellyfin-UserId")?.Value
               ?? Context.User?.FindFirst("UserId")?.Value
               ?? Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value
               ?? Context.UserIdentifier;

        if (Guid.TryParse(val, out var id) && id != Guid.Empty)
        {
            return id;
        }

        // Return deterministic GUID based on ConnectionId for anonymous sessions
        return new Guid(System.Security.Cryptography.MD5.HashData(System.Text.Encoding.UTF8.GetBytes(Context.ConnectionId)));
    }
}
