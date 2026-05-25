/**
 * Bàn cờ + helper tọa độ.
 * Tham chiếu: RULES.md mục 1.
 */

import type { Cell } from './types.js';

/** Cạnh bàn cờ (5 điểm/cạnh). */
export const BOARD_SIZE = 5;

/** Tổng số điểm trên bàn. */
export const TOTAL_CELLS = BOARD_SIZE * BOARD_SIZE;

/** Số quân mỗi bên ban đầu. */
export const PIECE_COUNT = 8;

/** Số nước liên tiếp không có gánh/vây tối đa trước khi hòa (RULES.md 6.2). */
export const MAX_NO_PROGRESS = 50;

/** Số lần lặp thế cờ trước khi hòa (RULES.md 6.2). */
export const REPETITION_LIMIT = 3;

/**
 * Tạo bàn cờ ban đầu (RULES.md 1.3).
 *
 * Layout: quân nằm ở rìa bàn, chia đôi theo đường chéo phụ.
 * ```
 * Row 0: B B B B B
 * Row 1: B . . . B
 * Row 2: W . . . B
 * Row 3: W . . . W
 * Row 4: W W W W W
 * ```
 * Tổng: 8 đen + 8 trắng + 9 trống = 25.
 */
export function createInitialBoard(): Cell[] {
  const board: Cell[] = new Array<Cell>(TOTAL_CELLS).fill(null);
  // Hàng 0: toàn ĐEN
  for (let c = 0; c < BOARD_SIZE; c++) {
    board[coord2index(0, c)] = 'B';
  }
  // Hàng 4: toàn TRẮNG
  for (let c = 0; c < BOARD_SIZE; c++) {
    board[coord2index(4, c)] = 'W';
  }
  // Hàng 1: ĐEN ở 2 cột rìa
  board[coord2index(1, 0)] = 'B';
  board[coord2index(1, 4)] = 'B';
  // Hàng 3: TRẮNG ở 2 cột rìa
  board[coord2index(3, 0)] = 'W';
  board[coord2index(3, 4)] = 'W';
  // Hàng 2: chia đôi theo đường chéo phụ
  board[coord2index(2, 0)] = 'W';
  board[coord2index(2, 4)] = 'B';
  return board;
}

/** Chuyển index 0..24 thành (row, col). */
export function index2coord(index: number): readonly [number, number] {
  return [Math.floor(index / BOARD_SIZE), index % BOARD_SIZE] as const;
}

/** Chuyển (row, col) thành index 0..24. */
export function coord2index(row: number, col: number): number {
  return row * BOARD_SIZE + col;
}

/** Kiểm tra (row, col) nằm trong bàn. */
export function isInBounds(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

/**
 * Điểm có đường chéo nếu (r + c) chẵn (RULES.md 1.2).
 */
export function hasDiagonal(row: number, col: number): boolean {
  return (row + col) % 2 === 0;
}
