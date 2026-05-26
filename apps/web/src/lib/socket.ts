import { io, type Socket } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3001';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SERVER_URL, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });
  }
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function emit<T = unknown>(
  s: Socket,
  event: string,
  payload: unknown,
  timeoutMs = 20000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    if (!s.connected) {
      s.connect();
    }
    const timer = setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs);
    s.emit(event, payload, (resp: T) => {
      clearTimeout(timer);
      resolve(resp);
    });
  });
}

export const SocketEvents = {
  ROOM_CREATE: 'room:create',
  ROOM_JOIN: 'room:join',
  ROOM_LEAVE: 'room:leave',
  ROOM_RECONNECT: 'room:reconnect',
  ROOM_LIST: 'room:list',
  ROOM_GET_STATE: 'room:getState',
  ROOM_SPECTATE: 'room:spectate',
  LOBBY_SUBSCRIBE: 'lobby:subscribe',
  LOBBY_UNSUBSCRIBE: 'lobby:unsubscribe',
  GAME_MOVE: 'game:move',
  GAME_RESIGN: 'game:resign',
  GAME_REMATCH: 'game:rematch',
  CHAT_MESSAGE: 'chat:message',
  ROOM_OPPONENT_JOINED: 'room:opponentJoined',
  ROOM_OPPONENT_LEFT: 'room:opponentLeft',
  ROOM_OPPONENT_RECONNECTED: 'room:opponentReconnected',
  ROOM_SPECTATOR_JOINED: 'room:spectatorJoined',
  ROOM_SPECTATOR_LEFT: 'room:spectatorLeft',
  ROOM_SPECTATORS_UPDATE: 'room:spectatorsUpdate',
  ROOM_LIST_UPDATED: 'room:listUpdated',
  GAME_START: 'game:start',
  GAME_MOVE_APPLIED: 'game:moveApplied',
  GAME_MOVE_REJECTED: 'game:moveRejected',
  GAME_OVER: 'game:over',
  GAME_SYNC_STATE: 'game:syncState',
  CHAT_NEW: 'chat:new',
  CHAT_HISTORY: 'chat:history',
  CLOCK_UPDATE: 'clock:update',
} as const;

export interface ClockState {
  B: number;
  W: number;
  turn: 'B' | 'W' | null;
}

export interface PublicRoomInfo {
  id: string;
  name: string;
  hostName: string;
  hasPassword: boolean;
  playerCount: number;
  spectatorCount: number;
  status: 'waiting' | 'playing';
  createdAt: number;
}

export interface ListPublicResult {
  rooms: PublicRoomInfo[];
  total: number;
}

export interface ChatMessage {
  id: number;
  from: 'B' | 'W' | 'spectator' | 'system';
  name: string;
  text: string;
  at: number;
}

export interface SpectatorInfo {
  name: string;
}
