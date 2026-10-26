using System;
using System.Collections.Concurrent;
using System.IO;
using System.Net.WebSockets;
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
    Task HandleWebSocketAsync(WebSocket webSocket, Guid roomId, Guid userId, string userName, CancellationToken ct);
}

/// <summary>
/// In-memory thread-safe WebSocket broadcast manager.
/// </summary>
public class WatchPartyWebSocketService : IWatchPartyWebSocketService
{
    private readonly ConcurrentDictionary<Guid, ConcurrentDictionary<Guid, WebSocket>> _roomSockets = new();
    private readonly IChatService _chatService;
    private readonly ILogger<WatchPartyWebSocketService> _logger;

    public WatchPartyWebSocketService(IChatService chatService, ILogger<WatchPartyWebSocketService> logger)
    {
        _chatService = chatService;
        _logger = logger;
    }

    public async Task HandleWebSocketAsync(WebSocket webSocket, Guid roomId, Guid userId, string userName, CancellationToken ct)
    {
        var connectionId = Guid.NewGuid();
        var sockets = _roomSockets.GetOrAdd(roomId, _ => new ConcurrentDictionary<Guid, WebSocket>());
        sockets.TryAdd(connectionId, webSocket);

        _logger.LogInformation("WebSocket connected: User {User} in Room {Room}", userName, roomId);

        var buffer = new byte[1024 * 16];
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
                    await ProcessMessageAsync(roomId, connectionId, userId, userName, messageText, ct).ConfigureAwait(false);
                }
            }
        }
        catch (WebSocketException)
        {
            // Client closed connection
        }
        catch (OperationCanceledException)
        {
            // Server shutting down
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error processing WebSocket in Room {Room}", roomId);
        }
        finally
        {
            sockets.TryRemove(connectionId, out _);
            if (sockets.IsEmpty)
            {
                _roomSockets.TryRemove(roomId, out _);
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

            _logger.LogInformation("WebSocket disconnected: User {User} from Room {Room}", userName, roomId);
        }
    }

    private async Task ProcessMessageAsync(Guid roomId, Guid senderConnectionId, Guid userId, string userName, string rawJson, CancellationToken ct)
    {
        try
        {
            using var doc = JsonDocument.Parse(rawJson);
            var root = doc.RootElement;
            var type = root.TryGetProperty("type", out var typeProp) ? typeProp.GetString() : "sync";

            // If chat message, persist
            if (type == "chat" && root.TryGetProperty("message", out var msgProp))
            {
                var message = msgProp.GetString() ?? string.Empty;
                var emoji = root.TryGetProperty("emoji", out var emojiProp) ? emojiProp.GetString() : null;
                await _chatService.SaveMessageAsync(roomId, userId, userName, message, emoji, ct).ConfigureAwait(false);
            }

            // Broadcast to other peers in room
            if (_roomSockets.TryGetValue(roomId, out var sockets))
            {
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
                            // socket dropped
                        }
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to parse/broadcast WebSocket message in room {Room}", roomId);
        }
    }
}
