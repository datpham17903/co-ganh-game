/**
 * Vòng lặp ván cờ + kiểm tra kết thúc.
 * Tham chiếu: RULES.md mục 2, 6, 7.2.
 */

import { ADJACENCY } from './adjacency.js';
import { createInitialBoard, MAX_NO_PROGRESS, REPETITION_LIMIT, TOTAL_CELLS } from './board.js';
import { getAllLegalMoves } from './moves.js';
import { processGanh, processVay } from './rules.js';
import type { Capture, Cell, Color, GameState, Move } from './types.js';

/**
 * Tạo trạng thái khởi đầu (RULES.md 1.3).
 * Đen đi trước, positionHistory lưu hash thế đầu để check lặp.
 */
export function createInitialState(): GameState {
  const board = createInitialBoard();
  const initial: GameState = {
    board,
    turn: 'B',
    moveHistory: [],
    capturedHistory: [],
    positionHistory: [],
    status: 'playing',
    noProgressCount: 0,
  };
  return { ...initial, positionHistory: [hashState(initial)] };
}

/**
 * Áp dụng 1 nước đi. Immutable — state đầu vào không bị mutate.
 *
 * Pipeline:
 *  1. Validate (status, lượt, từ/đến hợp lệ, kề nhau).
 *  2. Di chuyển quân.
 *  3. Xử lý GÁNH.
 *  4. Xử lý VÂY (sau gánh).
 *  5. Cập nhật noProgressCount, lịch sử.
 *  6. Kiểm tra kết thúc ván.
 */
export function applyMove(state: GameState, move: Move): GameState {
  validateMove(state, move);

  // 1. Di chuyển quân.
  let board: Cell[] = state.board.slice();
  board[move.from] = null;
  board[move.to] = move.color;

  // 2. Gánh.
  const ganhResult = processGanh(board, move.to, move.color);
  board = ganhResult.board;

  // 3. Vây.
  const vayResult = processVay(board, move.color);
  board = vayResult.board;

  const moveNumber = state.moveHistory.length + 1;
  const capturedHistory: Capture[] = [...state.capturedHistory];
  if (ganhResult.captured.length > 0) {
    capturedHistory.push({
      type: 'ganh',
      positions: [...ganhResult.captured],
      byMove: moveNumber,
    });
  }
  if (vayResult.captured.length > 0) {
    capturedHistory.push({
      type: 'vay',
      positions: [...vayResult.captured],
      byMove: moveNumber,
    });
  }

  const hadCapture = ganhResult.captured.length > 0 || vayResult.captured.length > 0;
  const noProgressCount = hadCapture ? 0 : state.noProgressCount + 1;
  const nextTurn: Color = move.color === 'B' ? 'W' : 'B';

  let next: GameState = {
    board,
    turn: nextTurn,
    moveHistory: [...state.moveHistory, move],
    capturedHistory,
    positionHistory: state.positionHistory,
    status: 'playing',
    noProgressCount,
  };
  const newHash = hashState(next);
  next = { ...next, positionHistory: [...state.positionHistory, newHash] };

  // 4. Kiểm tra kết thúc.
  return finalizeStatus(next, newHash);
}

/**
 * Áp các điều kiện kết thúc ván theo thứ tự ưu tiên (RULES.md 6):
 *  1. Một bên = 0 quân → bên đó thua.
 *  2. Lặp thế cờ ≥ 3 lần → hòa.
 *  3. ≥ 50 nước không gánh/vây → hòa.
 *  4. Bên đang đi không còn nước hợp lệ → hòa.
 */
function finalizeStatus(next: GameState, currentHash: string): GameState {
  let bCount = 0;
  let wCount = 0;
  for (const cell of next.board) {
    if (cell === 'B') bCount++;
    else if (cell === 'W') wCount++;
  }
  if (bCount === 0) {
    return { ...next, status: 'W_won' };
  }
  if (wCount === 0) {
    return { ...next, status: 'B_won' };
  }

  let repeatCount = 0;
  for (const h of next.positionHistory) {
    if (h === currentHash) repeatCount++;
  }
  if (repeatCount >= REPETITION_LIMIT) {
    return { ...next, status: 'draw', drawReason: 'repetition' };
  }

  if (next.noProgressCount >= MAX_NO_PROGRESS) {
    return { ...next, status: 'draw', drawReason: '50_moves' };
  }

  // getAllLegalMoves trả rỗng nếu status !== 'playing'; ta đang ở 'playing' nên OK.
  // Lưu ý: nhánh này hiếm khi reach qua applyMove vì luật VÂY đã bắt mọi nhóm
  // không còn lối thoát → bên đó đã có quân = 0 → trigger thắng/thua trước.
  // Giữ làm guard phòng thủ theo quy ước RULES.md 6.2.
  /* c8 ignore start */
  if (getAllLegalMoves(next, next.turn).length === 0) {
    return { ...next, status: 'draw', drawReason: 'no_moves' };
  }
  /* c8 ignore stop */

  return next;
}

/** Validate cú pháp + ngữ cảnh nước đi. Throw nếu sai. */
function validateMove(state: GameState, move: Move): void {
  if (state.status !== 'playing') {
    throw new Error('applyMove: game is already over');
  }
  if (move.color !== state.turn) {
    throw new Error(`applyMove: not ${move.color}'s turn (current=${state.turn})`);
  }
  if (move.from < 0 || move.from >= TOTAL_CELLS) {
    throw new Error(`applyMove: from index out of range (${move.from})`);
  }
  if (move.to < 0 || move.to >= TOTAL_CELLS) {
    throw new Error(`applyMove: to index out of range (${move.to})`);
  }
  if (state.board[move.from] !== move.color) {
    throw new Error('applyMove: from cell does not contain a piece of this color');
  }
  if (state.board[move.to] !== null) {
    throw new Error('applyMove: to cell is not empty');
  }
  const neighbors = ADJACENCY[move.from];
  if (!neighbors || !neighbors.includes(move.to)) {
    throw new Error('applyMove: to is not adjacent to from');
  }
}

/** Ván đã kết thúc? */
export function isGameOver(state: GameState): boolean {
  return state.status !== 'playing';
}

/**
 * Người thắng:
 *  - 'B' / 'W' nếu một bên thắng,
 *  - 'draw' nếu hòa,
 *  - null nếu đang chơi.
 */
export function getWinner(state: GameState): Color | 'draw' | null {
  if (state.status === 'B_won') return 'B';
  if (state.status === 'W_won') return 'W';
  if (state.status === 'draw') return 'draw';
  return null;
}

/**
 * Hash trạng thái: chuỗi 25 ký tự bàn cờ + lượt.
 * Deterministic — cùng state cho cùng hash. Dùng để check lặp 3 lần.
 */
export function hashState(state: GameState): string {
  let s = '';
  for (let i = 0; i < TOTAL_CELLS; i++) {
    const c = state.board[i];
    s += c === null || c === undefined ? '.' : c;
  }
  return `${s}|${state.turn}`;
}
