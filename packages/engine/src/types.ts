/**
 * Types cho engine cờ gánh.
 * Tham chiếu: RULES.md mục 7.1
 */

export type Color = 'B' | 'W';

export type Cell = Color | null;

export type GameStatus = 'playing' | 'B_won' | 'W_won' | 'draw';

export type DrawReason = 'repetition' | 'no_moves' | '50_moves';

export interface Move {
  from: number;
  to: number;
  color: Color;
}

export type CaptureType = 'ganh' | 'vay';

export interface Capture {
  type: CaptureType;
  positions: number[];
  byMove: number;
}

export interface GameState {
  /** 25 ô, index = row * 5 + col */
  board: Cell[];
  /** Lượt hiện tại (bên đang đi) */
  turn: Color;
  /** Lịch sử các nước đã đi */
  moveHistory: Move[];
  /** Log gánh/vây để replay/animation */
  capturedHistory: Capture[];
  /**
   * Hash của các thế cờ đã từng xuất hiện (gồm cả thế đầu).
   * Dùng cho luật lặp 3 lần (RULES.md 6.2).
   */
  positionHistory: string[];
  status: GameStatus;
  drawReason?: DrawReason;
  /** Đếm số nước liên tiếp không có gánh/vây (RULES.md 6.2) */
  noProgressCount: number;
}
