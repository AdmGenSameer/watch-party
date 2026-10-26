import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, Shield, ShieldAlert, MessageSquare, Crown, Mic, MicOff, Headphones, VolumeX, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useWatchPartyStore } from '../../store/useWatchPartyStore';
import { watchPartyService } from '../../services/watchPartyService';
import WatchPartyPlayer from './WatchPartyPlayer';
import ReactionOverlay from './ReactionOverlay';
import ChatPanel from './ChatPanel';
import './WatchParty.css';

export default function WatchPartyTheater() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  const currentRoom     = useWatchPartyStore(state => state.currentRoom);
  const currentUser     = useWatchPartyStore(state => state.currentUser);
  const isHost          = useWatchPartyStore(state => state.isHost);
  const isChatOpen      = useWatchPartyStore(state => state.isChatOpen);
  const unreadCount     = useWatchPartyStore(state => state.unreadCount);
  const toggleChat      = useWatchPartyStore(state => state.toggleChat);
  const joinRoom        = useWatchPartyStore(state => state.joinRoom);
  const leaveRoom       = useWatchPartyStore(state => state.leaveRoom);
  const deleteRoom      = useWatchPartyStore(state => state.deleteRoom);
  const updatePermissions = useWatchPartyStore(state => state.updatePermissions);

  // Voice
  const isVoiceConnected = useWatchPartyStore(state => state.isVoiceConnected);
  const isMicMuted       = useWatchPartyStore(state => state.isMicMuted);
  const isDeafened       = useWatchPartyStore(state => state.isDeafened);
  const isSpeaking       = useWatchPartyStore(state => state.isSpeaking);
  const speakingMembers  = useWatchPartyStore(state => state.speakingMembers);
  const mutedMembers     = useWatchPartyStore(state => state.mutedMembers);
  const toggleMic        = useWatchPartyStore(state => state.toggleMic);
  const toggleDeafen     = useWatchPartyStore(state => state.toggleDeafen);

  useEffect(() => {
    if (roomId && (!currentRoom || currentRoom.id !== roomId)) {
      joinRoom(roomId).then(success => {
        if (!success) navigate('/party');
      });
    }
  }, [roomId, currentRoom, joinRoom, navigate]);

  useEffect(() => {
    if (currentRoom) {
      watchPartyService.setRoom(currentRoom.id, currentRoom.code);
    }
  }, [currentRoom?.id, currentRoom?.code]);

  if (!currentRoom) {
    return (
      <div className="theater-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--wp-text-2)', fontSize: '0.9rem' }}>Connecting to party...</p>
        <button className="btn-back-lobby" style={{ marginTop: '16px' }} onClick={() => navigate('/party')}>
          Back to Lobby
        </button>
      </div>
    );
  }

  const handleCopyCode = () => {
    const inviteUrl = `${window.location.origin}${window.location.pathname}#/party?join=${currentRoom.code}`;
    navigator.clipboard.writeText(inviteUrl).then(() => {
      toast.success('Invite link copied!', { icon: '🔗' });
    }).catch(() => {
      toast.success(`Room code: ${currentRoom.code}`, { icon: '🍿' });
    });
  };

  const handleLeave = () => {
    leaveRoom();
    navigate('/party');
  };

  const handleEndParty = async () => {
    if (!currentRoom) return;
    if (window.confirm(`Are you sure you want to end and delete "${currentRoom.name}"? All participants will be disconnected.`)) {
      await deleteRoom(currentRoom.id);
      navigate('/party');
    }
  };

  const toggleHostLock = () => {
    if (!isHost) return;
    updatePermissions({
      ...currentRoom.permissions,
      hostOnlyControl: !currentRoom.permissions.hostOnlyControl,
    });
  };

  return (
    <div className="theater-container">
      {/* ── Top Bar ── */}
      <header className="theater-top-bar">

        {/* Left: Exit + End Party (host) + divider + room info */}
        <div className="theater-info-block">
          <button className="btn-back-lobby" onClick={handleLeave}>
            <ArrowLeft size={13} />
            <span>Exit</span>
          </button>

          {isHost && (
            <button className="btn-end-party" onClick={handleEndParty} title="End and delete this Watch Party">
              <Trash2 size={13} />
              <span className="btn-end-party-text">End Party</span>
            </button>
          )}

          <div className="theater-top-divider" />

          <div className="theater-titles">
            <div className="theater-room-name">{currentRoom.name}</div>
            <div className="theater-movie-title">
              {currentRoom.media.title}
              {currentRoom.media.episodeTitle ? ` · ${currentRoom.media.episodeTitle}` : ''}
              {currentRoom.media.year ? ` · ${currentRoom.media.year}` : ''}
            </div>
          </div>
        </div>

        {/* Centre: member avatars */}
        <div className="theater-members-strip">
          {currentRoom.members.map((member) => {
            const isMe             = member.id === currentUser.id;
            const isMemberSpeaking = isMe ? isSpeaking : speakingMembers.includes(member.id);
            const isMemberMuted    = isMe ? isMicMuted  : mutedMembers.includes(member.id);

            return (
              <div
                key={member.id}
                className="theater-member-avatar-wrap"
                title={`${member.name}${member.isHost ? ' · Host' : ''}${isMemberSpeaking ? ' · Speaking' : isMemberMuted ? ' · Muted' : ''}`}
              >
                <img
                  src={member.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=100&h=100&fit=crop'}
                  alt={member.name}
                  className={`theater-member-avatar ${isMemberSpeaking ? 'speaking' : member.isBuffering ? 'buffering' : 'synced'}`}
                />
                {member.isHost && (
                  <div className="host-crown-badge">
                    <Crown size={6} fill="black" />
                  </div>
                )}
                {isMemberMuted && (
                  <div className="member-mic-muted-badge">
                    <MicOff size={6} color="#fff" />
                  </div>
                )}
              </div>
            );
          })}
          <span className="theater-watcher-count">
            {currentRoom.members.length} watching
          </span>
        </div>

        {/* Right: actions */}
        <div className="theater-top-actions">
          {/* Voice */}
          <div className="voice-controls-cluster">
            <button
              className={`btn-voice-control ${isMicMuted ? 'muted' : ''}`}
              onClick={() => toggleMic()}
              title={isVoiceConnected ? (isMicMuted ? 'Unmute' : 'Mute') : 'Join Voice'}
            >
              {isMicMuted
                ? <MicOff size={13} color="#ef4444" />
                : <Mic size={13} color={isVoiceConnected ? '#16a34a' : undefined} />}
              <span>{isVoiceConnected ? (isMicMuted ? 'Muted' : 'Voice') : 'Join Voice'}</span>
            </button>

            {isVoiceConnected && (
              <button
                className={`btn-voice-control ${isDeafened ? 'muted' : ''}`}
                onClick={() => toggleDeafen()}
                title={isDeafened ? 'Undeafen' : 'Deafen'}
              >
                {isDeafened
                  ? <VolumeX size={13} color="#ef4444" />
                  : <Headphones size={13} />}
              </button>
            )}
          </div>

          {/* Host lock */}
          {isHost && (
            <button
              className="btn-back-lobby"
              onClick={toggleHostLock}
              title={currentRoom.permissions.hostOnlyControl ? 'Host controls only — click to open' : 'Open controls — click to lock'}
              style={{
                color: currentRoom.permissions.hostOnlyControl ? '#fbbf24' : undefined,
                borderColor: currentRoom.permissions.hostOnlyControl ? 'rgba(217,119,6,0.35)' : undefined,
              }}
            >
              {currentRoom.permissions.hostOnlyControl
                ? <ShieldAlert size={13} color="#fbbf24" />
                : <Shield size={13} />}
              <span>{currentRoom.permissions.hostOnlyControl ? 'Host Only' : 'Open'}</span>
            </button>
          )}

          {/* Copy invite */}
          <button className="btn-copy-code" onClick={handleCopyCode} title="Copy invite link">
            <Copy size={12} />
            <span>{currentRoom.code}</span>
          </button>

          {/* Chat toggle */}
          <button
            className={`btn-toggle-chat ${isChatOpen ? 'active' : ''}`}
            onClick={() => toggleChat()}
            title="Chat"
          >
            <MessageSquare size={14} />
            {unreadCount > 0 && !isChatOpen && (
              <span className="chat-unread-badge">{unreadCount}</span>
            )}
          </button>
        </div>
      </header>

      {/* ── Main Stage ── */}
      <main className="theater-main-stage">
        <div style={{ flex: 1, position: 'relative', display: 'flex', height: '100%', minWidth: 0 }}>
          <WatchPartyPlayer />
          <ReactionOverlay />
        </div>

        {isChatOpen && <ChatPanel />}
      </main>
    </div>
  );
}
