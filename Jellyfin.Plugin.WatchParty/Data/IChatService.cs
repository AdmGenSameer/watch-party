using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace Jellyfin.Plugin.WatchParty.Data;

/// <summary>
/// Service interface for persisting and querying Watch Party chat messages.
/// </summary>
public interface IChatService
{
    /// <summary>
    /// Saves a chat message or reaction to the database.
    /// </summary>
    Task<ChatMessageEntity> SaveMessageAsync(Guid roomId, Guid userId, string userName, string message, string? emoji = null, CancellationToken ct = default);

    /// <summary>
    /// Gets the most recent chat messages for a room.
    /// </summary>
    Task<IReadOnlyList<ChatMessageEntity>> GetRecentMessagesAsync(Guid roomId, int limit = 50, CancellationToken ct = default);
}
