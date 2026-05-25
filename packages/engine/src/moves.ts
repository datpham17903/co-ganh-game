/**
 * Sinh nước đi hợp lệ.
 * Tham chiếu: RULES.md mục 2.
 *
 * Quy ước:
 * - Một nước đi là di chuyển 1 quân sang điểm trống KỀ theo đường nối.
 * - Không có nhảy, không có ăn quân.
 * - `getAllLegalMoves` trả về nước đi của `color` truyền vào, BẤT KỂ lượt hiện tại.
 *   Nếu không truyền `color`, dùng `state.turn`. Bot/UI cần biết phương án đối phương
 *   nên hàm này cần linh hoạt. Khi `state.status !== 'playing'` luôn trả mảng rỗng.
 */

import { ADJACENCY } from './adjacency.js';
import { TOTAL_CELLS } from './board.js';
import type { Color, GameState, Move } from './types.js';

/**
 * Trả về danh sách index các điểm trống kề mà quân tại `from` có thể đi tới.
 * Nếu `from` không có quân, hoặc index không hợp lệ, trả về mảng rỗng.
 *
 * Lưu ý: hàm KHÔNG kiểm tra lượt đi — đây là sinh nước hình học. Validate
 * "đúng lượt" thuộc về `applyMove` / server.
 */
export function getLegalMoves(state: GameState, from: number): number[] {
  if (from < 0 || from >= TOTAL_CELLS) return [];
  const piece = state.board[from];
  if (piece === null || piece === undefined) return [];
  const neighbors = ADJACENCY[from];
  if (!neighbors) return [];
  const result: number[] = [];
  for (const to of neighbors) {
    if (state.board[to] === null) {
      result.push(to);
    }
  }
  return result;
}

/**
 * Trả về tất cả nước đi hợp lệ cho `color` (mặc định = state.turn).
 * Trả mảng rỗng nếu ván đã kết thúc.
 */
export function getAllLegalMoves(state: GameState, color?: Color): Move[] {
  if (state.status !== 'playing') return [];
  const moveColor: Color = color ?? state.turn;
  const moves: Move[] = [];
  for (let from = 0; from < TOTAL_CELLS; from++) {
    if (state.board[from] !== moveColor) continue;
    const tos = getLegalMoves(state, from);
    for (const to of tos) {
      moves.push({ from, to, color: moveColor });
    }
  }
  return moves;
}
