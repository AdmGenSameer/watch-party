using Microsoft.EntityFrameworkCore;

namespace Jellyfin.Plugin.WatchParty.Data;

/// <summary>
/// EF Core DbContext for isolated Watch Party data storage in SQLite.
/// </summary>
public class WatchPartyDbContext : DbContext
{
    /// <summary>
    /// Initializes a new instance of the <see cref="WatchPartyDbContext"/> class.
    /// </summary>
    public WatchPartyDbContext(DbContextOptions<WatchPartyDbContext> options)
        : base(options)
    {
    }

    /// <summary>
    /// Gets or sets the chat messages set.
    /// </summary>
    public DbSet<ChatMessageEntity> ChatMessages => Set<ChatMessageEntity>();

    /// <inheritdoc />
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<ChatMessageEntity>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.RoomId);
            entity.HasIndex(e => new { e.RoomId, e.Timestamp });
            entity.Property(e => e.UserName).HasMaxLength(128);
            entity.Property(e => e.Message).HasMaxLength(2000);
            entity.Property(e => e.Emoji).HasMaxLength(32);
        });
    }
}
