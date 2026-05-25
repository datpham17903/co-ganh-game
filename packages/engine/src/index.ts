/**
 * Public API engine cờ gánh.
 * Tham chiếu: RULES.md mục 7.2.
 */

export type {
  Capture,
  CaptureType,
  Cell,
  Color,
  DrawReason,
  GameState,
  GameStatus,
  Move,
} from './types.js';

export {
  BOARD_SIZE,
  MAX_NO_PROGRESS,
  PIECE_COUNT,
  REPETITION_LIMIT,
  TOTAL_CELLS,
  coord2index,
  createInitialBoard,
  hasDiagonal,
  index2coord,
  isInBounds,
} from './board.js';

export { ADJACENCY } from './adjacency.js';

export { getAllLegalMoves, getLegalMoves } from './moves.js';

export { processGanh, processVay } from './rules.js';
export type { GanhResult, VayResult } from './rules.js';

export { applyMove, createInitialState, getWinner, hashState, isGameOver } from './game.js';
