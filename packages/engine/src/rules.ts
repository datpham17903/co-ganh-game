/**
 * Xử lý luật GÁNH và VÂY.
 * Tham chiếu: RULES.md mục 3 (gánh) và mục 4 (vây).
 *
 * Nguyên tắc quan trọng:
 * - Chỉ quân vừa di chuyển (`movedTo`) mới kích hoạt gánh.
 * - KHÔNG có phản ứng dây chuyền: quân vừa đổi màu KHÔNG kích gánh tiếp (RULES.md 3.2).
 * - Vây áp dụng SAU gánh.
 * - Cả 2 hàm trả board MỚI (không mutate input).
 */

import { ADJACENCY } from './adjacency.js';
import { coord2index, hasDiagonal, index2coord, isInBounds, TOTAL_CELLS } from './board.js';
import type { Cell, Color } from './types.js';

/** 4 trục đối xứng đi qua M: ngang, dọc, chéo \, chéo /. */
const SYMMETRY_AXES: readonly [number, number][] = [
  [0, 1], // ngang
  [1, 0], // dọc
  [1, 1], // chéo \
  [1, -1], // chéo /
];

function opponent(color: Color): Color {
  return color === 'B' ? 'W' : 'B';
}

export interface GanhResult {
  board: Cell[];
  /** Index các quân bị đổi màu do gánh */
  captured: number[];
}

/**
 * Áp dụng luật GÁNH cho quân vừa di chuyển tới `movedTo` mang màu `color`.
 *
 * Với mỗi trục đối xứng đi qua M (chỉ xét chéo nếu điểm M có đường chéo),
 * nếu 2 ô đối xứng A và B đều mang quân đối phương thì cả 2 bị đổi màu.
 *
 * Không phản ứng dây chuyền: chỉ duyệt 1 lần các trục từ M.
 */
export function processGanh(board: Cell[], movedTo: number, color: Color): GanhResult {
  const next = board.slice();
  const captured: number[] = [];
  const [r, c] = index2coord(movedTo);
  const oppColor = opponent(color);
  const allowDiagonal = hasDiagonal(r, c);

  for (const [dr, dc] of SYMMETRY_AXES) {
    const isDiagonalAxis = dr !== 0 && dc !== 0;
    if (isDiagonalAxis && !allowDiagonal) continue;

    const ar = r - dr;
    const ac = c - dc;
    const br = r + dr;
    const bc = c + dc;
    if (!isInBounds(ar, ac) || !isInBounds(br, bc)) continue;

    const aIdx = coord2index(ar, ac);
    const bIdx = coord2index(br, bc);
    // Phải đọc từ board GỐC để tránh phản ứng dây chuyền: nếu ta vừa flip
    // tại trục trước, không cho ảnh hưởng trục sau.
    if (board[aIdx] === oppColor && board[bIdx] === oppColor) {
      next[aIdx] = color;
      next[bIdx] = color;
      captured.push(aIdx, bIdx);
    }
  }

  return { board: next, captured };
}

export interface VayResult {
  board: Cell[];
  /** Index các quân bị đổi màu do vây */
  captured: number[];
}

/**
 * Áp dụng luật VÂY: tìm các nhóm liên thông quân đối phương (đối với `byColor`).
 * Nhóm không còn ô kề trống nào → toàn bộ đổi sang `byColor`.
 *
 * Áp dụng cho cả nhóm 1 quân (RULES.md 4.3).
 */
export function processVay(board: Cell[], byColor: Color): VayResult {
  const oppColor = opponent(byColor);
  const next = board.slice();
  const captured: number[] = [];
  const visited = new Array<boolean>(TOTAL_CELLS).fill(false);

  for (let start = 0; start < TOTAL_CELLS; start++) {
    if (board[start] !== oppColor || visited[start]) continue;

    // BFS tìm nhóm liên thông + check còn lối thoát.
    const group: number[] = [];
    const queue: number[] = [start];
    visited[start] = true;
    let hasEscape = false;

    while (queue.length > 0) {
      const cur = queue.shift()!;
      group.push(cur);
      const neighbors = ADJACENCY[cur];
      if (!neighbors) continue;
      for (const nb of neighbors) {
        const cell = board[nb];
        if (cell === null) {
          hasEscape = true;
        } else if (cell === oppColor && !visited[nb]) {
          visited[nb] = true;
          queue.push(nb);
        }
      }
    }

    if (!hasEscape) {
      for (const idx of group) {
        next[idx] = byColor;
        captured.push(idx);
      }
    }
  }

  return { board: next, captured };
}
