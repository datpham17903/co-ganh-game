import type { Server, Socket } from 'socket.io';
import { Events, LOBBY_ROOM } from './events.js';
import type { RoomManager, ListPublicQuery } from '../rooms/RoomManager.js';
import type { Room } from '../rooms/Room.js';
import { ROOM_NAME_MAX } from '../rooms/Room.js';

const NAME_PATTERN = /^[\p{L}\p{N}_\-\s]{1,20}$/u;
const PASSWORD_MAX_LEN = 32;
/** Throttle lobby broadcast — gộp nhiều update trong 200ms thành 1 emit. */
const LOBBY_THROTTLE_MS = 200;

interface CreatePayload {
  playerName: string;
  isPublic?: boolean;
  password?: string;
  roomName?: string;
}
interface JoinPayload {
  roomId: string;
  playerName: string;
  password?: string;
}
interface ReconnectPayload {
  roomId: string;
  playerToken: string;
}
interface SpectatePayload {
  roomId: string;
  playerName: string;
}
interface MovePayload {
  from: number;
  to: number;
}
interface ChatPayload {
  text: string;
}
interface ListPayload {
  search?: string;
  limit?: number;
  offset?: number;
}

type Cb<T> = (resp: T) => void;

function sanitize(name: string): string | null {
  const trimmed = (name ?? '').trim();
  if (!NAME_PATTERN.test(trimmed)) return null;
  return trimmed;
}

/**
 * Sanitize room name: trim + cap + bỏ control chars (Unicode general
 * categories Cc/Cf). Cho phép space + Unicode letters/numbers/symbols.
 */
function sanitizeRoomName(s: string | undefined): string {
  if (!s) return '';
  const trimmed = s.trim().slice(0, ROOM_NAME_MAX);
  // Bỏ control characters dùng Unicode property — eslint-friendly.
  return trimmed.replace(/[\p{Cc}\p{Cf}]/gu, '');
}

function makeLobbyBroadcaster(io: Server, rooms: RoomManager) {
  let scheduled: NodeJS.Timeout | null = null;
  return () => {
    if (scheduled) return;
    scheduled = setTimeout(() => {
      scheduled = null;
      const list = rooms.listPublic({ limit: 100 });
      io.to(LOBBY_ROOM).emit(Events.ROOM_LIST_UPDATED, list);
    }, LOBBY_THROTTLE_MS);
  };
}

function emitSpectatorsUpdate(io: Server, room: Room): void {
  io.to(room.id).emit(Events.ROOM_SPECTATORS_UPDATE, {
    spectators: room.spectators.map((s) => ({ name: s.name })),
  });
}

