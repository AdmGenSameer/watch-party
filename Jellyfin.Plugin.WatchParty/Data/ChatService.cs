using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;

namespace Jellyfin.Plugin.WatchParty.Data;

/// <summary>
/// Implementation of chat message persistence using WatchPartyDbContext.
/// </summary>
public class ChatService : IChatService
{
    private readonly WatchPartyDbContext _dbContext;

    /// <summary>
    /// Initializes a new instance of the <see cref="ChatService"/> class.
    /// </summary>
    public ChatService(WatchPartyDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    /// <inheritdoc />
    public async Task<ChatMessageEntity> SaveMessageAsync(Guid roomId, Guid userId, string userName, string message, string? emoji = null, CancellationToken ct = default)
    {
        var entity = new ChatMessageEntity
        {
            RoomId = roomId,
            UserId = userId,
            UserName = userName,
            Message = message,
            Emoji = emoji,
            Timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.ChatMessages.Add(entity);
        await _dbContext.SaveChangesAsync(ct).ConfigureAwait(false);

        return entity;
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<ChatMessageEntity>> GetRecentMessagesAsync(Guid roomId, int limit = 50, CancellationToken ct = default)
    {
        return await _dbContext.ChatMessages
            .AsNoTracking()
            .Where(m => m.RoomId == roomId)
            .OrderByDescending(m => m.Timestamp)
            .Take(limit)
            .OrderBy(m => m.Timestamp)
            .ToListAsync(ct)
            .ConfigureAwait(false);
    }
}
