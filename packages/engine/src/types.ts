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
  board: Cell[];
  turn: Color;
  moveHistory: Move[];
  capturedHistory: Capture[];
  status: GameStatus;
  drawReason?: DrawReason;
  noProgressCount: number;
}
