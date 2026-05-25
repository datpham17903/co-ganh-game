import type { Server, Socket } from 'socket.io';
import { Events } from './events.js';
import type { RoomManager } from '../rooms/RoomManager.js';

const NAME_PATTERN = /^[\p{L}\p{N}_\-\s]{1,20}$/u;

interface CreatePayload {
  playerName: string;
}
interface JoinPayload {
  roomId: string;
  playerName: string;
}
interface ReconnectPayload {
  roomId: string;
  playerToken: string;
}
interface MovePayload {
  from: number;
  to: number;
}

type Cb<T> = (resp: T) => void;

function sanitize(name: string): string | null {
  const trimmed = (name ?? '').trim();
  if (!NAME_PATTERN.test(trimmed)) return null;
  return trimmed;
}

export function registerHandlers(io: Server, socket: Socket, rooms: RoomManager): void {
  socket.on(Events.ROOM_CREATE, (payload: CreatePayload, cb?: Cb<unknown>) => {
    const name = sanitize(payload?.playerName);
    if (!name) return cb?.({ ok: false, error: 'INVALID_NAME' });
    try {
      const { room, color, token } = rooms.create(socket.id, name);
      socket.join(room.id);
      socket.data.roomId = room.id;
      socket.data.color = color;
      cb?.({ ok: true, roomId: room.id, color, playerToken: token });
    } catch (e) {
      cb?.({ ok: false, error: e instanceof Error ? e.message : 'ERROR' });
    }
  });

  socket.on(Events.ROOM_JOIN, (payload: JoinPayload, cb?: Cb<unknown>) => {
    const name = sanitize(payload?.playerName);
    if (!name) return cb?.({ ok: false, error: 'INVALID_NAME' });
    const result = rooms.join(payload.roomId, socket.id, name);
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
    });
    socket.to(result.room.id).emit(Events.ROOM_OPPONENT_JOINED, { name });
    if (result.room.status === 'playing') {
      io.to(result.room.id).emit(Events.GAME_START, {
        state: result.room.state,
        players: {
          B: result.room.players.B ? { name: result.room.players.B.name } : null,
          W: result.room.players.W ? { name: result.room.players.W.name } : null,
        },
      });
    }
  });

  socket.on(Events.ROOM_RECONNECT, (payload: ReconnectPayload, cb?: Cb<unknown>) => {
    if (!payload?.roomId || !payload?.playerToken)
      return cb?.({ ok: false, error: 'INVALID_PAYLOAD' });
    const r = rooms.reconnect(payload.roomId, socket.id, payload.playerToken);
    if (!r.ok) return cb?.({ ok: false, error: r.error });
    socket.join(r.room.id);
    socket.data.roomId = r.room.id;
    socket.data.color = r.color;
    cb?.({ ok: true, color: r.color, state: r.room.state });
    socket.emit(Events.GAME_SYNC_STATE, { state: r.room.state });
    const opp = r.room.players[r.color === 'B' ? 'W' : 'B'];
    if (opp) {
      socket.to(r.room.id).emit(Events.ROOM_OPPONENT_RECONNECTED, {
        name: r.room.players[r.color]?.name ?? '',
      });
    }
  });

  socket.on(Events.ROOM_LEAVE, () => {
    handleDisconnect(io, socket, rooms, /*intentional*/ true);
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
    room.resign(color);
    cb?.({ ok: true });
    io.to(room.id).emit(Events.GAME_OVER, {
      winner: color === 'B' ? 'W' : 'B',
      reason: 'resign',
    });
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
      });
    }
  });

  socket.on('disconnect', () => {
    handleDisconnect(io, socket, rooms, false);
  });
}

function handleDisconnect(
  io: Server,
  socket: Socket,
  rooms: RoomManager,
  intentional: boolean,
): void {
  const result = rooms.disconnect(socket.id);
  if (!result) return;
  const { room, color } = result;
  const oppColor = color === 'B' ? 'W' : 'B';
  const willForfeit = room.status === 'playing' && intentional;
  socket.to(room.id).emit(Events.ROOM_OPPONENT_LEFT, {
    name: room.players[color]?.name ?? '',
    willForfeit,
  });
  if (intentional && room.status === 'playing') {
    room.resign(color);
    io.to(room.id).emit(Events.GAME_OVER, {
      winner: oppColor,
      reason: 'resign',
    });
  }
}
