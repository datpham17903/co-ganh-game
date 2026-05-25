import { Room } from './Room.js';
import { generatePlayerToken, generateRoomCode, isValidRoomCode } from '../utils/codes.js';

export interface RoomManagerOptions {
  maxRooms?: number;
  /** TTL phòng waiting (default 10 phút). */
  waitingTtlMs?: number;
  /** Reconnect deadline (default 60s). */
  reconnectTtlMs?: number;
  rand?: () => number;
}

export class RoomManager {
  private rooms = new Map<string, Room>();
  private socketToRoom = new Map<string, string>();
  private maxRooms: number;
  private waitingTtlMs: number;
  private reconnectTtlMs: number;
  private rand: () => number;

  constructor(opts: RoomManagerOptions = {}) {
    this.maxRooms = opts.maxRooms ?? 1000;
    this.waitingTtlMs = opts.waitingTtlMs ?? 600_000;
    this.reconnectTtlMs = opts.reconnectTtlMs ?? 60_000;
    this.rand = opts.rand ?? Math.random;
  }

  /** Tạo phòng mới với 1 player. Trả {room, color, token}. */
  create(
    socketId: string,
    name: string,
  ): {
    room: Room;
    color: 'B';
    token: string;
  } {
    if (this.rooms.size >= this.maxRooms) throw new Error('MAX_ROOMS');
    let id = '';
    for (let i = 0; i < 5; i++) {
      const candidate = generateRoomCode(this.rand);
      if (!this.rooms.has(candidate)) {
        id = candidate;
        break;
      }
    }
    if (!id) throw new Error('CANNOT_GENERATE_ROOM_CODE');
    const room = new Room(id);
    const token = generatePlayerToken(this.rand);
    room.addPlayer({ socketId, name, token });
    this.rooms.set(id, room);
    this.socketToRoom.set(socketId, id);
    return { room, color: 'B', token };
  }

  /** Player join phòng có sẵn. */
  join(
    roomId: string,
    socketId: string,
    name: string,
  ):
    | { ok: true; room: Room; color: 'B' | 'W'; token: string }
    | { ok: false; error: 'NOT_FOUND' | 'FULL' | 'INVALID_CODE' } {
    if (!isValidRoomCode(roomId)) return { ok: false, error: 'INVALID_CODE' };
    const room = this.rooms.get(roomId);
    if (!room) return { ok: false, error: 'NOT_FOUND' };
    if (room.playerCount() >= 2) return { ok: false, error: 'FULL' };
    const token = generatePlayerToken(this.rand);
    const color = room.addPlayer({ socketId, name, token });
    if (color === 'B') {
      // Defensive: shouldn't happen because B should be filled first
      this.socketToRoom.set(socketId, roomId);
      return { ok: true, room, color, token };
    }
    this.socketToRoom.set(socketId, roomId);
    return { ok: true, room, color, token };
  }

  reconnect(
    roomId: string,
    socketId: string,
    token: string,
  ):
    | { ok: true; room: Room; color: 'B' | 'W' }
    | { ok: false; error: 'NOT_FOUND' | 'NOT_IN_ROOM' } {
    const room = this.rooms.get(roomId);
    if (!room) return { ok: false, error: 'NOT_FOUND' };
    const color = room.reconnect(token, socketId);
    if (!color) return { ok: false, error: 'NOT_IN_ROOM' };
    this.socketToRoom.set(socketId, roomId);
    return { ok: true, room, color };
  }

  getBySocketId(socketId: string): Room | null {
    const id = this.socketToRoom.get(socketId);
    if (!id) return null;
    return this.rooms.get(id) ?? null;
  }

  get(roomId: string): Room | null {
    return this.rooms.get(roomId) ?? null;
  }

  /** Mark socket disconnect. Trả room nếu có. */
  disconnect(socketId: string): { room: Room; color: 'B' | 'W' } | null {
    const room = this.getBySocketId(socketId);
    if (!room) return null;
    const color = room.markDisconnect(socketId);
    this.socketToRoom.delete(socketId);
    if (!color) return null;
    return { room, color };
  }

  /**
   * Cleanup: xóa phòng waiting hết hạn + phòng có player disconnect quá TTL.
   * Trả các phòng đã bị "auto-forfeit" (1 bên timeout reconnect → bên kia thắng).
   */
  cleanup(now = Date.now()): { forfeited: { room: Room; loser: 'B' | 'W' }[] } {
    const forfeited: { room: Room; loser: 'B' | 'W' }[] = [];
    for (const [id, room] of this.rooms) {
      // Phòng waiting hết TTL không ai vào → xóa
      if (room.status === 'waiting' && now - room.createdAt > this.waitingTtlMs) {
        this.rooms.delete(id);
        continue;
      }
      // Trong ván: kiểm tra reconnect deadline
      if (room.status === 'playing') {
        for (const c of ['B', 'W'] as const) {
          const p = room.players[c];
          if (p?.disconnectedAt && now - p.disconnectedAt > this.reconnectTtlMs) {
            room.resign(c);
            forfeited.push({ room, loser: c });
          }
        }
      }
      // Phòng finished + không activity 5 phút → xóa
      if (room.status === 'finished' && now - room.lastActivityAt > 300_000) {
        this.rooms.delete(id);
      }
    }
    return { forfeited };
  }

  size(): number {
    return this.rooms.size;
  }

  /** Test helper: clear all rooms. */
  clear(): void {
    this.rooms.clear();
    this.socketToRoom.clear();
  }
}
