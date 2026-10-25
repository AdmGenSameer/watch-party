import { useState, useRef, useEffect } from 'react';
import { Send, X, Smile } from 'lucide-react';
import { useWatchPartyStore } from '../../store/useWatchPartyStore';

export default function ChatPanel() {
  const [inputText, setInputText]       = useState('');
  const [showEmoji, setShowEmoji]       = useState(false);
  const messages    = useWatchPartyStore(state => state.messages);
  const currentUser = useWatchPartyStore(state => state.currentUser);
  const currentRoom = useWatchPartyStore(state => state.currentRoom);
  const sendMessage = useWatchPartyStore(state => state.sendChatMessage);
  const toggleChat  = useWatchPartyStore(state => state.toggleChat);
  const isHost      = useWatchPartyStore(state => state.isHost);

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

  const canChat   = currentRoom?.permissions?.membersCanChat !== false || isHost;
  const quickEmoji = ['😂', '🔥', '❤️', '👏', '😮', '🎉', '🍿', '💀'];

  return (
    <div className="chat-sidebar">
      {/* Header */}
      <div className="chat-header">
        <span className="chat-header-title">Chat</span>
        <button className="control-btn" onClick={() => toggleChat(false)} title="Close">
          <X size={15} />
        </button>
      </div>

      {/* Messages */}
      <div className="chat-messages-container">
        {messages.map((msg) => {
          if (msg.type === 'system') {
            return (
              <div key={msg.id} className="system-message-row">
                <span className="system-message-pill">{msg.content}</span>
              </div>
            );
          }

          const isMe       = msg.userId === currentUser.id;
          const isMsgHost  = msg.userId === currentRoom?.hostId;
          const timeStr    = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

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
        })}
        <div ref={endRef} />
      </div>

      {/* Emoji Picker Strip */}
      {showEmoji && (
        <div className="emoji-quick-strip">
          {quickEmoji.map(e => (
            <button
              key={e}
              className="emoji-quick-btn"
              onClick={() => setInputText(prev => prev + e)}
            >
              {e}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
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
          <button type="submit" className="btn-send-message" disabled={!inputText.trim()}>
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
