import { Room, type RoomOptions } from './Room.js';
import { generatePlayerToken, generateRoomCode, isValidRoomCode } from '../utils/codes.js';

export interface RoomManagerOptions {
  maxRooms?: number;
  /** TTL phòng waiting (default 10 phút). */
  waitingTtlMs?: number;
  /** Reconnect deadline (default 60s). */
  reconnectTtlMs?: number;
  rand?: () => number;
}

/** Brief info trả qua room:list — không leak password hash. */
export interface PublicRoomInfo {
  id: string;
  hostName: string;
  hasPassword: boolean;
  playerCount: number;
  createdAt: number;
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

  /** Tạo phòng mới với 1 player. */
  create(
    socketId: string,
    name: string,
    opts: RoomOptions = { isPublic: false },
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
    const room = new Room(id, opts);
    const token = generatePlayerToken(this.rand);
    room.addPlayer({ socketId, name, token });
    this.rooms.set(id, room);
    this.socketToRoom.set(socketId, id);
    return { room, color: 'B', token };
  }

  join(
    roomId: string,
    socketId: string,
    name: string,
    password?: string,
  ):
    | { ok: true; room: Room; color: 'B' | 'W'; token: string }
    | { ok: false; error: 'NOT_FOUND' | 'FULL' | 'INVALID_CODE' | 'WRONG_PASSWORD' } {
    if (!isValidRoomCode(roomId)) return { ok: false, error: 'INVALID_CODE' };
    const room = this.rooms.get(roomId);
    if (!room) return { ok: false, error: 'NOT_FOUND' };
    if (room.playerCount() >= 2) return { ok: false, error: 'FULL' };
    if (!room.verifyPassword(password)) return { ok: false, error: 'WRONG_PASSWORD' };
    const token = generatePlayerToken(this.rand);
    const color = room.addPlayer({ socketId, name, token });
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

  disconnect(socketId: string): { room: Room; color: 'B' | 'W' } | null {
    const room = this.getBySocketId(socketId);
    if (!room) return null;
    const color = room.markDisconnect(socketId);
    this.socketToRoom.delete(socketId);
    if (!color) return null;
    return { room, color };
  }

  /** Public list: chỉ phòng `isPublic`, status = 'waiting', còn slot. */
  listPublic(): PublicRoomInfo[] {
    const result: PublicRoomInfo[] = [];
    for (const room of this.rooms.values()) {
      if (!room.isPublic) continue;
      if (room.status !== 'waiting') continue;
      if (room.playerCount() >= 2) continue;
      const host = room.players.B ?? room.players.W;
      if (!host) continue;
      result.push({
        id: room.id,
        hostName: host.name,
        hasPassword: room.hasPassword(),
        playerCount: room.playerCount(),
        createdAt: room.createdAt,
      });
    }
    // Sắp xếp mới nhất lên đầu
    result.sort((a, b) => b.createdAt - a.createdAt);
    return result;
  }

  cleanup(now = Date.now()): {
    forfeited: { room: Room; loser: 'B' | 'W' }[];
    timedOut: { room: Room; loser: 'B' | 'W' }[];
  } {
    const forfeited: { room: Room; loser: 'B' | 'W' }[] = [];
    const timedOut: { room: Room; loser: 'B' | 'W' }[] = [];
    for (const [id, room] of this.rooms) {
      if (room.status === 'waiting' && now - room.createdAt > this.waitingTtlMs) {
        this.rooms.delete(id);
        continue;
      }
      if (room.status === 'playing') {
        // Check clock timeout TRƯỚC reconnect timeout (khả năng cao hơn).
        const lostByClock = room.checkClockTimeout(now);
        if (lostByClock) {
          timedOut.push({ room, loser: lostByClock });
          continue;
        }
        for (const c of ['B', 'W'] as const) {
          const p = room.players[c];
          if (p?.disconnectedAt && now - p.disconnectedAt > this.reconnectTtlMs) {
            room.resign(c);
            forfeited.push({ room, loser: c });
          }
        }
      }
      if (room.status === 'finished' && now - room.lastActivityAt > 300_000) {
        this.rooms.delete(id);
      }
    }
    return { forfeited, timedOut };
  }

  size(): number {
    return this.rooms.size;
  }

  /** Iterate qua các phòng đang chơi (cho clock broadcast). */
  forEachPlaying(cb: (room: Room) => void): void {
    for (const room of this.rooms.values()) {
      if (room.status === 'playing') cb(room);
    }
  }

  clear(): void {
    this.rooms.clear();
    this.socketToRoom.clear();
  }
}
