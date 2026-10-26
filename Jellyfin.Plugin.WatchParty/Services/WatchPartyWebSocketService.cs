using System;
using System.Collections.Concurrent;
using System.IO;
using System.Net.WebSockets;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Jellyfin.Plugin.WatchParty.Data;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.WatchParty.Services;

/// <summary>
/// Service that manages real-time WebSocket connections and broadcasts sync events.
/// </summary>
public interface IWatchPartyWebSocketService
{
    /// <summary>
    /// Handles a new WebSocket connection for a given room.
    /// </summary>
    Task HandleWebSocketAsync(WebSocket webSocket, string roomId, Guid userId, string userName, CancellationToken ct);
}

/// <summary>
/// In-memory thread-safe WebSocket broadcast manager.
/// </summary>
public class WatchPartyWebSocketService : IWatchPartyWebSocketService
{
    private readonly ConcurrentDictionary<string, ConcurrentDictionary<Guid, WebSocket>> _roomSockets = new(StringComparer.OrdinalIgnoreCase);
    private readonly ConcurrentDictionary<Guid, (WebSocket Socket, string RoomKey)> _activeConnections = new();
    private readonly IChatService _chatService;
    private readonly ILogger<WatchPartyWebSocketService> _logger;

    public WatchPartyWebSocketService(IChatService chatService, ILogger<WatchPartyWebSocketService> logger)
    {
        _chatService = chatService;
        _logger = logger;
    }

    public static string NormalizeRoomKey(string roomId)
    {
        if (string.IsNullOrWhiteSpace(roomId))
        {
            return "DEFAULT";
        }

        var cleaned = roomId.Trim();
        if (cleaned.StartsWith("party_", StringComparison.OrdinalIgnoreCase))
        {
            cleaned = cleaned.Substring(6);
        }
        else if (cleaned.StartsWith("room_", StringComparison.OrdinalIgnoreCase))
        {
            cleaned = cleaned.Substring(5);
        }

        return cleaned.ToUpperInvariant();
    }

    public static Guid StringToGuid(string value)
    {
        if (Guid.TryParse(value, out var guid))
        {
            return guid;
        }

        using var md5 = MD5.Create();
        var hash = md5.ComputeHash(Encoding.UTF8.GetBytes(value));
        return new Guid(hash);
    }

    public async Task HandleWebSocketAsync(WebSocket webSocket, string roomId, Guid userId, string userName, CancellationToken ct)
    {
        var connectionId = Guid.NewGuid();
        var normRoom = NormalizeRoomKey(roomId);

        var sockets = _roomSockets.GetOrAdd(normRoom, _ => new ConcurrentDictionary<Guid, WebSocket>());
        sockets.TryAdd(connectionId, webSocket);
        _activeConnections.TryAdd(connectionId, (webSocket, normRoom));

        _logger.LogInformation("WatchParty WebSocket connected: User {User} in Room {Room} (norm: {NormRoom})", userName, roomId, normRoom);

        var buffer = new byte[1024 * 32];
        try
        {
            while (webSocket.State == WebSocketState.Open && !ct.IsCancellationRequested)
            {
                var result = await webSocket.ReceiveAsync(new ArraySegment<byte>(buffer), ct).ConfigureAwait(false);
                if (result.MessageType == WebSocketMessageType.Close)
                {
                    break;
                }

                if (result.MessageType == WebSocketMessageType.Text)
                {
                    var messageText = Encoding.UTF8.GetString(buffer, 0, result.Count);
                    await ProcessMessageAsync(normRoom, connectionId, webSocket, userId, userName, messageText, ct).ConfigureAwait(false);
                }
            }
        }
        catch (WebSocketException)
        {
            // Client closed connection abruptly
        }
        catch (OperationCanceledException)
        {
            // Server shutting down
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error processing WebSocket in Room {Room}", normRoom);
        }
        finally
        {
            if (_activeConnections.TryRemove(connectionId, out var connInfo))
            {
                if (_roomSockets.TryGetValue(connInfo.RoomKey, out var currentSockets))
                {
                    currentSockets.TryRemove(connectionId, out _);
                    if (currentSockets.IsEmpty)
                    {
                        _roomSockets.TryRemove(connInfo.RoomKey, out _);
                    }
                }
            }

            if (webSocket.State == WebSocketState.Open || webSocket.State == WebSocketState.CloseReceived)
            {
                try
                {
                    await webSocket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Closing", CancellationToken.None).ConfigureAwait(false);
                }
                catch
                {
                    // Ignore
                }
            }

            _logger.LogInformation("WatchParty WebSocket disconnected: User {User} from Room {Room}", userName, normRoom);
        }
    }

