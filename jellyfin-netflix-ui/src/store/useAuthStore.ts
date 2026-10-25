import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  serverUrl: string;
  token: string | null;
  userId: string | null;
  username: string | null;
  setAuth: (serverUrl: string, token: string, userId: string, username: string) => void;
  clearAuth: () => void;
}

const getDefaultOrigin = () => {
  return typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8096';
};

const getInitialSession = () => {
  const origin = getDefaultOrigin();
  if (typeof window !== 'undefined') {
    try {
      // Try to inherit active session from Jellyfin Web client
      const raw = localStorage.getItem('jellyfin_credentials') || localStorage.getItem('serverCredentials');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.Servers && parsed.Servers.length > 0) {
          const s = parsed.Servers[0];
          if (s.AccessToken) {
            return {
              serverUrl: s.ManualAddress || origin,
              token: s.AccessToken,
              userId: s.UserId || null,
              username: s.UserName || 'Jellyfin User',
            };
          }
        }
      }
    } catch {
      // Fallback
    }
  }
  return {
    serverUrl: origin,
    token: null,
    userId: null,
    username: null,
  };
};

const initial = getInitialSession();

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      serverUrl: initial.serverUrl,
      token: initial.token,
      userId: initial.userId,
      username: initial.username,
      setAuth: (serverUrl, token, userId, username) => 
        set({ serverUrl: serverUrl || getDefaultOrigin(), token, userId, username }),
      clearAuth: () => 
        set({ serverUrl: getDefaultOrigin(), token: null, userId: null, username: null }),
    }),
    {
      name: 'jellyfin-auth-storage',
    }
  )
);
