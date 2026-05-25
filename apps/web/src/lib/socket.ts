import { io, type Socket } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3001';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SERVER_URL, {
      autoConnect: false,
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
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

/** Promisified emit-with-ack. */
export function emit<T = unknown>(
  s: Socket,
  event: string,
  payload: unknown,
  timeoutMs = 5000,
): Promise<T> {
  return new Promise((resolve, reject) => {
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
  GAME_MOVE: 'game:move',
  GAME_RESIGN: 'game:resign',
  GAME_REMATCH: 'game:rematch',
  CHAT_MESSAGE: 'chat:message',
  ROOM_OPPONENT_JOINED: 'room:opponentJoined',
  ROOM_OPPONENT_LEFT: 'room:opponentLeft',
  ROOM_OPPONENT_RECONNECTED: 'room:opponentReconnected',
  ROOM_LIST_UPDATED: 'room:listUpdated',
  GAME_START: 'game:start',
  GAME_MOVE_APPLIED: 'game:moveApplied',
  GAME_MOVE_REJECTED: 'game:moveRejected',
  GAME_OVER: 'game:over',
  GAME_SYNC_STATE: 'game:syncState',
  CHAT_NEW: 'chat:new',
  CHAT_HISTORY: 'chat:history',
} as const;

export interface PublicRoomInfo {
  id: string;
  hostName: string;
  hasPassword: boolean;
  playerCount: number;
  createdAt: number;
}

export interface ChatMessage {
  id: number;
  from: 'B' | 'W' | 'system';
  name: string;
  text: string;
  at: number;
}
