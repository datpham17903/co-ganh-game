import {
  applyMove,
  createInitialState,
  getAllLegalMoves,
  isGameOver,
  type Capture,
  type Color,
  type GameState,
  type Move,
} from '@co-ganh/engine';
import { createHash } from 'node:crypto';

export type RoomStatus = 'waiting' | 'playing' | 'finished';

export interface PlayerInfo {
  socketId: string;
  name: string;
  token: string;
  joinedAt: number;
  disconnectedAt: number | null;
}

export interface SpectatorInfo {
  socketId: string;
  name: string;
  joinedAt: number;
}

export interface ChatMessage {
  id: number;
  /** 'B' | 'W' khi từ player; 'spectator' từ khán giả; 'system' cho thông báo. */
  from: Color | 'spectator' | 'system';
  name: string;
  text: string;
  at: number;
}

export type MoveResult =
  | { ok: true; state: GameState; captures: Capture[] }
  | {
      ok: false;
      error: 'NO_ROOM' | 'NOT_YOUR_TURN' | 'INVALID_MOVE' | 'GAME_OVER' | 'GAME_NOT_STARTED';
    };

export interface RoomOptions {
  isPublic: boolean;
  /** Plain text password — sẽ hash bằng SHA-256. Trống = không pw. */
  password?: string;
  /** Initial clock time per player, milliseconds. Default 10 phút. */
  initialClockMs?: number;
  /** Tên hiển thị của phòng (max 30 char). Trống → dùng id làm fallback ở client. */
  name?: string;
}

export interface ClockState {
  remainingMs: { B: number; W: number };
  turnStartedAt: number | null;
}

const DEFAULT_CLOCK_MS = 10 * 60 * 1000;
/** Max spectators per room — chống spam scale. */
export const MAX_SPECTATORS = 50;
/** Max length của room name. */
export const ROOM_NAME_MAX = 30;

export class Room {
  status: RoomStatus = 'waiting';
  players: { B: PlayerInfo | null; W: PlayerInfo | null } = { B: null, W: null };
  state: GameState = createInitialState();
  createdAt: number = Date.now();
  lastActivityAt: number = Date.now();
  rematchRequested: { B: boolean; W: boolean } = { B: false, W: false };

  passwordHash: string | null = null;
  isPublic = false;
  /** Tên phòng do người tạo đặt. Empty string nếu không. */
  name = '';
  chat: ChatMessage[] = [];
  private chatNextId = 1;

  /** Khán giả đang xem trận. Không tham gia chơi, không tính color. */
  spectators: SpectatorInfo[] = [];

  clock: ClockState;
  private initialClockMs: number;

  constructor(
    public id: string,
    opts: RoomOptions = { isPublic: false },
  ) {
    this.isPublic = opts.isPublic;
    if (opts.password && opts.password.length > 0) {
      this.passwordHash = sha256(opts.password);
    }
    this.name = (opts.name ?? '').trim().slice(0, ROOM_NAME_MAX);
    this.initialClockMs = opts.initialClockMs ?? DEFAULT_CLOCK_MS;
    this.clock = {
      remainingMs: { B: this.initialClockMs, W: this.initialClockMs },
      turnStartedAt: null,
    };
  }

  hasPassword(): boolean {
    return this.passwordHash !== null;
  }

  verifyPassword(plain: string | undefined): boolean {
    if (!this.passwordHash) return true;
    if (!plain) return false;
    return sha256(plain) === this.passwordHash;
  }

  playerCount(): number {
    return (this.players.B ? 1 : 0) + (this.players.W ? 1 : 0);
  }

  spectatorCount(): number {
    return this.spectators.length;
  }

  colorOfSocket(socketId: string): Color | null {
    if (this.players.B?.socketId === socketId) return 'B';
    if (this.players.W?.socketId === socketId) return 'W';
    return null;
  }

  spectatorIndex(socketId: string): number {
    return this.spectators.findIndex((s) => s.socketId === socketId);
  }

  playerByToken(token: string): { color: Color; player: PlayerInfo } | null {
    if (this.players.B?.token === token) return { color: 'B', player: this.players.B };
    if (this.players.W?.token === token) return { color: 'W', player: this.players.W };
    return null;
  }

  addPlayer(player: Omit<PlayerInfo, 'joinedAt' | 'disconnectedAt'>): Color {
    const info: PlayerInfo = {
      ...player,
      joinedAt: Date.now(),
      disconnectedAt: null,
    };
    if (!this.players.B) {
      this.players.B = info;
      this.lastActivityAt = Date.now();
      return 'B';
    }
    if (!this.players.W) {
      this.players.W = info;
      this.status = 'playing';
      this.lastActivityAt = Date.now();
      // Clock chỉ bắt đầu khi Đen đi nước đầu tiên (xem applyMoveBy).
      this.clock.turnStartedAt = null;
      return 'W';
    }
    throw new Error('Room is full');
  }

  /**
   * Thêm spectator. Throw nếu full hoặc đã là player/spectator của phòng.
   */
  addSpectator(socketId: string, name: string): SpectatorInfo {
    if (this.spectators.length >= MAX_SPECTATORS) {
      throw new Error('SPECTATORS_FULL');
    }
    if (this.colorOfSocket(socketId)) throw new Error('ALREADY_PLAYER');
    if (this.spectatorIndex(socketId) >= 0) throw new Error('ALREADY_SPECTATOR');
    const info: SpectatorInfo = { socketId, name, joinedAt: Date.now() };
    this.spectators.push(info);
    this.lastActivityAt = Date.now();
    return info;
  }

