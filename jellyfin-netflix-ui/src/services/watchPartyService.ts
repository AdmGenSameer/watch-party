import { Peer, type DataConnection } from 'peerjs';
import type { WatchPartyRoom, SyncPayload } from '../types/watchParty';
import { voiceService } from './voiceService';

const BROADCAST_CHANNEL_NAME = 'tokoshan_watchparty_channel';
const LOCAL_STORAGE_ROOMS_KEY = 'tokoshan_watchparty_rooms';

export const SAMPLE_FALLBACK_STREAMS = [
  {
    title: 'Cosmic Journey (Sintel Trailer)',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    poster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=1920&fit=crop'
  },
  {
    title: 'Cyberpunk Odyssey (Tears of Steel)',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    poster: 'https://images.unsplash.com/photo-1509281373149-e957c6296406?q=80&w=1920&fit=crop'
  },
  {
    title: 'Wildlife Dimension (Big Buck Bunny)',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    poster: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1920&fit=crop'
  }
];

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' }
];

class WatchPartyService {
  private channel: BroadcastChannel | null = null;
  private listeners: ((payload: SyncPayload) => void)[] = [];
  private serverUrl: string | null = null;
  private token: string | null = null;

  // WebRTC P2P DataChannels
  private peer: Peer | null = null;
  private guestConnections: Map<string, DataConnection> = new Map();
  private hostConnection: DataConnection | null = null;
  private isPeerHost = false;

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        this.channel.onmessage = (event) => {
          this.notifyListeners(event.data);
        };
      } catch (err) {
        console.warn('BroadcastChannel not available, falling back to storage events', err);
      }
    }

    // Also listen to storage events as cross-origin or fallback multi-tab channel
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.key === 'tokoshan_watchparty_event' && event.newValue) {
          try {
            const payload = JSON.parse(event.newValue);
            this.notifyListeners(payload);
          } catch {
            // Ignore parse errors
          }
        }
      });
    }
  }

  // --- WebRTC PeerJS P2P Implementation ---

  public async startHostPeer(roomCode: string): Promise<string> {
    this.closePeer();
    this.isPeerHost = true;
    const formattedCode = roomCode.trim().toLowerCase();
    const hostPeerId = `tokoshan-party-${formattedCode}`;

    return new Promise((resolve) => {
      try {
        const peer = new Peer(hostPeerId, {
          config: { iceServers: ICE_SERVERS }
        });

        this.peer = peer;
        voiceService.init(peer);

        peer.on('open', (id) => {
          console.log('[WebRTC] Host Peer opened with ID:', id);
          resolve(id);
        });

        peer.on('connection', (conn) => {
          console.log('[WebRTC] Guest connecting:', conn.peer);
          this.setupGuestConnection(conn);
        });

        peer.on('error', (err) => {
          console.warn('[WebRTC] Host Peer notice (falling back to channel/local sync if ID taken):', err.type);
          resolve(hostPeerId);
        });
      } catch (e) {
        console.warn('[WebRTC] Could not create host peer:', e);
        resolve(hostPeerId);
      }
    });
  }

  private setupGuestConnection(conn: DataConnection) {
    conn.on('open', () => {
      console.log('[WebRTC] Guest connection opened:', conn.peer);
      this.guestConnections.set(conn.peer, conn);
      // Establish voice audio connection
      voiceService.callPeer(conn.peer);
    });

    conn.on('data', (data) => {
      const payload = data as SyncPayload;
      // Host notifies local listeners
      this.notifyListeners(payload);

      // Host relays to all other connected guests (star mesh topology)
      this.guestConnections.forEach((c, peerId) => {
        if (peerId !== conn.peer && c.open) {
          try {
            c.send(payload);
          } catch {
            // connection drop
          }
        }
      });
    });

    conn.on('close', () => {
      console.log('[WebRTC] Guest disconnected:', conn.peer);
      this.guestConnections.delete(conn.peer);
    });

    conn.on('error', (err) => {
      console.warn('[WebRTC] Guest connection error:', err);
      this.guestConnections.delete(conn.peer);
    });
  }

  public async connectToHostPeer(roomCode: string): Promise<boolean> {
    this.closePeer();
    this.isPeerHost = false;
    const formattedCode = roomCode.trim().toLowerCase();
    const targetHostPeerId = `tokoshan-party-${formattedCode}`;

    return new Promise((resolve) => {
      try {
        const peer = new Peer({
          config: { iceServers: ICE_SERVERS }
        });

        this.peer = peer;
        voiceService.init(peer);

        peer.on('open', () => {
          console.log('[WebRTC] Guest Peer opened, connecting to host:', targetHostPeerId);
          const conn = peer.connect(targetHostPeerId, { reliable: true });
          this.hostConnection = conn;

          conn.on('open', () => {
            console.log('[WebRTC] Successfully connected to Host DataChannel!');
            // Establish voice audio call to host
            voiceService.callPeer(targetHostPeerId);
            resolve(true);
          });

          conn.on('data', (data) => {
            this.notifyListeners(data as SyncPayload);
          });

          conn.on('close', () => {
            console.log('[WebRTC] Disconnected from Host DataChannel');
            this.hostConnection = null;
          });

          conn.on('error', (err) => {
            console.warn('[WebRTC] Host connection error:', err);
            resolve(false);
          });

          // Timeout after 4 seconds to resolve true anyway (fallback channel handles same-machine/local)
          setTimeout(() => resolve(true), 4000);
        });

        peer.on('error', (err) => {
          console.warn('[WebRTC] Guest peer error:', err);
          resolve(false);
        });
      } catch (e) {
        console.warn('[WebRTC] Guest peer initialization error:', e);
        resolve(false);
      }
    });
  }

  public closePeer() {
    voiceService.leave();

    if (this.hostConnection) {
      try { this.hostConnection.close(); } catch { /* ignore */ }
      this.hostConnection = null;
    }

    this.guestConnections.forEach(c => {
      try { c.close(); } catch { /* ignore */ }
    });
    this.guestConnections.clear();

    if (this.peer) {
      try { this.peer.destroy(); } catch { /* ignore */ }
      this.peer = null;
    }
  }

  public getPeerId(): string | null {
    return this.peer?.id || null;
  }

  // --- Native WebSocket Connection to Jellyfin WatchParty API ---
  private wsConnection: WebSocket | null = null;

  public initServer(serverUrl: string | null, token: string | null) {
    this.serverUrl = serverUrl;
    this.token = token;

    if (serverUrl) {
      this.connectWebSocket(serverUrl);
    }
  }

  private connectWebSocket(serverUrl: string) {
    try {
      if (this.wsConnection) {
        try { this.wsConnection.close(); } catch { /* ignore */ }
        this.wsConnection = null;
      }

      const isHttps = typeof window !== 'undefined' && (window.location.protocol === 'https:' || serverUrl.startsWith('https:'));
      const wsProtocol = isHttps ? 'wss:' : 'ws:';
      const host = serverUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
      const tokenParam = this.token ? `?api_key=${encodeURIComponent(this.token)}` : '';
      const wsUrl = `${wsProtocol}//${host}/api/watchparty/ws${tokenParam}`;

      const ws = new WebSocket(wsUrl);
      this.wsConnection = ws;

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as SyncPayload;
          this.notifyListeners(payload);
        } catch {
          // ignore
        }
      };

      ws.onopen = () => {
        console.log('[WebSocket] Connected to Watch Party sync server at', wsUrl);
      };

      ws.onerror = () => {
        console.info('[WebSocket] Notice: Falling back to WebRTC P2P direct mesh');
      };
    } catch {
      console.info('[WebSocket] Could not open WebSocket, using WebRTC P2P direct mesh');
    }
  }

  // --- Unified Real-Time Broadcast ---

  public broadcast(payload: SyncPayload) {
    // 1. WebRTC DataChannels: Direct P2P transmission
    if (this.isPeerHost) {
      // Host sends to all guests
      this.guestConnections.forEach((conn) => {
        if (conn.open) {
          try {
            conn.send(payload);
          } catch (e) {
            console.warn('[WebRTC] Send failed', e);
          }
        }
      });
    } else if (this.hostConnection && this.hostConnection.open) {
      // Guest sends to Host
      try {
        this.hostConnection.send(payload);
      } catch (e) {
        console.warn('[WebRTC] Send to host failed', e);
      }
    }

    // 2. BroadcastChannel: Instant zero-latency cross-tab sync on same machine
    if (this.channel) {
      try {
        this.channel.postMessage(payload);
      } catch (e) {
        console.warn('Channel post error', e);
      }
    }

    // 3. Storage event fallback
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('tokoshan_watchparty_event', JSON.stringify({ ...payload, _rand: Math.random() }));
      } catch {
        // storage quota or private mode
      }
    }

    // 4. Native WebSocket broadcast (if open)
    if (this.wsConnection && this.wsConnection.readyState === WebSocket.OPEN) {
      try {
        this.wsConnection.send(JSON.stringify(payload));
      } catch {
        // fail silently
      }
    }
  }

  public subscribe(listener: (payload: SyncPayload) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(payload: SyncPayload) {
    this.listeners.forEach(listener => {
      try {
        listener(payload);
      } catch (err) {
        console.error('Error in watch party listener', err);
      }
    });
  }

  // --- Room Storage Management ---

  public getStoredRooms(): WatchPartyRoom[] {
    try {
      const data = localStorage.getItem(LOCAL_STORAGE_ROOMS_KEY);
      if (!data) return [];
      const rooms: WatchPartyRoom[] = JSON.parse(data);
      const now = Date.now();
      return rooms.filter(r => now - r.updatedAt < 86400000);
    } catch {
      return [];
    }
  }

  public saveRoom(room: WatchPartyRoom) {
    try {
      const rooms = this.getStoredRooms().filter(r => r.id !== room.id);
      rooms.unshift(room);
      localStorage.setItem(LOCAL_STORAGE_ROOMS_KEY, JSON.stringify(rooms));
    } catch {
      // ignore storage error
    }
  }

  public deleteRoom(roomId: string) {
    try {
      const rooms = this.getStoredRooms().filter(r => r.id !== roomId);
      localStorage.setItem(LOCAL_STORAGE_ROOMS_KEY, JSON.stringify(rooms));

      // Also notify backend API if authenticated
      if (this.serverUrl && this.token) {
        fetch(`${this.serverUrl}/api/watchparty/rooms/${roomId}`, {
          method: 'DELETE',
          headers: {
            'X-Emby-Token': this.token
          }
        }).catch(() => {});
      }
    } catch {
      // ignore
    }
  }

  public findRoomByCode(code: string): WatchPartyRoom | undefined {
    const formatted = code.trim().toUpperCase();
    return this.getStoredRooms().find(r => r.code.toUpperCase() === formatted);
  }

  public findRoomById(id: string): WatchPartyRoom | undefined {
    return this.getStoredRooms().find(r => r.id === id);
  }

  // --- Stream Resolver for Any Jellyfin Server ---

  public getStreamUrl(mediaId: string, serverUrl?: string | null, token?: string | null, fallbackIndex = 0): string {
    const activeServer = serverUrl || this.serverUrl;
    const activeToken = token || this.token;
    if (activeServer && activeToken && mediaId && !mediaId.startsWith('p') && !mediaId.startsWith('c')) {
      return `${activeServer}/Videos/${mediaId}/master.m3u8?MediaSourceId=${mediaId}&DeviceId=tokoshan-web&PlaySessionId=wp_${mediaId}&VideoCodec=h264&AudioCodec=aac,mp3&VideoBitrate=12000000&AudioBitrate=320000&TranscodingMaxAudioChannels=2&SegmentContainer=ts&MinSegments=1&BreakOnNonKeyFrames=True&api_key=${activeToken}`;
    }
    const sample = SAMPLE_FALLBACK_STREAMS[fallbackIndex % SAMPLE_FALLBACK_STREAMS.length];
    return sample.url;
  }
}

export const watchPartyService = new WatchPartyService();
