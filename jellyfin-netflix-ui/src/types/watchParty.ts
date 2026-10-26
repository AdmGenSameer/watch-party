export interface WatchPartyMedia {
  id: string;
  title: string;
  type: 'movie' | 'series';
  poster?: string;
  backdrop?: string;
  streamUrl?: string;
  duration?: number;
  overview?: string;
  year?: number;
  episodeId?: string;
  episodeTitle?: string;
  seasonNumber?: number;
  episodeNumber?: number;
}

export interface RoomPermissions {
  hostOnlyControl: boolean;
  membersCanChat: boolean;
  membersCanReact: boolean;
}

export interface WatchPartyMember {
  id: string;
  name: string;
  avatar: string;
  isHost: boolean;
  ping: number;        // round-trip latency in ms
  drift: number;       // clock/playback offset in ms
  isBuffering: boolean;
  isMicMuted?: boolean;
  isSpeaking?: boolean;
  isDeafened?: boolean;
  peerId?: string;
  joinedAt: number;
}

export interface WatchPartyRoom {
  id: string;
  name: string;
  code: string;        // 6-character shareable room code
  hostId: string;
  hostName: string;
  media: WatchPartyMedia;
  isPlaying: boolean;
  currentTime: number; // in seconds
  playbackRate: number;
  updatedAt: number;   // epoch ms when state was updated
  permissions: RoomPermissions;
  members: WatchPartyMember[];
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  avatar: string;
  content: string;
  type: 'text' | 'system' | 'reaction';
  timestamp: number;
}

export interface ReactionEvent {
  id: string;
  emoji: string;
  userId: string;
  userName: string;
  xOffset: number;     // percentage 0 - 100 for horizontal float position
  scale: number;
  timestamp: number;
}

export interface VoiceStateInfo {
  isMuted: boolean;
  isSpeaking: boolean;
  isDeafened: boolean;
}

export type SyncActionType = 
  | 'PLAY'
  | 'PAUSE'
  | 'SEEK'
  | 'HEARTBEAT'
  | 'JOIN'
  | 'LEAVE'
  | 'CHAT'
  | 'REACTION'
  | 'PERMISSIONS'
  | 'BUFFER'
  | 'REQUEST_SYNC'
  | 'ROOM_UPDATE'
  | 'VOICE_STATE'
  | 'PEER_ANNOUNCE';

export interface SyncPayload {
  roomId: string;
  roomCode?: string;
  action: SyncActionType;
  senderId: string;
  senderName: string;
  currentTime?: number;
  isPlaying?: boolean;
  playbackRate?: number;
  timestamp: number;
  message?: ChatMessage;
  reaction?: ReactionEvent;
  permissions?: RoomPermissions;
  isBuffering?: boolean;
  room?: WatchPartyRoom;
  voiceState?: VoiceStateInfo;
  peerId?: string;
}
