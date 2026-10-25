using System;
using System.Linq;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using Jellyfin.Plugin.WatchParty.Data;
using Jellyfin.Plugin.WatchParty.Models;
using Jellyfin.Plugin.WatchParty.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Jellyfin.Plugin.WatchParty.Controllers;

/// <summary>
/// REST API controller for managing Watch Party sessions, rooms, and chat records.
/// </summary>
[ApiController]
[Route("api/watchparty")]
[Authorize]
public class WatchPartyController : ControllerBase
{
    private readonly IWatchPartyManager _roomManager;
    private readonly IChatService _chatService;

    /// <summary>
    /// Initializes a new instance of the <see cref="WatchPartyController"/> class.
    /// </summary>
    public WatchPartyController(IWatchPartyManager roomManager, IChatService chatService)
    {
        _roomManager = roomManager;
        _chatService = chatService;
    }

    /// <summary>
    /// Creates a new Watch Party room.
    /// </summary>
    [HttpPost("rooms")]
    public ActionResult<WatchPartyRoomDto> CreateRoom([FromBody] CreateRoomRequest request)
    {
        var hostId = GetCurrentUserId();
        if (hostId == Guid.Empty)
        {
            hostId = Guid.NewGuid();
        }
        var room = _roomManager.CreateRoom(request.Name, hostId, request.MediaItemId, request.Permissions);

        return Ok(room.ToDto());
    }

    /// <summary>
    /// Lists all currently active public Watch Party rooms.
    /// </summary>
    [HttpGet("rooms")]
    [AllowAnonymous]
    public ActionResult<object> GetActiveRooms()
    {
        var rooms = _roomManager.GetActiveRooms().Select(r => r.ToDto());
        return Ok(rooms);
    }

    /// <summary>
    /// Retrieves room details by room GUID.
    /// </summary>
    [HttpGet("rooms/{roomId:guid}")]
    [AllowAnonymous]
    public ActionResult<WatchPartyRoomDto> GetRoomById(Guid roomId)
    {
        var room = _roomManager.GetRoom(roomId);
        if (room == null)
        {
            return NotFound(new { message = $"Room with ID {roomId} not found." });
        }

        return Ok(room.ToDto());
    }

    /// <summary>
    /// Retrieves room details by 6-character invite code.
    /// </summary>
    [HttpGet("rooms/code/{code}")]
    [AllowAnonymous]
    public ActionResult<WatchPartyRoomDto> GetRoomByCode(string code)
    {
        var room = _roomManager.GetRoomByCode(code);
        if (room == null)
        {
            return NotFound(new { message = $"Room with invite code {code} not found." });
        }

        return Ok(room.ToDto());
    }

    /// <summary>
    /// Closes an active room.
    /// </summary>
    [HttpDelete("rooms/{roomId:guid}")]
    public IActionResult CloseRoom(Guid roomId)
    {
        var room = _roomManager.GetRoom(roomId);
        if (room == null)
        {
            return NotFound();
        }

        var currentUserId = GetCurrentUserId();
        if (room.HostId != currentUserId && !User.IsInRole("Administrator"))
        {
            return Forbid();
        }

        _roomManager.CloseRoom(roomId);
        return NoContent();
    }

    /// <summary>
    /// Retrieves recent chat message history for a room.
    /// </summary>
    [HttpGet("rooms/{roomId:guid}/messages")]
    [AllowAnonymous]
    public async Task<ActionResult> GetRoomMessages(Guid roomId, [FromQuery] int limit = 50, CancellationToken ct = default)
    {
        var messages = await _chatService.GetRecentMessagesAsync(roomId, limit, ct).ConfigureAwait(false);
        return Ok(messages);
    }

    private Guid GetCurrentUserId()
    {
        var val = User.FindFirst("Jellyfin-UserId")?.Value
               ?? User.FindFirst("UserId")?.Value
               ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        return Guid.TryParse(val, out var id) ? id : Guid.Empty;
    }
}
