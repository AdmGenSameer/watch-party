import { useState, useRef, useEffect } from 'react';
import { Send, X, Smile, Users, Mic, MicOff, Crown, MessageSquare } from 'lucide-react';
import { useWatchPartyStore } from '../../store/useWatchPartyStore';

export default function ChatPanel() {
  const [inputText, setInputText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);

  const messages         = useWatchPartyStore(state => state.messages);
  const currentUser      = useWatchPartyStore(state => state.currentUser);
  const currentRoom      = useWatchPartyStore(state => state.currentRoom);
  const sendMessage      = useWatchPartyStore(state => state.sendChatMessage);
  const toggleChat       = useWatchPartyStore(state => state.toggleChat);
  const isHost           = useWatchPartyStore(state => state.isHost);
  const isSpeaking       = useWatchPartyStore(state => state.isSpeaking);
  const speakingMembers  = useWatchPartyStore(state => state.speakingMembers);
  const isMicMuted       = useWatchPartyStore(state => state.isMicMuted);
  const mutedMembers     = useWatchPartyStore(state => state.mutedMembers);
  const isVoiceConnected = useWatchPartyStore(state => state.isVoiceConnected);
  const connectVoice     = useWatchPartyStore(state => state.connectVoice);
  const toggleMic        = useWatchPartyStore(state => state.toggleMic);

  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;
    sendMessage(inputText);
    setInputText('');
    setShowEmoji(false);
  };

  const canChat    = currentRoom?.permissions?.membersCanChat !== false || isHost;
  const quickEmoji = ['😂', '🔥', '❤️', '👏', '😮', '🎉', '🍿', '💀'];
  const members    = currentRoom?.members || [];

  return (
    <div className="chat-sidebar">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-left">
          <MessageSquare size={15} className="chat-header-icon" />
          <span className="chat-header-title">Watch Party & Chat</span>
        </div>
        <button className="control-btn" onClick={() => toggleChat(false)} title="Close Chat">
          <X size={15} />
        </button>
      </div>

      {/* Upper Half: Joined Participants & Live Voice Activity Stage */}
      <div className="chat-stage-section">
        <div className="chat-stage-header">
          <div className="chat-stage-title">
            <Users size={13} />
            <span>Participants ({members.length})</span>
          </div>

          {isVoiceConnected ? (
            <div className="voice-live-indicator" title="Connected to party voice channel">
              <span className="voice-pulse-dot" />
              <span>Voice Live</span>
            </div>
          ) : (
            <button
              type="button"
              className="chat-join-voice-btn"
              onClick={() => connectVoice()}
              title="Join Party Voice"
            >
              <Mic size={11} />
              <span>Join Voice</span>
            </button>
          )}
        </div>

        <div className="chat-members-grid">
          {members.map((member) => {
            const isMe = member.id === currentUser.id;
            const isMemberSpeaking = isMe ? isSpeaking : (speakingMembers.includes(member.id) || !!member.isSpeaking);
            const isMemberMuted = isMe ? isMicMuted : (mutedMembers.includes(member.id) || !!member.isMicMuted);

            return (
              <div
                key={member.id}
                className={`chat-member-card ${isMemberSpeaking ? 'is-speaking' : ''} ${isMe ? 'is-me' : ''}`}
                title={`${member.name}${member.isHost ? ' (Host)' : ''}${isMemberSpeaking ? ' · Speaking' : isMemberMuted ? ' · Muted' : ''}`}
              >
                <div className="chat-member-avatar-wrapper">
                  <img
                    src={member.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=120&h=120&fit=crop'}
                    alt={member.name}
                    className="chat-member-avatar-img"
                  />
                  {member.isHost && (
                    <div className="chat-member-crown" title="Party Host">
                      <Crown size={8} fill="black" />
                    </div>
                  )}
                  <button
                    type="button"
                    className={`chat-member-mic-badge ${isMemberMuted ? 'muted' : isMemberSpeaking ? 'speaking' : 'ready'}`}
                    onClick={(e) => {
                      if (isMe) {
                        e.stopPropagation();
                        toggleMic();
                      }
                    }}
                    title={isMe ? (isMemberMuted ? 'Click to unmute' : 'Click to mute') : (isMemberMuted ? 'Muted' : 'Microphone on')}
                  >
                    {isMemberMuted ? (
                      <MicOff size={8} />
                    ) : (
                      <Mic size={8} />
                    )}
                  </button>
                </div>

                <div className="chat-member-info">
                  <span className="chat-member-name" title={member.name}>
                    {isMe ? `${member.name} (You)` : member.name}
                  </span>

                  {isMemberSpeaking ? (
                    <div className="chat-speaking-wave">
                      <span className="wave-bar bar-1" />
                      <span className="wave-bar bar-2" />
                      <span className="wave-bar bar-3" />
                      <span className="speaking-text">Speaking</span>
                    </div>
                  ) : isMemberMuted ? (
                    <span className="chat-member-status-text muted">Muted</span>
                  ) : (
                    <span className="chat-member-status-text synced">Listening</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Messages Header Divider */}
      <div className="chat-messages-header-divider">
        <span>Live Messages</span>
      </div>

      {/* Messages Stream */}
      <div className="chat-messages-container">
        {messages.length === 0 ? (
          <div className="chat-empty-state">
            <p>No messages yet. Say hi to the party!</p>
          </div>
        ) : (
          messages.map((msg) => {
            if (msg.type === 'system') {
              return (
                <div key={msg.id} className="system-message-row">
                  <span className="system-message-pill">{msg.content}</span>
                </div>
              );
            }

            const isMe      = msg.userId === currentUser.id;
            const isMsgHost = msg.userId === currentRoom?.hostId;
            const timeStr   = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return (
              <div key={msg.id} className={`user-message-row ${isMe ? 'is-me' : ''}`}>
                {!isMe && (
                  <img
                    src={msg.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=100&h=100&fit=crop'}
                    alt={msg.userName}
                    className="user-message-avatar"
                  />
                )}
                <div className="user-message-content">
                  <div className="user-message-meta">
                    <span className="message-author">{isMe ? 'You' : msg.userName}</span>
                    {isMsgHost && <span className="message-host-tag">HOST</span>}
                    <span className="message-time">{timeStr}</span>
                  </div>
                  <div className="message-bubble">{msg.content}</div>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      {/* Emoji Quick Picker Strip */}
      {showEmoji && (
        <div className="emoji-quick-strip">
          {quickEmoji.map(e => (
            <button
              key={e}
              type="button"
              className="emoji-quick-btn"
              onClick={() => setInputText(prev => prev + e)}
            >
              {e}
            </button>
          ))}
        </div>
      )}

      {/* Chat Input */}
      {canChat ? (
        <form className="chat-input-bar" onSubmit={handleSend}>
          <button
            type="button"
            className="control-btn"
            onClick={() => setShowEmoji(v => !v)}
            title="Emoji"
            style={{ color: showEmoji ? 'var(--wp-text)' : 'var(--wp-text-3)' }}
          >
            <Smile size={16} />
          </button>
          <input
            type="text"
            className="chat-input-field"
            placeholder="Send a message…"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
          />
          <button type="submit" className="btn-send-message" disabled={!inputText.trim()} title="Send (Enter)">
            <Send size={13} />
          </button>
        </form>
      ) : (
        <div style={{ padding: '12px 14px', color: 'var(--wp-text-3)', fontSize: '0.82rem', textAlign: 'center', borderTop: '1px solid var(--wp-line)' }}>
          Chat is disabled by the host.
        </div>
      )}
    </div>
  );
}