    private async Task ProcessMessageAsync(
        string defaultRoom,
        Guid senderConnectionId,
        WebSocket senderSocket,
        Guid userId,
        string userName,
        string rawJson,
        CancellationToken ct)
    {
        try
        {
            using var doc = JsonDocument.Parse(rawJson);
            var root = doc.RootElement;

            // Extract room identifier if present in payload
            var targetRoom = defaultRoom;
            if (root.TryGetProperty("roomId", out var roomProp) && !string.IsNullOrWhiteSpace(roomProp.GetString()))
            {
                targetRoom = NormalizeRoomKey(roomProp.GetString()!);
            }
            else if (root.TryGetProperty("roomCode", out var codeProp) && !string.IsNullOrWhiteSpace(codeProp.GetString()))
            {
                targetRoom = NormalizeRoomKey(codeProp.GetString()!);
            }

            // Ensure sender is registered in this target room
            var sockets = _roomSockets.GetOrAdd(targetRoom, _ => new ConcurrentDictionary<Guid, WebSocket>());
            sockets.TryAdd(senderConnectionId, senderSocket);
            _activeConnections[senderConnectionId] = (senderSocket, targetRoom);

            var action = root.TryGetProperty("action", out var actionProp) ? actionProp.GetString() : null;
            var type = root.TryGetProperty("type", out var typeProp) ? typeProp.GetString() : null;

            // Handle CHAT message persistence
            if ((action == "CHAT" || type == "chat") && root.TryGetProperty("message", out var msgProp))
            {
                string text = string.Empty;
                if (msgProp.ValueKind == JsonValueKind.Object && msgProp.TryGetProperty("content", out var contentProp))
                {
                    text = contentProp.GetString() ?? string.Empty;
                }
                else if (msgProp.ValueKind == JsonValueKind.String)
                {
                    text = msgProp.GetString() ?? string.Empty;
                }

                if (!string.IsNullOrWhiteSpace(text))
                {
                    var guidRoom = StringToGuid(targetRoom);
                    await _chatService.SaveMessageAsync(guidRoom, userId, userName, text, null, ct).ConfigureAwait(false);
                }
            }
            // Handle REACTION event persistence
            else if (action == "REACTION" || type == "reaction")
            {
                string? emoji = null;
                if (root.TryGetProperty("reaction", out var reactProp) && reactProp.ValueKind == JsonValueKind.Object && reactProp.TryGetProperty("emoji", out var emojiProp))
                {
                    emoji = emojiProp.GetString();
                }
                else if (root.TryGetProperty("emoji", out var emojiProp2))
                {
                    emoji = emojiProp2.GetString();
                }

                if (!string.IsNullOrWhiteSpace(emoji))
                {
                    var guidRoom = StringToGuid(targetRoom);
                    await _chatService.SaveMessageAsync(guidRoom, userId, userName, string.Empty, emoji, ct).ConfigureAwait(false);
                }
            }

            // Broadcast to all other peers in the room
            var bytes = Encoding.UTF8.GetBytes(rawJson);
            var segment = new ArraySegment<byte>(bytes);

            foreach (var pair in sockets)
            {
                if (pair.Key != senderConnectionId && pair.Value.State == WebSocketState.Open)
                {
                    try
                    {
                        await pair.Value.SendAsync(segment, WebSocketMessageType.Text, true, ct).ConfigureAwait(false);
                    }
                    catch
                    {
                        // Socket dropped; will be cleaned up in its own loop
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to parse/broadcast WebSocket message in room {Room}", defaultRoom);
        }
    }
}