  removeSpectator(socketId: string): SpectatorInfo | null {
    const idx = this.spectatorIndex(socketId);
    if (idx < 0) return null;
    const removed = this.spectators[idx];
    this.spectators.splice(idx, 1);
    this.lastActivityAt = Date.now();
    return removed ?? null;
  }

  markDisconnect(socketId: string): Color | null {
    const color = this.colorOfSocket(socketId);
    if (!color) return null;
    const player = this.players[color];
    if (!player) return null;
    player.disconnectedAt = Date.now();
    this.lastActivityAt = Date.now();
    return color;
  }

  reconnect(token: string, newSocketId: string): Color | null {
    const found = this.playerByToken(token);
    if (!found) return null;
    found.player.socketId = newSocketId;
    found.player.disconnectedAt = null;
    this.lastActivityAt = Date.now();
    return found.color;
  }

  removePlayer(color: Color): void {
    this.players[color] = null;
    this.lastActivityAt = Date.now();
  }

  applyMoveBy(socketId: string, partial: { from: number; to: number }): MoveResult {
    if (this.status === 'finished') return { ok: false, error: 'GAME_OVER' };
    if (this.status !== 'playing') return { ok: false, error: 'GAME_NOT_STARTED' };

    const color = this.colorOfSocket(socketId);
    if (!color) return { ok: false, error: 'NO_ROOM' };
    if (this.state.turn !== color) return { ok: false, error: 'NOT_YOUR_TURN' };

    const legal = getAllLegalMoves(this.state, color);
    const matched = legal.find((m) => m.from === partial.from && m.to === partial.to);
    if (!matched) return { ok: false, error: 'INVALID_MOVE' };

    const move: Move = matched;
    const before = this.state;
    const next = applyMove(before, move);
    const captures: Capture[] = next.capturedHistory.filter(
      (h) => h.byMove === next.moveHistory.length,
    );
    this.state = next;
    this.lastActivityAt = Date.now();

    this.consumeClock(color);
    if (isGameOver(next)) {
      this.status = 'finished';
      this.clock.turnStartedAt = null;
    }
    return { ok: true, state: next, captures };
  }

  private consumeClock(color: Color, now = Date.now()): void {
    if (this.clock.turnStartedAt !== null) {
      const used = now - this.clock.turnStartedAt;
      this.clock.remainingMs[color] = Math.max(0, this.clock.remainingMs[color] - used);
    }
    this.clock.turnStartedAt = now;
  }

  clockSnapshot(now = Date.now()): { B: number; W: number; turn: Color | null } {
    const snap = { ...this.clock.remainingMs };
    if (this.status === 'playing' && this.clock.turnStartedAt !== null) {
      const used = now - this.clock.turnStartedAt;
      const cur = this.state.turn;
      snap[cur] = Math.max(0, snap[cur] - used);
    }
    // turn=null nếu clock chưa bắt đầu — client không countdown khi đang
    // chờ Đen đi nước đầu tiên hay khi game đã kết thúc.
    const turn =
      this.status === 'playing' && this.clock.turnStartedAt !== null ? this.state.turn : null;
    return {
      B: snap.B,
      W: snap.W,
      turn,
    };
  }

  checkClockTimeout(now = Date.now()): Color | null {
    if (this.status !== 'playing' || this.clock.turnStartedAt === null) return null;
    const turn = this.state.turn;
    const used = now - this.clock.turnStartedAt;
    const remaining = this.clock.remainingMs[turn] - used;
    if (remaining <= 0) {
      this.clock.remainingMs[turn] = 0;
      this.clock.turnStartedAt = null;
      this.status = 'finished';
      this.state = {
        ...this.state,
        status: turn === 'B' ? 'W_won' : 'B_won',
      };
      this.lastActivityAt = now;
      return turn;
    }
    return null;
  }

  resign(color: Color): void {
    this.status = 'finished';
    this.lastActivityAt = Date.now();
    this.clock.turnStartedAt = null;
    this.state = {
      ...this.state,
      status: color === 'B' ? 'W_won' : 'B_won',
    };
  }

  reset(): void {
    this.state = createInitialState();
    this.status = 'playing';
    this.rematchRequested = { B: false, W: false };
    this.lastActivityAt = Date.now();
    this.clock = {
      remainingMs: { B: this.initialClockMs, W: this.initialClockMs },
      // Chờ B đi nước đầu của ván mới mới start clock — consistent với init.
      turnStartedAt: null,
    };
  }

  pushChat(from: Color | 'spectator' | 'system', name: string, text: string): ChatMessage | null {
    const trimmed = (text ?? '').trim();
    if (trimmed.length === 0 || trimmed.length > 200) return null;
    const msg: ChatMessage = {
      id: this.chatNextId++,
      from,
      name,
      text: trimmed,
      at: Date.now(),
    };
    this.chat.push(msg);
    if (this.chat.length > 100) {
      this.chat.shift();
    }
    this.lastActivityAt = Date.now();
    return msg;
  }
}

function sha256(s: string): string {
  return createHash('sha256').update(s, 'utf8').digest('hex');
}
