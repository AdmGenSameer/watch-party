using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using MediaBrowser.Common.Configuration;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.WatchParty.Data;

/// <summary>
/// High-performance thread-safe chat message service with in-memory caching and JSON persistence.
/// Eliminates external EF Core/native SQLite dependencies to ensure 100% Jellyfin plugin stability.
/// </summary>
public class ChatService : IChatService
{
    private readonly string _chatStorageDir;
    private readonly ILogger<ChatService> _logger;
    private readonly ConcurrentDictionary<Guid, List<ChatMessageEntity>> _memoryCache = new();
    private readonly ConcurrentDictionary<Guid, SemaphoreSlim> _roomLocks = new();
    private static long _idCounter = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

    /// <summary>
    /// Initializes a new instance of the <see cref="ChatService"/> class.
    /// </summary>
    /// <param name="applicationPaths">The application paths.</param>
    /// <param name="logger">The logger.</param>
    public ChatService(IApplicationPaths applicationPaths, ILogger<ChatService> logger)
    {
        _logger = logger;
        _chatStorageDir = Path.Combine(applicationPaths.DataPath, "watchparty_chat");
        try
        {
            Directory.CreateDirectory(_chatStorageDir);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not create watchparty_chat directory at {Path}", _chatStorageDir);
        }
    }

    /// <inheritdoc />
    public async Task<ChatMessageEntity> SaveMessageAsync(Guid roomId, Guid userId, string userName, string message, string? emoji = null, CancellationToken ct = default)
    {
        var entity = new ChatMessageEntity
        {
            Id = Interlocked.Increment(ref _idCounter),
            RoomId = roomId,
            UserId = userId,
            UserName = userName,
            Message = message,
            Emoji = emoji,
            Timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
            CreatedAt = DateTime.UtcNow
        };

        var roomLock = _roomLocks.GetOrAdd(roomId, _ => new SemaphoreSlim(1, 1));
        await roomLock.WaitAsync(ct).ConfigureAwait(false);
        try
        {
            var list = _memoryCache.GetOrAdd(roomId, _ => LoadRoomMessagesFromDisk(roomId));
            list.Add(entity);
            if (list.Count > 500)
            {
                list.RemoveAt(0);
            }

            await PersistRoomMessagesAsync(roomId, list, ct).ConfigureAwait(false);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to persist chat message for room {RoomId}", roomId);
        }
        finally
        {
            roomLock.Release();
        }

        return entity;
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<ChatMessageEntity>> GetRecentMessagesAsync(Guid roomId, int limit = 50, CancellationToken ct = default)
    {
        var roomLock = _roomLocks.GetOrAdd(roomId, _ => new SemaphoreSlim(1, 1));
        await roomLock.WaitAsync(ct).ConfigureAwait(false);
        try
        {
            var list = _memoryCache.GetOrAdd(roomId, _ => LoadRoomMessagesFromDisk(roomId));
            var count = Math.Min(limit, list.Count);
            return list.Skip(list.Count - count).ToList();
        }
        finally
        {
            roomLock.Release();
        }
    }

    private List<ChatMessageEntity> LoadRoomMessagesFromDisk(Guid roomId)
    {
        try
        {
            var filePath = Path.Combine(_chatStorageDir, $"{roomId:N}.json");
            if (File.Exists(filePath))
            {
                var json = File.ReadAllText(filePath);
                var messages = JsonSerializer.Deserialize<List<ChatMessageEntity>>(json);
                if (messages != null)
                {
                    return messages;
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error reading chat history for room {RoomId}", roomId);
        }

        return new List<ChatMessageEntity>();
    }

    private async Task PersistRoomMessagesAsync(Guid roomId, List<ChatMessageEntity> messages, CancellationToken ct)
    {
        try
        {
            var filePath = Path.Combine(_chatStorageDir, $"{roomId:N}.json");
            var json = JsonSerializer.Serialize(messages);
            await File.WriteAllTextAsync(filePath, json, ct).ConfigureAwait(false);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error writing chat history for room {RoomId}", roomId);
        }
    }
}
