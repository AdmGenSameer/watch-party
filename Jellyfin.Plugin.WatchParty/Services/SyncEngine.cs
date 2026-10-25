using System;

namespace Jellyfin.Plugin.WatchParty.Services;

/// <summary>
/// NTP-style clock synchronization and latency compensation engine.
/// </summary>
public static class SyncEngine
{
    /// <summary>
    /// Calculates clock offset from a 4-timestamp NTP sample.
    /// T1: Client send time
    /// T2: Server receive time
    /// T3: Server transmit time
    /// T4: Client receive time.
    /// </summary>
    public static (long OffsetMs, long RttMs) CalculateOffsetAndRtt(long t1, long t2, long t3, long t4)
    {
        var rtt = (t4 - t1) - (t3 - t2);
        var offset = ((t2 - t1) + (t3 - t4)) / 2;
        return (offset, Math.Max(0, rtt));
    }

    /// <summary>
    /// Computes expected playback position based on last updated position and server elapsed time.
    /// </summary>
    public static long CalculateExpectedPosition(long baseTicks, long updatedAtMs, long serverNowMs, bool isPlaying, float playbackRate = 1.0f)
    {
        if (!isPlaying)
        {
            return baseTicks;
        }

        var elapsedMs = Math.Max(0, serverNowMs - updatedAtMs);
        var elapsedTicks = (long)(elapsedMs * TimeSpan.TicksPerMillisecond * playbackRate);
        return baseTicks + elapsedTicks;
    }

    /// <summary>
    /// Determines whether playback drift requires micro-adjustment or immediate hard seek.
    /// </summary>
    public static SyncCorrectionType DetermineCorrection(long clientTicks, long expectedTicks)
    {
        var driftMs = Math.Abs(clientTicks - expectedTicks) / TimeSpan.TicksPerMillisecond;

        if (driftMs < 30)
        {
            return SyncCorrectionType.None;
        }

        if (driftMs <= 150)
        {
            return clientTicks < expectedTicks ? SyncCorrectionType.SpeedUpMicro : SyncCorrectionType.SlowDownMicro;
        }

        return SyncCorrectionType.HardSeek;
    }
}

/// <summary>
/// Types of synchronization corrections applied to clients.
/// </summary>
public enum SyncCorrectionType
{
    /// <summary>
    /// Client is within acceptable tolerance (<30ms).
    /// </summary>
    None,

    /// <summary>
    /// Minor drift: increase playback rate to 1.03x.
    /// </summary>
    SpeedUpMicro,

    /// <summary>
    /// Minor drift: decrease playback rate to 0.97x.
    /// </summary>
    SlowDownMicro,

    /// <summary>
    /// Significant drift (>150ms): immediate seek jump required.
    /// </summary>
    HardSeek
}
