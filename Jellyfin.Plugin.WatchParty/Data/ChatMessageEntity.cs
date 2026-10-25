using System;

namespace Jellyfin.Plugin.WatchParty.Data;

/// <summary>
/// Database entity representing a persisted Watch Party chat message or reaction.
/// </summary>
public class ChatMessageEntity
{
    /// <summary>
    /// Gets or sets primary key identifier.
    /// </summary>
    public long Id { get; set; }

    /// <summary>
    /// Gets or sets the room identifier.
    /// </summary>
    public Guid RoomId { get; set; }

    /// <summary>
    /// Gets or sets the sender Jellyfin user ID.
    /// </summary>
    public Guid UserId { get; set; }

    /// <summary>
    /// Gets or sets the sender display name.
    /// </summary>
    public string UserName { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the chat text content.
    /// </summary>
    public string Message { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets optional emoji reaction string.
    /// </summary>
    public string? Emoji { get; set; }

    /// <summary>
    /// Gets or sets timestamp (milliseconds UTC).
    /// </summary>
    public long Timestamp { get; set; }

    /// <summary>
    /// Gets or sets created at datetime UTC.
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
