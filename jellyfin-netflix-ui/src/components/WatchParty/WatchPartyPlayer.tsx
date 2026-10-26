import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Lock, RotateCcw, RotateCw, AlertTriangle, RefreshCw, Languages, Subtitles, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Hls from 'hls.js';
import { useWatchPartyStore } from '../../store/useWatchPartyStore';
import { useAuthStore } from '../../store/useAuthStore';
import { getItemDetails } from '../../services/jellyfinApi';

const formatStreamTitle = (stream: any): string => {
  if (stream.DisplayTitle) {
    return stream.DisplayTitle;
  }
  const parts: string[] = [];
  if (stream.Language) {
    parts.push(stream.Language.toUpperCase());
  }
  if (stream.Title) {
    parts.push(stream.Title);
  }
  if (stream.ChannelLayout || stream.Channels) {
    parts.push(stream.ChannelLayout || `${stream.Channels}ch`);
  }
  if (stream.Codec) {
    parts.push(stream.Codec.toUpperCase());
  }
  return parts.join(' - ') || `Track ${stream.Index}`;
};

export default function WatchPartyPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const currentRoom = useWatchPartyStore(state => state.currentRoom);
  const currentUser = useWatchPartyStore(state => state.currentUser);
  const storeIsHost = useWatchPartyStore(state => state.isHost);
  const isHost = storeIsHost || (!!currentRoom && (
    currentRoom.hostId === currentUser?.id ||
    (Boolean(currentRoom.hostName) && currentRoom.hostName === currentUser?.name)
  ));
  const syncStatus = useWatchPartyStore(state => state.syncStatus);
  const currentDrift = useWatchPartyStore(state => state.currentDrift);
  const setDrift = useWatchPartyStore(state => state.setDrift);
  const sendPlay = useWatchPartyStore(state => state.sendPlay);
  const sendPause = useWatchPartyStore(state => state.sendPause);
  const sendSeek = useWatchPartyStore(state => state.sendSeek);
  const sendHeartbeat = useWatchPartyStore(state => state.sendHeartbeat);
  const setBuffering = useWatchPartyStore(state => state.setBuffering);

  const authServerUrl = useAuthStore(state => state.serverUrl);
  const authToken = useAuthStore(state => state.token);
  const userId = useAuthStore(state => state.userId);

  const [isPlayingLocal, setIsPlayingLocal] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.9);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const controlsTimeoutRef = useRef<any>(null);
  const currentRoomRef = useRef(currentRoom);

  // Audio & Subtitle Streams State
  const [audioStreams, setAudioStreams] = useState<any[]>([]);
  const [subtitleStreams, setSubtitleStreams] = useState<any[]>([]);
  const [selectedAudioIndex, setSelectedAudioIndex] = useState<number | null>(null);
  const [selectedSubtitleIndex, setSelectedSubtitleIndex] = useState<number | null>(-1);
  const [showTrackMenu, setShowTrackMenu] = useState(false);
  const restoreTimeRef = useRef<{ time: number; isPlaying: boolean } | null>(null);
  const trackMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    currentRoomRef.current = currentRoom;
  }, [currentRoom]);

  const playableId = currentRoom?.media.episodeId || currentRoom?.media.id;
  const isServerMedia = playableId && !playableId.startsWith('p');

  // Load available Audio & Subtitle streams from Jellyfin
  useEffect(() => {
    if (!authServerUrl || !authToken || !playableId || !isServerMedia) {
      setAudioStreams([]);
      setSubtitleStreams([]);
      return;
    }

    let isMounted = true;
    getItemDetails(authServerUrl, userId || '', authToken, playableId)
      .then((item: any) => {
        if (!isMounted || !item?.MediaStreams) return;

        const audios = item.MediaStreams.filter((s: any) => s.Type === 'Audio');
        const subs = item.MediaStreams.filter((s: any) => s.Type === 'Subtitle');

        setAudioStreams(audios);
        setSubtitleStreams(subs);

        // Pre-select default audio track if none explicitly chosen
        if (selectedAudioIndex === null && audios.length > 0) {
          const def = audios.find((a: any) => a.IsDefault) || audios[0];
          setSelectedAudioIndex(def.Index);
        }
      })
      .catch((err: any) => {
        console.warn('[WatchParty] Could not retrieve media stream tracks:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [authServerUrl, authToken, playableId, isServerMedia, userId]);

  // Compute playable stream URL: transcode via Jellyfin master.m3u8 with active AudioStreamIndex
  const streamUrl = (() => {
    if (authServerUrl && authToken && isServerMedia) {
      const sessionId = currentRoom?.id ? `tokoshan_${currentRoom.id.replace(/[^a-zA-Z0-9]/g, '')}` : 'tokoshan_player';
      const audioParam = selectedAudioIndex !== null ? `&AudioStreamIndex=${selectedAudioIndex}` : '';
      return `${authServerUrl}/Videos/${playableId}/master.m3u8?MediaSourceId=${playableId}&DeviceId=tokoshan-web&PlaySessionId=${sessionId}&VideoCodec=h264&AudioCodec=aac,mp3&VideoBitrate=12000000&AudioBitrate=320000&TranscodingMaxAudioChannels=2&SegmentContainer=ts&MinSegments=1&BreakOnNonKeyFrames=True${audioParam}&api_key=${authToken}`;
    }
    return currentRoom?.media.streamUrl || '';
  })();

  // Subtitle VTT URL for active selection
  const activeSubtitleUrl = (() => {
    if (selectedSubtitleIndex === null || selectedSubtitleIndex === -1 || !authServerUrl || !authToken || !playableId) {
      return null;
    }
    return `${authServerUrl}/Videos/${playableId}/${playableId}/Subtitles/${selectedSubtitleIndex}/Stream.vtt?api_key=${authToken}`;
  })();

  // Synchronize text track modes when subtitle selection changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (selectedSubtitleIndex === -1 || !activeSubtitleUrl) {
      for (let i = 0; i < video.textTracks.length; i++) {
        video.textTracks[i].mode = 'disabled';
      }
      return;
    }

    const timer = setTimeout(() => {
      for (let i = 0; i < video.textTracks.length; i++) {
        video.textTracks[i].mode = 'showing';
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [selectedSubtitleIndex, activeSubtitleUrl]);

  // Click outside listener for track selection popover
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (trackMenuRef.current && !trackMenuRef.current.contains(e.target as Node)) {
        setShowTrackMenu(false);
      }
    };

    if (showTrackMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTrackMenu]);

  const handleSelectAudio = (index: number) => {
    if (index === selectedAudioIndex) return;

    const video = videoRef.current;
    const currentPos = video?.currentTime || 0;
    const wasPlaying = video ? !video.paused : false;

    // Save position before reloading source with new audio stream index
    restoreTimeRef.current = { time: currentPos, isPlaying: wasPlaying };
    setSelectedAudioIndex(index);

    const audioObj = audioStreams.find(a => a.Index === index);
    toast.success(`Audio: ${formatStreamTitle(audioObj || { Index: index })}`, { icon: '🔊' });
  };

  const handleSelectSubtitle = (index: number) => {
    setSelectedSubtitleIndex(index);
    if (index === -1) {
      toast('Subtitles turned off', { icon: '💬' });
    } else {
      const sub = subtitleStreams.find(s => s.Index === index);
      toast.success(`Subtitles: ${formatStreamTitle(sub || { Index: index })}`, { icon: '💬' });
    }
  };

  const isHostLocked = !!currentRoom?.permissions.hostOnlyControl && !isHost;

  const handleVideoError = () => {
    console.error('[WatchParty] Playback failed for stream:', streamUrl);
    setPlaybackError('Could not stream this title from the Jellyfin server. Please verify transcode settings or video permissions.');
  };

  const handleRetryPlayback = () => {
    setPlaybackError(null);
    const video = videoRef.current;
    if (hlsRef.current && streamUrl) {
      hlsRef.current.loadSource(streamUrl);
      if (video) {
        hlsRef.current.attachMedia(video);
      }
    } else if (video && streamUrl) {
      video.src = streamUrl;
      video.load();
    }
  };

  // Initialize HLS / Video source
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl) return;

    setPlaybackError(null);

    if (streamUrl.includes('.m3u8')) {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 90,
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
          maxBufferHole: 0.5,
          highBufferWatchdogPeriod: 2,
          nudgeOffset: 0.1,
          nudgeMaxRetry: 5,
        });
        hlsRef.current = hls;

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (restoreTimeRef.current && video) {
            const { time, isPlaying } = restoreTimeRef.current;
            restoreTimeRef.current = null;
            video.currentTime = time;
            if (isPlaying) {
              video.play().catch(() => {});
            }
          }
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            console.error('[WatchParty HLS Fatal Error]', data.type, data.details);
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError();
                break;
              default:
                hls.destroy();
                setPlaybackError(`Playback failed: ${data.details}`);
                break;
            }
          } else {
            console.warn('[WatchParty HLS Warning]', data.details);
          }
        });

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
      const elapsedSinceUpdate = currentRoom.updatedAt ? Math.max(0, (serverNow - currentRoom.updatedAt) / 1000) : 0;
      const expectedPos = currentRoom.isPlaying 
        ? currentRoom.currentTime + elapsedSinceUpdate
        : currentRoom.currentTime;

      // 1. Play / Pause alignment
      if (currentRoom.isPlaying && video.paused) {
        video.play().catch(() => {
          // Autoplay policy might require explicit user interaction
        });
      } else if (!currentRoom.isPlaying && !video.paused) {
        video.pause();
      }

      // 2. Drift correction for Guests
      if (!isHost) {
        // Do not correct drift if video is buffering or actively seeking
        if (video.seeking || video.readyState < 2) {
          return;
        }

        const drift = (video.currentTime - expectedPos) * 1000; // in ms
        setDrift(drift);

        const absDrift = Math.abs(drift);
        if (absDrift > 2500) {
          // Hard seek only for major drift (> 2.5s)
          video.currentTime = expectedPos;
          video.playbackRate = 1.0;
        } else if (absDrift > 400) {
          // Smooth micro playback rate adjustment without audio artifact
          video.playbackRate = drift > 0 ? 0.95 : 1.05;
        } else {
          // In sync!
          video.playbackRate = 1.0;
        }
      } else {
        video.playbackRate = 1.0;
      }
    };

    syncPlayback();
  }, [currentRoom?.isPlaying, currentRoom?.currentTime, currentRoom?.updatedAt, isHost, setDrift]);

  // Host Heartbeat Broadcast Loop (every 3 seconds)
  useEffect(() => {
    if (!isHost) return;

    const interval = setInterval(() => {
      const video = videoRef.current;
      const room = currentRoomRef.current;
      if (video && !video.paused && !video.seeking && room) {
        sendHeartbeat(video.currentTime);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isHost, sendHeartbeat]);

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
      video.play().catch(console.error);
      sendPlay(video.currentTime);
    } else {
      video.pause();
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
        crossOrigin="anonymous"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={() => setIsPlayingLocal(true)}
        onPause={() => setIsPlayingLocal(false)}
        onWaiting={() => setBuffering(true)}
        onPlaying={() => setBuffering(false)}
        onError={handleVideoError}
        onClick={handlePlayPause}
      >
        {activeSubtitleUrl && selectedSubtitleIndex !== -1 && (
          <track
            key={`sub-${selectedSubtitleIndex}`}
            kind="subtitles"
            label="Subtitles"
            srcLang="en"
            src={activeSubtitleUrl}
            default
          />
        )}
      </video>

      {/* Playback Error Overlay */}
      {playbackError && (
        <div className="player-error-overlay">
          <AlertTriangle size={36} color="#ef4444" style={{ marginBottom: 12 }} />
          <p className="player-error-text">{playbackError}</p>
          <button type="button" className="btn-retry-stream" onClick={handleRetryPlayback}>
            <RefreshCw size={14} />
            <span>Retry Playback</span>
          </button>
        </div>
      )}

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
            {/* Audio & Subtitles Selector */}
            {(audioStreams.length > 0 || subtitleStreams.length > 0) && (
              <div className="track-selector-wrapper" ref={trackMenuRef}>
                <button
                  type="button"
                  className={`control-btn ${showTrackMenu ? 'active' : ''}`}
                  onClick={() => setShowTrackMenu(prev => !prev)}
                  title="Audio & Subtitles"
                >
                  <Languages size={18} />
                </button>

                {showTrackMenu && (
                  <div className="track-selector-popover">
                    <div className="track-popover-header">
                      <h4>Audio & Subtitles</h4>
                      <button
                        type="button"
                        className="track-popover-close"
                        onClick={() => setShowTrackMenu(false)}
                        title="Close"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    <div className="track-columns-container">
                      {/* Audio Column */}
                      <div className="track-column">
                        <div className="track-column-title">
                          <Volume2 size={13} />
                          <span>Audio</span>
                        </div>
                        <div className="track-list">
                          {audioStreams.length === 0 ? (
                            <div className="track-empty">Default Audio</div>
                          ) : (
                            audioStreams.map((audio) => {
                              const isSelected = selectedAudioIndex === audio.Index;
                              return (
                                <button
                                  type="button"
                                  key={`audio-${audio.Index}`}
                                  className={`track-item-btn ${isSelected ? 'selected' : ''}`}
                                  onClick={() => handleSelectAudio(audio.Index)}
                                >
                                  <span className="track-check">{isSelected ? <Check size={13} /> : null}</span>
                                  <span className="track-label" title={formatStreamTitle(audio)}>{formatStreamTitle(audio)}</span>
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>

                      {/* Subtitles Column */}
                      <div className="track-column">
                        <div className="track-column-title">
                          <Subtitles size={13} />
                          <span>Subtitles</span>
                        </div>
                        <div className="track-list">
                          {/* Off Option */}
                          <button
                            type="button"
                            className={`track-item-btn ${selectedSubtitleIndex === -1 ? 'selected' : ''}`}
                            onClick={() => handleSelectSubtitle(-1)}
                          >
                            <span className="track-check">{selectedSubtitleIndex === -1 ? <Check size={13} /> : null}</span>
                            <span className="track-label">Off</span>
                          </button>

                          {subtitleStreams.map((sub) => {
                            const isSelected = selectedSubtitleIndex === sub.Index;
                            return (
                              <button
                                type="button"
                                key={`sub-${sub.Index}`}
                                className={`track-item-btn ${isSelected ? 'selected' : ''}`}
                                onClick={() => handleSelectSubtitle(sub.Index)}
                              >
                                <span className="track-check">{isSelected ? <Check size={13} /> : null}</span>
                                <span className="track-label" title={formatStreamTitle(sub)}>{formatStreamTitle(sub)}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <button className="control-btn" onClick={handleToggleFullscreen} title="Fullscreen (F)">
              <Maximize size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
