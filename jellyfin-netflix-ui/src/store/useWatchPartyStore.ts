import { create } from 'zustand';
import type { WatchPartyRoom, WatchPartyMember, ChatMessage, ReactionEvent, RoomPermissions, WatchPartyMedia, SyncPayload } from '../types/watchParty';
import { watchPartyService, SAMPLE_FALLBACK_STREAMS } from '../services/watchPartyService';
import { voiceService } from '../services/voiceService';
import toast from 'react-hot-toast';

interface UserInfo {
  id: string;
  name: string;
  avatar: string;
}

interface WatchPartyState {
  currentRoom: WatchPartyRoom | null;
  activeRooms: WatchPartyRoom[];
  currentUser: UserInfo;
  messages: ChatMessage[];
  reactions: ReactionEvent[];
  isHost: boolean;
  currentPing: number;
  currentDrift: number;
  isBuffering: boolean;
  syncStatus: 'synced' | 'syncing' | 'buffering' | 'offline';
  isChatOpen: boolean;
  unreadCount: number;

  // Voice Chat State
  isVoiceConnected: boolean;
  isMicMuted: boolean;
  isDeafened: boolean;
  isSpeaking: boolean;
  speakingMembers: string[];
  mutedMembers: string[];

  // Actions
  initUser: (name?: string, avatar?: string) => void;
  createRoom: (media: WatchPartyMedia, roomName?: string, permissions?: Partial<RoomPermissions>) => Promise<WatchPartyRoom>;
  joinRoom: (roomIdOrCode: string) => Promise<boolean>;
  leaveRoom: () => void;
  sendPlay: (currentTime: number) => void;
  sendPause: (currentTime: number) => void;
  sendSeek: (currentTime: number) => void;
  sendHeartbeat: (currentTime: number) => void;
  sendChatMessage: (content: string) => void;
  sendReaction: (emoji: string) => void;
  updatePermissions: (permissions: RoomPermissions) => void;
  setBuffering: (buffering: boolean) => void;
  toggleChat: (open?: boolean) => void;
  refreshRooms: () => void;
  setDrift: (driftMs: number) => void;

  // Voice Actions
  connectVoice: () => Promise<boolean>;
  disconnectVoice: () => void;
  toggleMic: () => Promise<void>;
  toggleDeafen: () => void;
}

// Generate random user for current session if not logged in
const generateDefaultUser = (): UserInfo => {
  const randomId = 'u_' + Math.random().toString(36).substring(2, 9);
  const avatars = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&h=150&fit=crop',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&h=150&fit=crop',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&h=150&fit=crop',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150&h=150&fit=crop'
  ];
  const names = ['Alex Fox', 'Jordan Blake', 'Taylor Swift', 'Morgan Cole', 'Sam Rivers', 'Casey Sky'];
  const name = names[Math.floor(Math.random() * names.length)];
  const avatar = avatars[Math.floor(Math.random() * avatars.length)];

  return { id: randomId, name, avatar };
};

const generateRoomCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export const useWatchPartyStore = create<WatchPartyState>((set, get) => {
  let unsubscribeSync: (() => void) | null = null;
  const initialUser = generateDefaultUser();

  // Setup broadcast / SignalR listener
  const setupListener = () => {
    if (unsubscribeSync) unsubscribeSync();

    unsubscribeSync = watchPartyService.subscribe((payload: SyncPayload) => {
      const state = get();
      if (!state.currentRoom || payload.roomId !== state.currentRoom.id) {
        // Maybe an active rooms broadcast update
        if (payload.action === 'ROOM_UPDATE') {
          set({ activeRooms: watchPartyService.getStoredRooms() });
        }
        return;
      }

      // Ignore our own broadcasted actions except when needed
      if (payload.senderId === state.currentUser.id && payload.action !== 'REQUEST_SYNC') {
        return;
      }

      const now = Date.now();

      switch (payload.action) {
        case 'PLAY': {
          const room = { ...state.currentRoom, isPlaying: true, currentTime: payload.currentTime ?? state.currentRoom.currentTime, updatedAt: now };
          set({ currentRoom: room, syncStatus: 'synced' });
          watchPartyService.saveRoom(room);
          break;
        }

        case 'PAUSE': {
          const room = { ...state.currentRoom, isPlaying: false, currentTime: payload.currentTime ?? state.currentRoom.currentTime, updatedAt: now };
          set({ currentRoom: room, syncStatus: 'synced' });
          watchPartyService.saveRoom(room);
          break;
        }

        case 'SEEK': {
          const room = { ...state.currentRoom, currentTime: payload.currentTime ?? state.currentRoom.currentTime, updatedAt: now };
          set({ currentRoom: room });
          watchPartyService.saveRoom(room);
          break;
        }

        case 'HEARTBEAT': {
          if (payload.room) {
            set({ currentRoom: payload.room });
            watchPartyService.saveRoom(payload.room);
          } else if (payload.senderId === state.currentRoom.hostId) {
            const hostTime = payload.currentTime ?? state.currentRoom.currentTime;
            const updatedRoom = {
              ...state.currentRoom,
              currentTime: hostTime,
              isPlaying: payload.isPlaying ?? state.currentRoom.isPlaying,
              updatedAt: now
            };
            set({ currentRoom: updatedRoom });
          }
          break;
        }

        case 'JOIN': {
          const existingMember = state.currentRoom.members.find(m => m.id === payload.senderId);
          if (!existingMember) {
            const newMember: WatchPartyMember = {
              id: payload.senderId,
              name: payload.senderName,
              avatar: payload.message?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&h=150&fit=crop',
              isHost: payload.senderId === state.currentRoom.hostId,
              ping: 28,
              drift: 0,
              isBuffering: false,
              joinedAt: now
            };
            const updatedMembers = [...state.currentRoom.members, newMember];
            const updatedRoom = { ...state.currentRoom, members: updatedMembers };
            
            const joinMsg: ChatMessage = {
              id: 'sys_' + Math.random().toString(36).substring(2, 9),
              userId: 'system',
              userName: 'System',
              avatar: '',
              content: `${payload.senderName} joined the party`,
              type: 'system',
              timestamp: now
            };

            set({
              currentRoom: updatedRoom,
              messages: [...state.messages, joinMsg]
            });
            watchPartyService.saveRoom(updatedRoom);
            toast.success(`${payload.senderName} joined the party!`);

            // If we are host, respond with full state sync so new member gets up to date
            if (state.isHost) {
              watchPartyService.broadcast({
                roomId: state.currentRoom.id,
                action: 'HEARTBEAT',
                senderId: state.currentUser.id,
                senderName: state.currentUser.name,
                currentTime: state.currentRoom.currentTime,
                isPlaying: state.currentRoom.isPlaying,
                timestamp: now,
                room: updatedRoom
              });
            }
          }
          break;
        }

        case 'LEAVE': {
          const updatedMembers = state.currentRoom.members.filter(m => m.id !== payload.senderId);
          const leaveMsg: ChatMessage = {
            id: 'sys_' + Math.random().toString(36).substring(2, 9),
            userId: 'system',
            userName: 'System',
            avatar: '',
            content: `${payload.senderName} left the party`,
            type: 'system',
            timestamp: now
          };
          const updatedRoom = { ...state.currentRoom, members: updatedMembers };
          set({
            currentRoom: updatedRoom,
            messages: [...state.messages, leaveMsg]
          });
          watchPartyService.saveRoom(updatedRoom);
          break;
        }

        case 'CHAT': {
          if (payload.message) {
            set(s => ({
              messages: [...s.messages, payload.message!],
              unreadCount: s.isChatOpen ? 0 : s.unreadCount + 1
            }));
          }
          break;
        }

        case 'REACTION': {
          if (payload.reaction) {
            set(s => ({
              reactions: [...s.reactions.slice(-30), payload.reaction!]
            }));
          }
          break;
        }

        case 'PERMISSIONS': {
          if (payload.permissions) {
            const updatedRoom = { ...state.currentRoom, permissions: payload.permissions };
            set({ currentRoom: updatedRoom });
            watchPartyService.saveRoom(updatedRoom);
            toast('Host updated party permissions', { icon: '🛡️' });
          }
          break;
        }

        case 'BUFFER': {
          const members = state.currentRoom.members.map(m => 
            m.id === payload.senderId ? { ...m, isBuffering: !!payload.isBuffering } : m
          );
          set({ currentRoom: { ...state.currentRoom, members } });
          break;
        }

        case 'REQUEST_SYNC': {
          if (state.isHost) {
            watchPartyService.broadcast({
              roomId: state.currentRoom.id,
              action: 'HEARTBEAT',
              senderId: state.currentUser.id,
              senderName: state.currentUser.name,
              currentTime: state.currentRoom.currentTime,
              isPlaying: state.currentRoom.isPlaying,
              timestamp: now
            });
          }
          break;
        }

        case 'VOICE_STATE': {
          if (payload.voiceState && state.currentRoom) {
            const { isSpeaking, isMuted, isDeafened } = payload.voiceState;
            const senderId = payload.senderId;

            set(s => {
              const speakingSet = new Set(s.speakingMembers);
              if (isSpeaking) {
                speakingSet.add(senderId);
              } else {
                speakingSet.delete(senderId);
              }

              const mutedSet = new Set(s.mutedMembers);
              if (isMuted) {
                mutedSet.add(senderId);
              } else {
                mutedSet.delete(senderId);
              }

              const members = s.currentRoom ? s.currentRoom.members.map(m => {
                if (m.id === senderId) {
                  return {
                    ...m,
                    isSpeaking,
                    isMicMuted: isMuted,
                    isDeafened
                  };
                }
                return m;
              }) : [];

              return {
                speakingMembers: Array.from(speakingSet),
                mutedMembers: Array.from(mutedSet),
                currentRoom: s.currentRoom ? { ...s.currentRoom, members } : null
              };
            });
          }
          break;
        }
      }
    });
  };

  setupListener();

  return {
    currentRoom: null,
    activeRooms: watchPartyService.getStoredRooms(),
    currentUser: initialUser,
    messages: [],
    reactions: [],
    isHost: false,
    currentPing: 24,
    currentDrift: 0,
    isBuffering: false,
    syncStatus: 'synced',
    isChatOpen: true,
    unreadCount: 0,

    // Voice Chat Initial State
    isVoiceConnected: false,
    isMicMuted: true,
    isDeafened: false,
    isSpeaking: false,
    speakingMembers: [],
    mutedMembers: [],

    initUser: (name, avatar) => {
      set(s => ({
        currentUser: {
          id: s.currentUser.id,
          name: name || s.currentUser.name,
          avatar: avatar || s.currentUser.avatar
        }
      }));
    },

    createRoom: async (media, roomName, permissions) => {
      const user = get().currentUser;
      const now = Date.now();
      const code = generateRoomCode();

      const newRoom: WatchPartyRoom = {
        id: 'room_' + Math.random().toString(36).substring(2, 9),
        name: roomName || `${user.name}'s Party: ${media.title}`,
        code,
        hostId: user.id,
        hostName: user.name,
        media: {
          ...media,
          streamUrl: media.streamUrl || SAMPLE_FALLBACK_STREAMS[0].url
        },
        isPlaying: false,
        currentTime: 0,
        playbackRate: 1,
        updatedAt: now,
        permissions: {
          hostOnlyControl: false,
          membersCanChat: true,
          membersCanReact: true,
          ...permissions
        },
        members: [
          {
            id: user.id,
            name: user.name,
            avatar: user.avatar,
            isHost: true,
            ping: 12,
            drift: 0,
            isBuffering: false,
            joinedAt: now
          }
        ]
      };

      watchPartyService.saveRoom(newRoom);
      watchPartyService.startHostPeer(newRoom.code);

      // Welcome system message
      const welcomeMsg: ChatMessage = {
        id: 'msg_welcome',
        userId: 'system',
        userName: 'System',
        avatar: '',
        content: `🎉 Room "${newRoom.name}" created! Share code [${newRoom.code}] to invite friends.`,
        type: 'system',
        timestamp: now
      };

      set({
        currentRoom: newRoom,
        activeRooms: watchPartyService.getStoredRooms(),
        isHost: true,
        messages: [welcomeMsg],
        reactions: [],
        syncStatus: 'synced',
        currentDrift: 0
      });

      // Broadcast room update so other tabs can see it in lobby
      watchPartyService.broadcast({
        roomId: newRoom.id,
        action: 'ROOM_UPDATE',
        senderId: user.id,
        senderName: user.name,
        timestamp: now,
        room: newRoom
      });

      return newRoom;
    },

    joinRoom: async (roomIdOrCode: string) => {
      const user = get().currentUser;
      const now = Date.now();
      
      let targetRoom = watchPartyService.findRoomByCode(roomIdOrCode);
      if (!targetRoom) {
        targetRoom = watchPartyService.findRoomById(roomIdOrCode);
      }

      if (!targetRoom) {
        // Synthesize dynamic room for remote WebRTC P2P party join
        const cleanCode = roomIdOrCode.trim().toUpperCase();
        targetRoom = {
          id: 'room_' + cleanCode,
          name: `Watch Party [${cleanCode}]`,
          code: cleanCode,
          hostId: 'remote_host',
          hostName: 'Host',
          media: {
            id: 'remote',
            title: 'Connecting to Host...',
            type: 'movie',
            streamUrl: SAMPLE_FALLBACK_STREAMS[0].url
          },
          isPlaying: false,
          currentTime: 0,
          playbackRate: 1,
          updatedAt: now,
          permissions: {
            hostOnlyControl: false,
            membersCanChat: true,
            membersCanReact: true
          },
          members: []
        };
      }

      const isHost = targetRoom.hostId === user.id;

      const memberExists = targetRoom.members.some(m => m.id === user.id);
      const members = memberExists 
        ? targetRoom.members 
        : [...targetRoom.members, {
            id: user.id,
            name: user.name,
            avatar: user.avatar,
            isHost,
            ping: 32,
            drift: 0,
            isBuffering: false,
            joinedAt: now
          }];

      const updatedRoom: WatchPartyRoom = {
        ...targetRoom,
        members
      };

      watchPartyService.saveRoom(updatedRoom);

      const welcomeMsg: ChatMessage = {
        id: 'msg_welcome_' + now,
        userId: 'system',
        userName: 'System',
        avatar: '',
        content: `Connected to "${updatedRoom.name}". Synchronizing with host...`,
        type: 'system',
        timestamp: now
      };

      set({
        currentRoom: updatedRoom,
        isHost,
        messages: [welcomeMsg],
        reactions: [],
        syncStatus: 'synced'
      });

      // Announce join to peers
      watchPartyService.broadcast({
        roomId: updatedRoom.id,
        action: 'JOIN',
        senderId: user.id,
        senderName: user.name,
        timestamp: now,
        message: {
          id: 'join_avatar',
          userId: user.id,
          userName: user.name,
          avatar: user.avatar,
          content: '',
          type: 'system',
          timestamp: now
        }
      });

      // Request latest sync position
      watchPartyService.broadcast({
        roomId: updatedRoom.id,
        action: 'REQUEST_SYNC',
        senderId: user.id,
        senderName: user.name,
        timestamp: now
      });

      // Connect to Host WebRTC DataChannel if guest
      if (!isHost) {
        watchPartyService.connectToHostPeer(updatedRoom.code);
      }

      toast.success(`Joined ${updatedRoom.name}!`);
      return true;
    },

    leaveRoom: () => {
      const { currentRoom, currentUser } = get();
      if (!currentRoom) return;

      watchPartyService.closePeer();

      watchPartyService.broadcast({
        roomId: currentRoom.id,
        action: 'LEAVE',
        senderId: currentUser.id,
        senderName: currentUser.name,
        timestamp: Date.now()
      });

      voiceService.leave();

      set({
        currentRoom: null,
        isHost: false,
        messages: [],
        reactions: [],
        isVoiceConnected: false,
        isSpeaking: false,
        speakingMembers: [],
        mutedMembers: []
      });

      toast('Left Watch Party', { icon: '👋' });
    },

    sendPlay: (currentTime) => {
      const { currentRoom, currentUser, isHost } = get();
      if (!currentRoom) return;

      if (currentRoom.permissions.hostOnlyControl && !isHost) {
        toast.error('Only the host can control playback in this room.');
        return;
      }

      const now = Date.now();
      const updatedRoom = { ...currentRoom, isPlaying: true, currentTime, updatedAt: now };
      set({ currentRoom: updatedRoom });
      watchPartyService.saveRoom(updatedRoom);

      watchPartyService.broadcast({
        roomId: currentRoom.id,
        action: 'PLAY',
        senderId: currentUser.id,
        senderName: currentUser.name,
        currentTime,
        timestamp: now
      });
    },

    sendPause: (currentTime) => {
      const { currentRoom, currentUser, isHost } = get();
      if (!currentRoom) return;

      if (currentRoom.permissions.hostOnlyControl && !isHost) {
        toast.error('Only the host can control playback in this room.');
        return;
      }

      const now = Date.now();
      const updatedRoom = { ...currentRoom, isPlaying: false, currentTime, updatedAt: now };
      set({ currentRoom: updatedRoom });
      watchPartyService.saveRoom(updatedRoom);

      watchPartyService.broadcast({
        roomId: currentRoom.id,
        action: 'PAUSE',
        senderId: currentUser.id,
        senderName: currentUser.name,
        currentTime,
        timestamp: now
      });
    },

    sendSeek: (currentTime) => {
      const { currentRoom, currentUser, isHost } = get();
      if (!currentRoom) return;

      if (currentRoom.permissions.hostOnlyControl && !isHost) {
        toast.error('Only the host can seek in this room.');
        return;
      }

      const now = Date.now();
      const updatedRoom = { ...currentRoom, currentTime, updatedAt: now };
      set({ currentRoom: updatedRoom });
      watchPartyService.saveRoom(updatedRoom);

      watchPartyService.broadcast({
        roomId: currentRoom.id,
        action: 'SEEK',
        senderId: currentUser.id,
        senderName: currentUser.name,
        currentTime,
        timestamp: now
      });
    },

    sendHeartbeat: (currentTime) => {
      const { currentRoom, currentUser, isHost } = get();
      if (!currentRoom || !isHost) return;

      watchPartyService.broadcast({
        roomId: currentRoom.id,
        action: 'HEARTBEAT',
        senderId: currentUser.id,
        senderName: currentUser.name,
        currentTime,
        isPlaying: currentRoom.isPlaying,
        timestamp: Date.now()
      });
    },

    sendChatMessage: (content) => {
      const { currentRoom, currentUser } = get();
      if (!currentRoom || !content.trim()) return;

      if (!currentRoom.permissions.membersCanChat && !get().isHost) {
        toast.error('Chat is disabled for this room.');
        return;
      }

      const msg: ChatMessage = {
        id: 'msg_' + Math.random().toString(36).substring(2, 9),
        userId: currentUser.id,
        userName: currentUser.name,
        avatar: currentUser.avatar,
        content: content.trim(),
        type: 'text',
        timestamp: Date.now()
      };

      set(s => ({
        messages: [...s.messages, msg]
      }));

      watchPartyService.broadcast({
        roomId: currentRoom.id,
        action: 'CHAT',
        senderId: currentUser.id,
        senderName: currentUser.name,
        message: msg,
        timestamp: Date.now()
      });
    },

    sendReaction: (emoji) => {
      const { currentRoom, currentUser } = get();
      if (!currentRoom) return;

      if (!currentRoom.permissions.membersCanReact && !get().isHost) {
        return;
      }

      // Random horizontal offset between 10% and 90%
      const xOffset = Math.floor(Math.random() * 80) + 10;
      const scale = 0.8 + Math.random() * 0.5;

      const reaction: ReactionEvent = {
        id: 'react_' + Math.random().toString(36).substring(2, 9),
        emoji,
        userId: currentUser.id,
        userName: currentUser.name,
        xOffset,
        scale,
        timestamp: Date.now()
      };

      set(s => ({
        reactions: [...s.reactions.slice(-30), reaction]
      }));

      watchPartyService.broadcast({
        roomId: currentRoom.id,
        action: 'REACTION',
        senderId: currentUser.id,
        senderName: currentUser.name,
        reaction,
        timestamp: Date.now()
      });
    },

    updatePermissions: (permissions) => {
      const { currentRoom, currentUser, isHost } = get();
      if (!currentRoom || !isHost) return;

      const updatedRoom = { ...currentRoom, permissions };
      set({ currentRoom: updatedRoom });
      watchPartyService.saveRoom(updatedRoom);

      watchPartyService.broadcast({
        roomId: currentRoom.id,
        action: 'PERMISSIONS',
        senderId: currentUser.id,
        senderName: currentUser.name,
        permissions,
        timestamp: Date.now()
      });

      toast.success('Room permissions updated');
    },

    setBuffering: (buffering) => {
      const { currentRoom, currentUser } = get();
      if (!currentRoom) return;

      set({ isBuffering: buffering });

      watchPartyService.broadcast({
        roomId: currentRoom.id,
        action: 'BUFFER',
        senderId: currentUser.id,
        senderName: currentUser.name,
        isBuffering: buffering,
        timestamp: Date.now()
      });
    },

    toggleChat: (open) => {
      set(s => ({
        isChatOpen: open !== undefined ? open : !s.isChatOpen,
        unreadCount: 0
      }));
    },

    refreshRooms: () => {
      set({ activeRooms: watchPartyService.getStoredRooms() });
    },

    setDrift: (driftMs) => {
      set({
        currentDrift: Math.round(driftMs),
        syncStatus: Math.abs(driftMs) > 200 ? 'syncing' : 'synced'
      });
    },

    connectVoice: async () => {
      const { currentRoom, currentUser, isMicMuted, isDeafened } = get();
      if (!currentRoom) return false;

      try {
        await voiceService.startMicrophone(isMicMuted);
        set({ isVoiceConnected: true });

        voiceService.setOnSpeakingChange((isSpeaking) => {
          set({ isSpeaking });
          const room = get().currentRoom;
          if (room) {
            watchPartyService.broadcast({
              roomId: room.id,
              action: 'VOICE_STATE',
              senderId: currentUser.id,
              senderName: currentUser.name,
              timestamp: Date.now(),
              voiceState: {
                isMuted: get().isMicMuted,
                isSpeaking,
                isDeafened: get().isDeafened
              }
            });
          }
        });

        watchPartyService.broadcast({
          roomId: currentRoom.id,
          action: 'VOICE_STATE',
          senderId: currentUser.id,
          senderName: currentUser.name,
          timestamp: Date.now(),
          voiceState: {
            isMuted: isMicMuted,
            isSpeaking: false,
            isDeafened
          }
        });

        toast.success('Voice connected', { icon: '🎙️' });
        return true;
      } catch {
        toast.error('Microphone access is required for voice chat.');
        return false;
      }
    },

    disconnectVoice: () => {
      voiceService.leave();
      set({
        isVoiceConnected: false,
        isSpeaking: false
      });
      toast('Disconnected from voice', { icon: '🔇' });
    },

    toggleMic: async () => {
      const { isMicMuted, isVoiceConnected, connectVoice, currentRoom, currentUser, isDeafened } = get();
      if (!isVoiceConnected) {
        await connectVoice();
        return;
      }

      const newMuted = !isMicMuted;
      voiceService.setMute(newMuted);
      set({ isMicMuted: newMuted });

      if (currentRoom) {
        watchPartyService.broadcast({
          roomId: currentRoom.id,
          action: 'VOICE_STATE',
          senderId: currentUser.id,
          senderName: currentUser.name,
          timestamp: Date.now(),
          voiceState: {
            isMuted: newMuted,
            isSpeaking: false,
            isDeafened
          }
        });
      }

      toast(newMuted ? 'Mic Muted' : 'Mic Live', {
        icon: newMuted ? '🔇' : '🎙️'
      });
    },

    toggleDeafen: () => {
      const { isDeafened, currentRoom, currentUser, isMicMuted } = get();
      const newDeafened = !isDeafened;
      voiceService.setDeafen(newDeafened);
      set({ isDeafened: newDeafened });

      if (currentRoom) {
        watchPartyService.broadcast({
          roomId: currentRoom.id,
          action: 'VOICE_STATE',
          senderId: currentUser.id,
          senderName: currentUser.name,
          timestamp: Date.now(),
          voiceState: {
            isMuted: isMicMuted,
            isSpeaking: false,
            isDeafened: newDeafened
          }
        });
      }

      toast(newDeafened ? 'Audio Deafened' : 'Audio Active', {
        icon: newDeafened ? '🔇' : '🎧'
      });
    }
  };
});
