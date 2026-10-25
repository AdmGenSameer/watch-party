import { useWatchPartyStore } from '../../store/useWatchPartyStore';

const QUICK_EMOJIS = ['❤️', '🔥', '😂', '😱', '👏', '🍿', '🚀', '💀'];

export default function ReactionOverlay() {
  const reactions = useWatchPartyStore(state => state.reactions);
  const sendReaction = useWatchPartyStore(state => state.sendReaction);
  const permissions = useWatchPartyStore(state => state.currentRoom?.permissions);
  const isHost = useWatchPartyStore(state => state.isHost);

  const handleQuickReact = (emoji: string) => {
    sendReaction(emoji);
  };

  const canReact = permissions?.membersCanReact !== false || isHost;

  return (
    <>
      {/* Floating Emojis Layer */}
      <div className="reaction-overlay-container">
        {reactions.map((r) => (
          <div
            key={r.id}
            className="floating-emoji-item"
            style={{
              left: `${r.xOffset}%`,
              fontSize: `${2.2 * r.scale}rem`,
            }}
          >
            {r.emoji}
          </div>
        ))}
      </div>

      {/* Quick Reaction Dock */}
      {canReact && (
        <div className="quick-reaction-dock">
          {QUICK_EMOJIS.map(emoji => (
            <button
              key={emoji}
              className="quick-react-btn"
              onClick={() => handleQuickReact(emoji)}
              title={`React ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
