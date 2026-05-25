import { create } from 'zustand';

interface SocketState {
  connected: boolean;
  reconnecting: boolean;
  /** Lưu trên session để reconnect — không persist long-term. */
  roomId: string | null;
  playerToken: string | null;
  setConnected: (b: boolean) => void;
  setReconnecting: (b: boolean) => void;
  setSession: (roomId: string | null, token: string | null) => void;
  clearSession: () => void;
}

export const useSocketStore = create<SocketState>((set) => ({
  connected: false,
  reconnecting: false,
  roomId: getStored('co-ganh-roomId'),
  playerToken: getStored('co-ganh-playerToken'),
  setConnected: (connected) => set({ connected }),
  setReconnecting: (reconnecting) => set({ reconnecting }),
  setSession: (roomId, playerToken) => {
    setStored('co-ganh-roomId', roomId);
    setStored('co-ganh-playerToken', playerToken);
    set({ roomId, playerToken });
  },
  clearSession: () => {
    setStored('co-ganh-roomId', null);
    setStored('co-ganh-playerToken', null);
    set({ roomId: null, playerToken: null });
  },
}));

function getStored(key: string): string | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function setStored(key: string, value: string | null): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}