export function registerHandlers(io: Server, socket: Socket, rooms: RoomManager): void {
  const broadcastLobby = makeLobbyBroadcaster(io, rooms);

  socket.on(Events.ROOM_CREATE, (payload: CreatePayload, cb?: Cb<unknown>) => {
    const name = sanitize(payload?.playerName);
    if (!name) return cb?.({ ok: false, error: 'INVALID_NAME' });
    const password = payload?.password ?? '';
    if (password.length > PASSWORD_MAX_LEN) {
      return cb?.({ ok: false, error: 'PASSWORD_TOO_LONG' });
    }
    const roomName = sanitizeRoomName(payload?.roomName);
    try {
      const { room, color, token } = rooms.create(socket.id, name, {
        isPublic: payload?.isPublic === true,
        password: password || undefined,
        name: roomName,
      });
      socket.join(room.id);
      socket.data.roomId = room.id;
      socket.data.color = color;
      cb?.({
        ok: true,
        roomId: room.id,
        color,
        playerToken: token,
        isPublic: room.isPublic,
        hasPassword: room.hasPassword(),
        roomName: room.name,
      });
      if (room.isPublic) broadcastLobby();
    } catch (e) {
      cb?.({ ok: false, error: e instanceof Error ? e.message : 'ERROR' });
    }
  });

  socket.on(Events.ROOM_JOIN, (payload: JoinPayload, cb?: Cb<unknown>) => {
    const name = sanitize(payload?.playerName);
    if (!name) return cb?.({ ok: false, error: 'INVALID_NAME' });
    const result = rooms.join(payload.roomId, socket.id, name, payload.password);
    if (!result.ok) return cb?.({ ok: false, error: result.error });
    socket.join(result.room.id);
    socket.data.roomId = result.room.id;
    socket.data.color = result.color;
    const opponentColor = result.color === 'B' ? 'W' : 'B';
    const opponent = result.room.players[opponentColor];
    cb?.({
      ok: true,
      roomId: result.room.id,
      color: result.color,
      playerToken: result.token,
      opponent: opponent ? { name: opponent.name } : null,
      state: result.room.state,
      roomName: result.room.name,
    });
    socket.to(result.room.id).emit(Events.ROOM_OPPONENT_JOINED, { name });
    if (result.room.status === 'playing') {
      io.to(result.room.id).emit(Events.GAME_START, {
        state: result.room.state,
        players: {
          B: result.room.players.B ? { name: result.room.players.B.name } : null,
          W: result.room.players.W ? { name: result.room.players.W.name } : null,
        },
        clock: result.room.clockSnapshot(),
      });
    }
    if (result.room.isPublic) broadcastLobby();
    socket.emit(Events.CHAT_HISTORY, { messages: result.room.chat });
    emitSpectatorsUpdate(io, result.room);
  });

  socket.on(Events.ROOM_SPECTATE, (payload: SpectatePayload, cb?: Cb<unknown>) => {
    const name = sanitize(payload?.playerName);
    if (!name) return cb?.({ ok: false, error: 'INVALID_NAME' });
    const result = rooms.spectate(payload.roomId, socket.id, name);
    if (!result.ok) return cb?.({ ok: false, error: result.error });
    socket.join(result.room.id);
    socket.data.roomId = result.room.id;
    socket.data.spectator = true;
    cb?.({
      ok: true,
      roomId: result.room.id,
      state: result.room.state,
      players: {
        B: result.room.players.B ? { name: result.room.players.B.name } : null,
        W: result.room.players.W ? { name: result.room.players.W.name } : null,
      },
      clock: result.room.clockSnapshot(),
      roomName: result.room.name,
    });
    socket.emit(Events.CHAT_HISTORY, { messages: result.room.chat });
    socket.to(result.room.id).emit(Events.ROOM_SPECTATOR_JOINED, { name });
    emitSpectatorsUpdate(io, result.room);
    broadcastLobby();
  });

  socket.on(Events.ROOM_RECONNECT, (payload: ReconnectPayload, cb?: Cb<unknown>) => {
    if (!payload?.roomId || !payload?.playerToken)
      return cb?.({ ok: false, error: 'INVALID_PAYLOAD' });
    const r = rooms.reconnect(payload.roomId, socket.id, payload.playerToken);
    if (!r.ok) return cb?.({ ok: false, error: r.error });
    socket.join(r.room.id);
    socket.data.roomId = r.room.id;
    socket.data.color = r.color;
    const oppColor = r.color === 'B' ? 'W' : 'B';
    const opp = r.room.players[oppColor];
    cb?.({
      ok: true,
      color: r.color,
      state: r.room.state,
      opponent: opp ? { name: opp.name } : null,
      roomStatus: r.room.status,
      clock: r.room.clockSnapshot(),
      roomName: r.room.name,
    });
    socket.emit(Events.GAME_SYNC_STATE, { state: r.room.state, clock: r.room.clockSnapshot() });
    socket.emit(Events.CHAT_HISTORY, { messages: r.room.chat });
    if (opp && r.room.status === 'playing') {
      socket.emit(Events.GAME_START, {
        state: r.room.state,
        players: {
          B: r.room.players.B ? { name: r.room.players.B.name } : null,
          W: r.room.players.W ? { name: r.room.players.W.name } : null,
        },
        clock: r.room.clockSnapshot(),
      });
      socket.to(r.room.id).emit(Events.ROOM_OPPONENT_RECONNECTED, {
        name: r.room.players[r.color]?.name ?? '',
      });
    }
    emitSpectatorsUpdate(io, r.room);
  });

  socket.on(Events.ROOM_LIST, (payload: ListPayload | undefined, cb?: Cb<unknown>) => {
    const query: ListPublicQuery = {
      search: typeof payload?.search === 'string' ? payload.search.slice(0, 50) : undefined,
      limit: typeof payload?.limit === 'number' ? payload.limit : undefined,
      offset: typeof payload?.offset === 'number' ? payload.offset : undefined,
    };
    const result = rooms.listPublic(query);
    cb?.({ ok: true, ...result });
  });

  socket.on(Events.LOBBY_SUBSCRIBE, () => {
    socket.join(LOBBY_ROOM);
  });
  socket.on(Events.LOBBY_UNSUBSCRIBE, () => {
    socket.leave(LOBBY_ROOM);
  });

  socket.on(Events.ROOM_LEAVE, () => {
    handleLeave(io, socket, rooms, true, broadcastLobby);
  });

  socket.on(Events.GAME_MOVE, (payload: MovePayload, cb?: Cb<unknown>) => {
    const room = rooms.getBySocketId(socket.id);
    if (!room) return cb?.({ ok: false, error: 'NO_ROOM' });
    if (typeof payload?.from !== 'number' || typeof payload?.to !== 'number') {
      return cb?.({ ok: false, error: 'INVALID_PAYLOAD' });
    }
    const result = room.applyMoveBy(socket.id, payload);
    if (!result.ok) {
      cb?.({ ok: false, error: result.error });
      socket.emit(Events.GAME_MOVE_REJECTED, { reason: result.error });
      return;
    }
    cb?.({ ok: true });
    io.to(room.id).emit(Events.GAME_MOVE_APPLIED, {
      state: result.state,
      move: result.state.moveHistory[result.state.moveHistory.length - 1],
      captures: result.captures,
      clock: room.clockSnapshot(),
      serverTime: Date.now(),
    });
    if (result.state.status !== 'playing') {
      io.to(room.id).emit(Events.GAME_OVER, {
        winner:
          result.state.status === 'B_won' ? 'B' : result.state.status === 'W_won' ? 'W' : 'draw',
        reason:
          result.state.status === 'draw' ? (result.state.drawReason ?? 'no_moves') : 'capture_all',
      });
    }
  });

  socket.on(Events.GAME_RESIGN, (_payload: unknown, cb?: Cb<unknown>) => {
    const room = rooms.getBySocketId(socket.id);
    if (!room) return cb?.({ ok: false, error: 'NO_ROOM' });
    const color = room.colorOfSocket(socket.id);
    if (!color) return cb?.({ ok: false, error: 'NO_ROOM' });
    if (room.status !== 'playing') return cb?.({ ok: false, error: 'GAME_NOT_PLAYING' });
    room.resign(color);
    cb?.({ ok: true });
    // State đã chuyển sang 'finished' — broadcast để client cập nhật và hiện modal.
    io.to(room.id).emit(Events.GAME_SYNC_STATE, {
      state: room.state,
      clock: room.clockSnapshot(),
    });
    io.to(room.id).emit(Events.GAME_OVER, {
      winner: color === 'B' ? 'W' : 'B',
      reason: 'resign',
    });
    if (room.isPublic) broadcastLobby();
  });

  socket.on(Events.GAME_REMATCH, (_payload: unknown, cb?: Cb<unknown>) => {
    const room = rooms.getBySocketId(socket.id);
    if (!room) return cb?.({ ok: false, error: 'NO_ROOM' });
    const color = room.colorOfSocket(socket.id);
    if (!color) return cb?.({ ok: false, error: 'NO_ROOM' });
    room.rematchRequested[color] = true;
    cb?.({ ok: true, waiting: !room.rematchRequested.B || !room.rematchRequested.W });
    if (room.rematchRequested.B && room.rematchRequested.W) {
      room.reset();
      io.to(room.id).emit(Events.GAME_START, {
        state: room.state,
        players: {
          B: room.players.B ? { name: room.players.B.name } : null,
          W: room.players.W ? { name: room.players.W.name } : null,
        },
        clock: room.clockSnapshot(),
      });
    }
  });

  /** Chat: player + spectator đều gửi được. Rate limit 800ms/socket. */
  let lastChatAt = 0;
  socket.on(Events.CHAT_MESSAGE, (payload: ChatPayload, cb?: Cb<unknown>) => {
    const now = Date.now();
    if (now - lastChatAt < 800) {
      return cb?.({ ok: false, error: 'RATE_LIMIT' });
    }
    const room = rooms.getBySocketId(socket.id);
    if (!room) return cb?.({ ok: false, error: 'NO_ROOM' });
    const color = room.colorOfSocket(socket.id);
    let from: 'B' | 'W' | 'spectator' = 'spectator';
    let senderName = '';
    if (color) {
      from = color;
      senderName = room.players[color]?.name ?? '';
    } else {
      const idx = room.spectatorIndex(socket.id);
      if (idx < 0) return cb?.({ ok: false, error: 'NO_ROOM' });
      senderName = room.spectators[idx]?.name ?? '';
    }
    const msg = room.pushChat(from, senderName, payload?.text ?? '');
    if (!msg) return cb?.({ ok: false, error: 'INVALID_TEXT' });
    lastChatAt = now;
    cb?.({ ok: true, message: msg });
    io.to(room.id).emit(Events.CHAT_NEW, { message: msg });
  });

  socket.on('disconnect', () => {
    handleLeave(io, socket, rooms, false, broadcastLobby);
    socket.leave(LOBBY_ROOM);
  });
}

