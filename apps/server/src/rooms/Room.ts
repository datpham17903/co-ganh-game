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

export type RoomStatus = 'waiting' | 'playing' | 'finished';

export interface PlayerInfo {
  socketId: string;
  name: string;
  token: string;
  joinedAt: number;
  disconnectedAt: number | null;
}

export type MoveResult =
  | { ok: true; state: GameState; captures: Capture[] }
  | {
      ok: false;
      error: 'NO_ROOM' | 'NOT_YOUR_TURN' | 'INVALID_MOVE' | 'GAME_OVER' | 'GAME_NOT_STARTED';
    };

export class Room {
  status: RoomStatus = 'waiting';
  players: { B: PlayerInfo | null; W: PlayerInfo | null } = { B: null, W: null };
  state: GameState = createInitialState();
  createdAt: number = Date.now();
  lastActivityAt: number = Date.now();
  rematchRequested: { B: boolean; W: boolean } = { B: false, W: false };

  constructor(public id: string) {}

  /** Số người chơi đang ngồi (đã có color), không phụ thuộc connection state. */
  playerCount(): number {
    return (this.players.B ? 1 : 0) + (this.players.W ? 1 : 0);
  }

  /** Tìm color của socket. */
  colorOfSocket(socketId: string): Color | null {
    if (this.players.B?.socketId === socketId) return 'B';
    if (this.players.W?.socketId === socketId) return 'W';
    return null;
  }

  /** Tìm player theo token. */
  playerByToken(token: string): { color: Color; player: PlayerInfo } | null {
    if (this.players.B?.token === token) return { color: 'B', player: this.players.B };
    if (this.players.W?.token === token) return { color: 'W', player: this.players.W };
    return null;
  }

  /**
   * Thêm player. Color: lần đầu = B, lần 2 = W. Throw nếu đã đầy.
   */
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
      return 'W';
    }
    throw new Error('Room is full');
  }

  /** Đánh dấu disconnect. KHÔNG xóa player ngay, để cho reconnect 60s. */
  markDisconnect(socketId: string): Color | null {
    const color = this.colorOfSocket(socketId);
    if (!color) return null;
    const player = this.players[color];
    if (!player) return null;
    player.disconnectedAt = Date.now();
    this.lastActivityAt = Date.now();
    return color;
  }

  /** Reconnect bằng token. Cập nhật socketId. */
  reconnect(token: string, newSocketId: string): Color | null {
    const found = this.playerByToken(token);
    if (!found) return null;
    found.player.socketId = newSocketId;
    found.player.disconnectedAt = null;
    this.lastActivityAt = Date.now();
    return found.color;
  }

  /** Gỡ hẳn player (đầu hàng/timeout). */
  removePlayer(color: Color): void {
    this.players[color] = null;
    this.lastActivityAt = Date.now();
  }

  /**
   * Validate + apply nước đi của socket. Server-side anti-cheat.
   */
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
    if (isGameOver(next)) this.status = 'finished';
    return { ok: true, state: next, captures };
  }

  /** Đầu hàng: bên còn lại thắng. */
  resign(color: Color): void {
    this.status = 'finished';
    this.lastActivityAt = Date.now();
    this.state = {
      ...this.state,
      status: color === 'B' ? 'W_won' : 'B_won',
    };
  }

  /** Reset cho rematch. */
  reset(): void {
    this.state = createInitialState();
    this.status = 'playing';
    this.rematchRequested = { B: false, W: false };
    this.lastActivityAt = Date.now();
  }
}
