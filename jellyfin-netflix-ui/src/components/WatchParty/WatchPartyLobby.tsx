import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Tv, Film, Sparkles, Users, X, ArrowRight, Play, Search, Check, Loader2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useWatchPartyStore } from '../../store/useWatchPartyStore';
import { useAuthStore } from '../../store/useAuthStore';
import type { WatchPartyMedia } from '../../types/watchParty';
import { getAllServerMedia, getEpisodes, getImageUrl } from '../../services/jellyfinApi';
import { SAMPLE_FALLBACK_STREAMS } from '../../services/watchPartyService';
import './WatchParty.css';

export default function WatchPartyLobby() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeRooms = useWatchPartyStore(state => state.activeRooms);
  const createRoom = useWatchPartyStore(state => state.createRoom);
  const joinRoom = useWatchPartyStore(state => state.joinRoom);
  const currentUser = useWatchPartyStore(state => state.currentUser);

  const { serverUrl, userId, token } = useAuthStore();

  const joinParam = searchParams.get('join');
  const [inputCode, setInputCode] = useState(() => joinParam?.trim().toUpperCase() || '');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (joinParam) {
      const code = joinParam.trim().toUpperCase();
      toast(`Party code [${code}] detected! Click Join to enter.`, { icon: '🍿', id: 'party-code-detect' });
    }
  }, [joinParam]);

  // Create Room form state
  const [roomName, setRoomName] = useState('');
  const [hostOnlyControl, setHostOnlyControl] = useState(false);

  // Server media selection state
  const [serverMediaList, setServerMediaList] = useState<WatchPartyMedia[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<WatchPartyMedia | null>(null);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'movie' | 'series'>('all');

  // TV Series episode picker state
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string>('');
  const [isLoadingEpisodes, setIsLoadingEpisodes] = useState(false);

  // Fallback sample media choices (only when server is completely disconnected)
  const fallbackMediaChoices: WatchPartyMedia[] = [
    {
      id: 'p1',
      title: 'Interstellar',
      type: 'movie',
      year: 2014,
      backdrop: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=1920&fit=crop',
      poster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=400&h=600&fit=crop',
      streamUrl: SAMPLE_FALLBACK_STREAMS[0].url
    },
    {
      id: 'p2',
      title: 'Stranger Things',
      type: 'series',
      year: 2016,
      backdrop: 'https://images.unsplash.com/photo-1605806616949-1e87b487cb2a?q=80&w=1920',
      poster: 'https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?q=80&w=400&h=600&fit=crop',
      streamUrl: SAMPLE_FALLBACK_STREAMS[1].url
    },
    {
      id: 'p5',
      title: 'Blade Runner 2049',
      type: 'movie',
      year: 2017,
      backdrop: 'https://images.unsplash.com/photo-1509281373149-e957c6296406?q=80&w=1920&fit=crop',
      poster: 'https://images.unsplash.com/photo-1509281373149-e957c6296406?q=80&w=400&h=600&fit=crop',
      streamUrl: SAMPLE_FALLBACK_STREAMS[2].url
    }
  ];

  // Debounce search input to avoid excess API calls
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 250);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch real media from Jellyfin server
  useEffect(() => {
    if (!showCreateModal) return;

    if (!serverUrl || !userId || !token) {
      setServerMediaList(fallbackMediaChoices);
      setSelectedMedia(fallbackMediaChoices[0]);
      return;
    }

    let isMounted = true;
    setIsLoadingMedia(true);

    getAllServerMedia(serverUrl, userId, token, {
      searchTerm: debouncedSearch.trim() || undefined,
      itemType: typeFilter === 'movie' ? 'Movie' : typeFilter === 'series' ? 'Series' : 'All',
      limit: 200
    })
      .then(data => {
        if (!isMounted) return;
        const rawItems = data?.Items || [];
        if (rawItems.length === 0) {
          if (!debouncedSearch.trim() && typeFilter === 'all') {
            // Server library appears empty, fall back to sample
            setServerMediaList(fallbackMediaChoices);
            setSelectedMedia(fallbackMediaChoices[0]);
          } else {
            setServerMediaList([]);
            setSelectedMedia(null);
          }
        } else {
          const formatted: WatchPartyMedia[] = rawItems.map((item: any) => ({
            id: item.Id,
            title: item.Name,
            type: item.Type === 'Series' ? 'series' : 'movie',
            year: item.ProductionYear,
            overview: item.Overview,
            poster: getImageUrl(serverUrl, item.Id, 'Primary', 400, undefined, token),
            backdrop: getImageUrl(serverUrl, item.Id, 'Backdrop', 800, undefined, token),
            streamUrl: `${serverUrl}/Videos/${item.Id}/stream.mp4?static=true&api_key=${token}`,
            duration: item.RunTimeTicks ? Math.floor(item.RunTimeTicks / 10000000) : undefined,
          }));

          setServerMediaList(formatted);
          setSelectedMedia(prev => {
            if (prev && formatted.some(f => f.id === prev.id)) {
              return prev;
            }
            return formatted[0] || null;
          });
        }
      })
      .catch(err => {
        if (!isMounted) return;
        console.error('Failed to load Jellyfin library for watch party:', err);
        setServerMediaList(fallbackMediaChoices);
        setSelectedMedia(fallbackMediaChoices[0]);
      })
      .finally(() => {
        if (isMounted) setIsLoadingMedia(false);
      });

    return () => {
      isMounted = false;
    };
  }, [showCreateModal, serverUrl, userId, token, debouncedSearch, typeFilter]);

  // Load episodes when a TV Series is selected
  useEffect(() => {
    if (!selectedMedia || selectedMedia.type !== 'series' || !serverUrl || !userId || !token) {
      setEpisodes([]);
      setSelectedEpisodeId('');
      return;
    }

    if (selectedMedia.id.startsWith('p')) {
      // Mock series
      setEpisodes([]);
      setSelectedEpisodeId('');
      return;
    }

    let isMounted = true;
    setIsLoadingEpisodes(true);

    getEpisodes(serverUrl, userId, token, selectedMedia.id)
      .then(data => {
        if (!isMounted) return;
        const eps = data?.Items || [];
        setEpisodes(eps);
        if (eps.length > 0) {
          setSelectedEpisodeId(eps[0].Id || '');
        }
      })
      .catch(err => {
        if (!isMounted) return;
        console.error('Failed to fetch series episodes:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingEpisodes(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedMedia?.id, selectedMedia?.type, serverUrl, userId, token]);

  const handleJoinByCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanCode = inputCode.trim().toUpperCase();
    if (!cleanCode) {
      toast.error('Please enter a 6-character room code.');
      return;
    }

    const success = await joinRoom(cleanCode);
    if (success) {
      const room = useWatchPartyStore.getState().currentRoom;
      if (room) {
        navigate(`/party/${room.id}`);
      }
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMedia) {
      toast.error('Please select a movie or show to stream.');
      return;
    }

    let finalMedia: WatchPartyMedia = { ...selectedMedia };
    let episodeSummary = '';

    if (selectedMedia.type === 'series' && episodes.length > 0) {
      const chosenEp = episodes.find(ep => ep.Id === selectedEpisodeId) || episodes[0];
      if (chosenEp) {
        const sNum = chosenEp.ParentIndexNumber || 1;
        const eNum = chosenEp.IndexNumber || 1;
        episodeSummary = `S${sNum}:E${eNum} ${chosenEp.Name || ''}`;
        finalMedia = {
          ...selectedMedia,
          episodeId: chosenEp.Id,
          episodeTitle: episodeSummary.trim(),
          seasonNumber: sNum,
          episodeNumber: eNum,
          streamUrl: (serverUrl && token)
            ? `${serverUrl}/Videos/${chosenEp.Id}/stream.mp4?static=true&api_key=${token}`
            : selectedMedia.streamUrl
        };
      }
    } else if (serverUrl && token && !selectedMedia.id.startsWith('p')) {
      finalMedia = {
        ...selectedMedia,
        streamUrl: `${serverUrl}/Videos/${selectedMedia.id}/stream.mp4?static=true&api_key=${token}`
      };
    }

    const defaultTitle = episodeSummary
      ? `${currentUser.name}'s Party: ${selectedMedia.title} (${episodeSummary})`
      : `${currentUser.name}'s Party: ${selectedMedia.title}`;

    const room = await createRoom(
      finalMedia,
      roomName.trim() || defaultTitle,
      { hostOnlyControl }
    );
    setShowCreateModal(false);
    navigate(`/party/${room.id}`);
  };

  const handleJoinExistingRoom = async (roomId: string) => {
    const success = await joinRoom(roomId);
    if (success) {
      navigate(`/party/${roomId}`);
    }
  };

  return (
    <div className="watchparty-lobby-container">
      {/* Hero Section */}
      <section className="lobby-hero">
        <div className="lobby-badge">
          <span className="pulse-dot" />
          <span className="broadcast-signal-tag">Watch Party</span>
        </div>
        <h1 className="lobby-title">Watch together, <span>in sync.</span></h1>
        <p className="lobby-subtitle">
          Stream any movie or TV show from your Jellyfin server synchronously with friends, with real-time playback, group chat, and voice.
        </p>

        <div className="lobby-actions">
          <button className="btn-primary-party" onClick={() => setShowCreateModal(true)}>
            <Sparkles size={16} />
            <span>Start a Party</span>
          </button>

          <form className="join-code-box" onSubmit={handleJoinByCode}>
            <input
              type="text"
              placeholder="Enter room code"
              maxLength={8}
              className="join-code-input"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
            />
            <button type="submit" className="btn-join-code">
              Join
            </button>
          </form>
        </div>
      </section>

      {/* Active Live Rooms */}
      <section>
        <div className="lobby-section-title">
          <Tv size={18} color="var(--wp-accent)" />
          <span>Active Rooms</span>
          <span className="lobby-live-counter">{activeRooms.length} online</span>
        </div>

        {activeRooms.length > 0 ? (
          <div className="rooms-grid">
            {activeRooms.map((room) => (
              <div key={room.id} className="room-card">
                <div
                  className="room-card-thumbnail"
                  style={{ backgroundImage: `url(${room.media.backdrop || room.media.poster || 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=800'})` }}
                >
                  <div className="room-card-overlay" />
                  <div className="room-badge-status">
                    <span className="pulse-dot" />
                    <span>{room.isPlaying ? 'Playing' : 'Paused'}</span>
                  </div>
                  <div className="room-code-tag">{room.code}</div>
                </div>

                <div className="room-card-body">
                  <div>
                    <h3 className="room-card-title">{room.name}</h3>
                    <div className="room-card-media">
                      <span>{room.media.title} {room.media.year ? `(${room.media.year})` : ''}</span>
                      {room.media.episodeTitle && <span className="room-card-episode-badge">{room.media.episodeTitle}</span>}
                    </div>
                  </div>

                  <div className="room-card-footer">
                    <div className="room-members-preview">
                      {room.members.slice(0, 4).map(m => (
                        <img
                          key={m.id}
                          src={m.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=100&h=100&fit=crop'}
                          alt={m.name}
                          className="avatar-stack-item"
                          title={m.name}
                        />
                      ))}
                      <span className="room-member-count">
                        {room.members.length} {room.members.length === 1 ? 'viewer' : 'viewers'}
                      </span>
                    </div>

                    <button
                      className="btn-card-join"
                      onClick={() => handleJoinExistingRoom(room.id)}
                    >
                      Join Room
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-rooms-banner">
            <Users size={32} style={{ marginBottom: '12px', opacity: 0.5, color: 'var(--wp-text-secondary)' }} />
            <h3>No active rooms right now</h3>
            <p style={{ marginTop: '6px', maxWidth: '400px', margin: '6px auto 0' }}>
              Start a party with any movie or show on your server, share the code with friends, and enjoy synchronized playback.
            </p>
            <button
              className="btn-primary-party"
              style={{ margin: '20px auto 0' }}
              onClick={() => setShowCreateModal(true)}
            >
              <Play size={14} fill="white" />
              <span>Start a Party</span>
            </button>
          </div>
        )}
      </section>

      {/* Create Party Modal */}
      {showCreateModal && (
        <div className="create-party-modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="create-party-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <div>
                <h2>New Watch Party</h2>
                <p className="modal-header-desc">Choose any title from your Jellyfin server</p>
              </div>
              <button className="modal-close-btn" onClick={() => setShowCreateModal(false)} title="Close">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div className="form-group">
                <label className="form-label">Room Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder={selectedMedia ? `e.g. ${selectedMedia.title} Night` : "e.g. Friday Movie Night"}
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                />
              </div>

              {/* Media Selection Section */}
              <div className="form-group">
                <div className="media-selector-header">
                  <label className="form-label" style={{ marginBottom: 0 }}>Select Movie or Show</label>
                  <div className="media-type-filters">
                    <button
                      type="button"
                      className={`filter-pill ${typeFilter === 'all' ? 'active' : ''}`}
                      onClick={() => setTypeFilter('all')}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      className={`filter-pill ${typeFilter === 'movie' ? 'active' : ''}`}
                      onClick={() => setTypeFilter('movie')}
                    >
                      <Film size={12} />
                      <span>Movies</span>
                    </button>
                    <button
                      type="button"
                      className={`filter-pill ${typeFilter === 'series' ? 'active' : ''}`}
                      onClick={() => setTypeFilter('series')}
                    >
                      <Tv size={12} />
                      <span>Shows</span>
                    </button>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="media-search-container">
                  <Search size={15} className="media-search-icon" />
                  <input
                    type="text"
                    className="media-search-input"
                    placeholder="Search all movies & shows on your server..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      className="search-clear-btn"
                      onClick={() => setSearchQuery('')}
                      title="Clear search"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Media Grid / List */}
                <div className="media-picker-scroll-container">
                  {isLoadingMedia ? (
                    <div className="media-picker-loading">
                      <Loader2 size={24} className="spin-icon" />
                      <span>Loading titles from Jellyfin server...</span>
                    </div>
                  ) : serverMediaList.length > 0 ? (
                    <div className="media-picker-grid">
                      {serverMediaList.map((choice) => {
                        const isSelected = selectedMedia?.id === choice.id;
                        return (
                          <div
                            key={choice.id}
                            className={`media-picker-card ${isSelected ? 'selected' : ''}`}
                            onClick={() => setSelectedMedia(choice)}
                          >
                            <div className="media-card-thumb-wrap">
                              <img
                                src={choice.poster || choice.backdrop}
                                alt={choice.title}
                                className="media-picker-thumb"
                                loading="lazy"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=400&h=600&fit=crop';
                                }}
                              />
                              <span className={`media-kind-pill ${choice.type}`}>
                                {choice.type === 'series' ? 'TV' : 'MOVIE'}
                              </span>
                              {isSelected && (
                                <div className="selected-badge">
                                  <Check size={13} strokeWidth={3} />
                                </div>
                              )}
                            </div>
                            <div className="media-picker-info">
                              <div className="media-picker-title" title={choice.title}>
                                {choice.title}
                              </div>
                              <div className="media-picker-year">
                                {choice.year || ''}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="media-picker-empty">
                      <Film size={28} style={{ opacity: 0.4, marginBottom: 8 }} />
                      <p>No media found on server matching &ldquo;{searchQuery}&rdquo;</p>
                      {searchQuery && (
                        <button
                          type="button"
                          className="btn-clear-search"
                          onClick={() => setSearchQuery('')}
                        >
                          Clear search
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Episode Selector for Series */}
                {selectedMedia?.type === 'series' && episodes.length > 0 && (
                  <div className="episode-selector-panel">
                    <label className="form-sublabel">Select Episode to Stream:</label>
                    {isLoadingEpisodes ? (
                      <div className="episode-loading-hint">Loading episodes...</div>
                    ) : (
                      <select
                        className="form-select"
                        value={selectedEpisodeId}
                        onChange={(e) => setSelectedEpisodeId(e.target.value)}
                      >
                        {episodes.map((ep) => (
                          <option key={ep.Id} value={ep.Id}>
                            S{ep.ParentIndexNumber || 1}:E{ep.IndexNumber || 1} - {ep.Name || `Episode ${ep.IndexNumber}`}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                {/* Selected Preview Pill */}
                {selectedMedia && (
                  <div className="selected-media-summary">
                    <span className="summary-label">Selected:</span>
                    <span className="summary-title">{selectedMedia.title}</span>
                    {selectedMedia.type === 'series' && episodes.length > 0 && (
                      <span className="summary-episode">
                        ({episodes.find(e => e.Id === selectedEpisodeId)?.Name || `S1:E1`})
                      </span>
                    )}
                    <span className="summary-server-tag">
                      {selectedMedia.id.startsWith('p') ? 'Sample Media' : 'Server Stream'}
                    </span>
                  </div>
                )}

                {!serverUrl && (
                  <div className="media-warning-note">
                    <AlertCircle size={14} />
                    <span>Log in to your Jellyfin server to access your personal library.</span>
                  </div>
                )}
              </div>

              <div className="permission-toggle-row">
                <div>
                  <div className="permission-text">Host Controls Only</div>
                  <div className="permission-desc">Only you can control playback (play, pause, seek)</div>
                </div>
                <input
                  type="checkbox"
                  checked={hostOnlyControl}
                  onChange={(e) => setHostOnlyControl(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--wp-accent)', cursor: 'pointer' }}
                />
              </div>

              <button
                type="submit"
                className="btn-primary-party"
                style={{ width: '100%', justifyContent: 'center', marginTop: '12px' }}
                disabled={!selectedMedia || isLoadingMedia}
              >
                <span>Create Watch Party</span>
                <ArrowRight size={16} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