function handleLeave(
  io: Server,
  socket: Socket,
  rooms: RoomManager,
  intentional: boolean,
  broadcastLobby: () => void,
): void {
  const result = rooms.disconnect(socket.id);
  if (!result) return;

  if (result.role === 'spectator') {
    socket.to(result.room.id).emit(Events.ROOM_SPECTATOR_LEFT, {});
    emitSpectatorsUpdate(io, result.room);
    if (result.room.isPublic) broadcastLobby();
    return;
  }

  const { room, color } = result;
  const oppColor = color === 'B' ? 'W' : 'B';

  // Phòng đang waiting + chỉ có 1 player (chính là người đang leave) → xóa
  // ngay để không tạo "ghost room" hiển thị trong lobby.
  if (room.status === 'waiting' && !room.players[oppColor]) {
    const wasPublic = room.isPublic;
    rooms.removeRoom(room.id);
    if (wasPublic) broadcastLobby();
    return;
  }

  const willForfeit = room.status === 'playing' && intentional;
  socket.to(room.id).emit(Events.ROOM_OPPONENT_LEFT, {
    name: room.players[color]?.name ?? '',
    willForfeit,
  });
  if (intentional && room.status === 'playing') {
    room.resign(color);
    io.to(room.id).emit(Events.GAME_SYNC_STATE, {
      state: room.state,
      clock: room.clockSnapshot(),
    });
    io.to(room.id).emit(Events.GAME_OVER, {
      winner: oppColor,
      reason: 'resign',
    });
  }
  if (room.isPublic) broadcastLobby();
}
