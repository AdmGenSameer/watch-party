import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Tv, Sparkles, Users, X, ArrowRight, Play } from 'lucide-react';
import toast from 'react-hot-toast';
import { useWatchPartyStore } from '../../store/useWatchPartyStore';
import type { WatchPartyMedia } from '../../types/watchParty';
import { SAMPLE_FALLBACK_STREAMS } from '../../services/watchPartyService';
import './WatchParty.css';

export default function WatchPartyLobby() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeRooms = useWatchPartyStore(state => state.activeRooms);
  const createRoom = useWatchPartyStore(state => state.createRoom);
  const joinRoom = useWatchPartyStore(state => state.joinRoom);

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
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [hostOnlyControl, setHostOnlyControl] = useState(false);

  // Available media choices for watch party
  const mediaChoices: WatchPartyMedia[] = [
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
    const media = mediaChoices[selectedMediaIndex];
    const room = await createRoom(
      media,
      roomName.trim() || undefined,
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
          Stream movies and TV shows synchronously with friends, with real-time playback, group chat, and reactions.
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
              Start a party, share the code with friends, and enjoy synchronized playback.
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
              <h2>New Watch Party</h2>
              <button className="modal-close-btn" onClick={() => setShowCreateModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div className="form-group">
                <label className="form-label">Room Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Friday Movie Night"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Select Movie or Show</label>
                <div className="media-picker-list">
                  {mediaChoices.map((choice, idx) => (
                    <div
                      key={choice.id}
                      className={`media-picker-item ${selectedMediaIndex === idx ? 'selected' : ''}`}
                      onClick={() => setSelectedMediaIndex(idx)}
                    >
                      <img
                        src={choice.backdrop || choice.poster}
                        alt={choice.title}
                        className="media-picker-thumb"
                      />
                      <div className="media-picker-title">{choice.title}</div>
                    </div>
                  ))}
                </div>
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
              >
                <span>Create Room</span>
                <ArrowRight size={16} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
