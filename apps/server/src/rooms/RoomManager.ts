import { Room, type RoomOptions } from './Room.js';
import { generatePlayerToken, generateRoomCode, isValidRoomCode } from '../utils/codes.js';

export interface RoomManagerOptions {
  maxRooms?: number;
  waitingTtlMs?: number;
  reconnectTtlMs?: number;
  rand?: () => number;
}

/** Brief info trả qua room:list. Không leak password hash. */
export interface PublicRoomInfo {
  id: string;
  /** Tên phòng do người tạo đặt; rỗng nếu không. */
  name: string;
  hostName: string;
  hasPassword: boolean;
  playerCount: number;
  spectatorCount: number;
  status: 'waiting' | 'playing';
  createdAt: number;
}

export interface ListPublicQuery {
  /** Search trong name + hostName + id (case-insensitive). */
  search?: string;
  /** Chỉ phòng đang chờ (default true). */
  waitingOnly?: boolean;
  /** Cho phép spectate (default true → bao gồm cả status='playing'). */
  includeSpectatable?: boolean;
  limit?: number;
  offset?: number;
}

export interface ListPublicResult {
  rooms: PublicRoomInfo[];
  total: number;
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

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

  create(
    socketId: string,
    name: string,
    opts: RoomOptions = { isPublic: false },
  ): { room: Room; color: 'B'; token: string } {
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

  /**
   * Spectate: khán giả vào phòng public xem trận. Không cần password (để mọi
   * người xem được). Không nhận được màu, không có token reconnect.
   */
  spectate(
    roomId: string,
    socketId: string,
    name: string,
  ):
    | { ok: true; room: Room }
    | { ok: false; error: 'NOT_FOUND' | 'NOT_PUBLIC' | 'SPECTATORS_FULL' | 'ALREADY_PLAYER' } {
    const room = this.rooms.get(roomId);
    if (!room) return { ok: false, error: 'NOT_FOUND' };
    if (!room.isPublic) return { ok: false, error: 'NOT_PUBLIC' };
    try {
      room.addSpectator(socketId, name);
      this.socketToRoom.set(socketId, roomId);
      return { ok: true, room };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'ERROR';
      if (msg === 'SPECTATORS_FULL') return { ok: false, error: 'SPECTATORS_FULL' };
      if (msg === 'ALREADY_PLAYER') return { ok: false, error: 'ALREADY_PLAYER' };
      return { ok: false, error: 'NOT_FOUND' };
    }
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

  /** Xóa phòng + clean tất cả socketToRoom mapping liên quan. */
  removeRoom(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    for (const c of ['B', 'W'] as const) {
      const p = room.players[c];
      if (p) this.socketToRoom.delete(p.socketId);
    }
    for (const sp of room.spectators) {
      this.socketToRoom.delete(sp.socketId);
    }
    this.rooms.delete(roomId);
  }

  /**
   * Disconnect handler. Trả info về role đã disconnect:
   * - player: trả color (markDisconnect, không xóa ngay).
   * - spectator: xóa khỏi spectators list.
   * - none: trả null.
   */
  disconnect(
    socketId: string,
  ): { room: Room; role: 'player'; color: 'B' | 'W' } | { room: Room; role: 'spectator' } | null {
    const room = this.getBySocketId(socketId);
    if (!room) return null;
    const color = room.colorOfSocket(socketId);
    if (color) {
      room.markDisconnect(socketId);
      this.socketToRoom.delete(socketId);
      return { room, role: 'player', color };
    }
    if (room.spectatorIndex(socketId) >= 0) {
      room.removeSpectator(socketId);
      this.socketToRoom.delete(socketId);
      return { room, role: 'spectator' };
    }
    this.socketToRoom.delete(socketId);
    return null;
  }

  /**
   * Public list với filter + pagination. Phòng đầy/finished bị loại.
   * Mặc định: bao gồm cả phòng đang chơi (để có thể spectate).
   */
  listPublic(query: ListPublicQuery = {}): ListPublicResult {
    const search = (query.search ?? '').trim().toLowerCase();
    const limit = Math.min(MAX_LIMIT, Math.max(1, query.limit ?? DEFAULT_LIMIT));
    const offset = Math.max(0, query.offset ?? 0);
    const includeSpectatable = query.includeSpectatable !== false;
    const waitingOnly = query.waitingOnly === true;

    // Filter pass — không sort hết tất cả nếu chỉ cần page nhỏ.
    const matched: PublicRoomInfo[] = [];
    for (const room of this.rooms.values()) {
      if (!room.isPublic) continue;
      if (room.status === 'finished') continue;
      if (waitingOnly && room.status !== 'waiting') continue;
      if (room.status === 'playing' && !includeSpectatable) continue;
      // Phòng waiting full (không thể) hoặc playing đầy không cần loại — vẫn cho spectate.
      const host = room.players.B ?? room.players.W;
      if (!host) continue;
      if (search) {
        const idLow = room.id.toLowerCase();
        const nameLow = room.name.toLowerCase();
        const hostLow = host.name.toLowerCase();
        const wL = room.players.W?.name.toLowerCase() ?? '';
        if (
          !idLow.includes(search) &&
          !nameLow.includes(search) &&
          !hostLow.includes(search) &&
          !wL.includes(search)
        ) {
          continue;
        }
      }
      matched.push({
        id: room.id,
        name: room.name,
        hostName: host.name,
        hasPassword: room.hasPassword(),
        playerCount: room.playerCount(),
        spectatorCount: room.spectatorCount(),
        status: room.status === 'waiting' ? 'waiting' : 'playing',
        createdAt: room.createdAt,
      });
    }
    matched.sort((a, b) => b.createdAt - a.createdAt);
    const total = matched.length;
    const page = matched.slice(offset, offset + limit);
    return { rooms: page, total };
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
