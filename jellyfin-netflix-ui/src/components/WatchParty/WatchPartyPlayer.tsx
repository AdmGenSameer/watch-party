import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Lock, RotateCcw, RotateCw } from 'lucide-react';
import Hls from 'hls.js';
import { useWatchPartyStore } from '../../store/useWatchPartyStore';

export default function WatchPartyPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const currentRoom = useWatchPartyStore(state => state.currentRoom);
  const isHost = useWatchPartyStore(state => state.isHost);
  const syncStatus = useWatchPartyStore(state => state.syncStatus);
  const currentDrift = useWatchPartyStore(state => state.currentDrift);
  const setDrift = useWatchPartyStore(state => state.setDrift);
  const sendPlay = useWatchPartyStore(state => state.sendPlay);
  const sendPause = useWatchPartyStore(state => state.sendPause);
  const sendSeek = useWatchPartyStore(state => state.sendSeek);
  const sendHeartbeat = useWatchPartyStore(state => state.sendHeartbeat);
  const setBuffering = useWatchPartyStore(state => state.setBuffering);

  const [isPlayingLocal, setIsPlayingLocal] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.9);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<any>(null);

  const streamUrl = currentRoom?.media.streamUrl || '';
  const isHostLocked = !!currentRoom?.permissions.hostOnlyControl && !isHost;

  // Initialize HLS / Video source
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl) return;

    if (streamUrl.includes('.m3u8')) {
      if (Hls.isSupported()) {
        const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
        hlsRef.current = hls;
        hls.loadSource(streamUrl);
        hls.attachMedia(video);
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = streamUrl;
      }
    } else {
      video.src = streamUrl;
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [streamUrl]);

  // Sync state loop with room updates
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentRoom) return;

    const syncPlayback = () => {
      const serverNow = Date.now();
      const elapsedSinceUpdate = (serverNow - currentRoom.updatedAt) / 1000;
      const expectedPos = currentRoom.isPlaying 
        ? currentRoom.currentTime + Math.max(0, elapsedSinceUpdate)
        : currentRoom.currentTime;

      const drift = (video.currentTime - expectedPos) * 1000; // in ms
      setDrift(drift);

      // 1. Play / Pause alignment
      if (currentRoom.isPlaying && video.paused) {
        video.play().catch(() => {
          // Autoplay policy might require user click
        });
      } else if (!currentRoom.isPlaying && !video.paused) {
        video.pause();
      }

      // 2. Drift correction for Guests
      if (!isHost) {
        const absDrift = Math.abs(drift);
        if (absDrift > 250) {
          // Hard seek for significant drift
          video.currentTime = expectedPos;
        } else if (absDrift > 30) {
          // Micro-playback rate adjustment (no audio artifact)
          video.playbackRate = drift > 0 ? 0.97 : 1.03;
        } else {
          // In sync!
          video.playbackRate = 1.0;
        }
      }
    };

    syncPlayback();
  }, [currentRoom, isHost, setDrift]);

  // Host Heartbeat Broadcast Loop (every 2 seconds)
  useEffect(() => {
    if (!isHost || !currentRoom) return;

    const interval = setInterval(() => {
      const video = videoRef.current;
      if (video && !video.paused) {
        sendHeartbeat(video.currentTime);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isHost, currentRoom, sendHeartbeat]);

  // Video event handlers
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (video) {
      setCurrentTime(video.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (video) {
      setDuration(video.duration || 0);
      video.volume = volume;
    }
  };

  const handlePlayPause = () => {
    if (isHostLocked) return;

    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      sendPlay(video.currentTime);
    } else {
      sendPause(video.currentTime);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isHostLocked) return;

    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    const video = videoRef.current;
    if (video) {
      video.currentTime = newTime;
    }
    sendSeek(newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const handleToggleMute = () => {
    if (videoRef.current) {
      const newMute = !isMuted;
      videoRef.current.muted = newMute;
      setIsMuted(newMute);
      if (!newMute && volume === 0) {
        setVolume(0.5);
        videoRef.current.volume = 0.5;
      }
    }
  };

  const handleToggleFullscreen = () => {
    const container = document.querySelector('.theater-video-wrapper');
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(console.error);
    } else {
      document.exitFullscreen().catch(console.error);
    }
  };

  const handleSkip = (seconds: number) => {
    if (isHostLocked) return;
    const video = videoRef.current;
    if (!video) return;
    const target = Math.max(0, Math.min(duration || 0, video.currentTime + seconds));
    video.currentTime = target;
    setCurrentTime(target);
    sendSeek(target);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in chat input
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        handlePlayPause();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handleSkip(-10);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleSkip(10);
      } else if (e.code === 'KeyF') {
        e.preventDefault();
        handleToggleFullscreen();
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        handleToggleMute();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isHostLocked, duration, isPlayingLocal, isMuted, volume]);

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlayingLocal) {
        setShowControls(false);
      }
    }, 3500);
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '00:00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h < 10 ? '0' : ''}${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div
      className="theater-video-wrapper"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlayingLocal && setShowControls(false)}
    >
      {/* Sync Status Badge (Top Left) */}
      <div className="player-sync-status-pill" title={`NTP Drift: ${Math.round(currentDrift)}ms`}>
        <span className={`status-dot-${syncStatus === 'synced' ? 'synced' : syncStatus === 'syncing' ? 'syncing' : 'buffering'}`} />
        <span>{syncStatus === 'synced' ? 'In Sync' : syncStatus === 'syncing' ? 'Syncing...' : 'Buffering...'}</span>
      </div>

      {/* Host Lock Notification (Top Right) */}
      {isHostLocked && (
        <div className="host-locked-pill">
          <Lock size={12} />
          <span>Host controls only</span>
        </div>
      )}

      {/* HTML5 Video Element */}
      <video
        ref={videoRef}
        className="video-element"
        playsInline
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={() => setIsPlayingLocal(true)}
        onPause={() => setIsPlayingLocal(false)}
        onWaiting={() => setBuffering(true)}
        onPlaying={() => setBuffering(false)}
        onClick={handlePlayPause}
      />

      {/* Video Controls Bar */}
      <div
        className="player-controls-overlay"
        style={{
          opacity: showControls ? 1 : 0,
          pointerEvents: showControls ? 'auto' : 'none'
        }}
      >
        {/* Scrubber Timeline */}
        <input
          type="range"
          min="0"
          max={duration || 100}
          value={currentTime}
          onChange={handleSeek}
          disabled={isHostLocked}
          className="player-timeline-slider"
          title={isHostLocked ? 'Playback is locked by host' : 'Seek'}
        />

        {/* Controls Row */}
        <div className="player-controls-row">
          <div className="controls-left">
            <button
              className="control-btn"
              onClick={handlePlayPause}
              disabled={isHostLocked}
              title={isHostLocked ? 'Host locked' : isPlayingLocal ? 'Pause (Space)' : 'Play (Space)'}
            >
              {isPlayingLocal ? <Pause size={20} /> : <Play size={20} />}
            </button>

            {/* Skip 10s Backward & Forward */}
            <button
              className="control-btn"
              onClick={() => handleSkip(-10)}
              disabled={isHostLocked}
              title="Rewind 10s (←)"
            >
              <RotateCcw size={17} />
            </button>
            <button
              className="control-btn"
              onClick={() => handleSkip(10)}
              disabled={isHostLocked}
              title="Fast Forward 10s (→)"
            >
              <RotateCw size={17} />
            </button>

            {/* Volume Control */}
            <div className="controls-left" style={{ gap: '8px', marginLeft: '4px' }}>
              <button className="control-btn" onClick={handleToggleMute} title={isMuted ? 'Unmute (M)' : 'Mute (M)'}>
                {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              <input
                type="range"
                className="volume-slider"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                style={{ width: '68px', cursor: 'pointer', accentColor: 'var(--wp-red)' }}
              />
            </div>

            {/* Time Display */}
            <div className="time-display" style={{ marginLeft: '6px' }}>
              <span>{formatTime(currentTime)}</span>
              <span style={{ opacity: 0.4, margin: '0 5px' }}>/</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className="controls-right">
            <button className="control-btn" onClick={handleToggleFullscreen} title="Fullscreen (F)">
              <Maximize size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
