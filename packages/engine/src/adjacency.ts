/**
 * Bảng kề precomputed cho 25 điểm.
 * Tham chiếu: RULES.md mục 1.2.
 *
 * - Đường ngang/dọc luôn có giữa các điểm kề.
 * - Đường chéo CHỈ có khi điểm hiện tại có đường chéo (hasDiagonal) VÀ
 *   điểm kề chéo cũng có đường chéo. Điều kiện 2 luôn đúng vì
 *   (r+c) chẵn ⇔ (r±1+c±1) chẵn, nên đủ check 1 đầu.
 */

import { BOARD_SIZE, coord2index, hasDiagonal, isInBounds, TOTAL_CELLS } from './board.js';

/** 4 hướng ngang/dọc */
const ORTHOGONAL_OFFSETS: readonly [number, number][] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

/** 4 hướng chéo */
const DIAGONAL_OFFSETS: readonly [number, number][] = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
];

function buildAdjacency(): readonly (readonly number[])[] {
  const adj: number[][] = Array.from({ length: TOTAL_CELLS }, () => []);
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const i = coord2index(r, c);
      // Ngang/dọc
      for (const [dr, dc] of ORTHOGONAL_OFFSETS) {
        const nr = r + dr;
        const nc = c + dc;
        if (isInBounds(nr, nc)) {
          adj[i]!.push(coord2index(nr, nc));
        }
      }
      // Chéo: chỉ điểm có (r+c) chẵn
      if (hasDiagonal(r, c)) {
        for (const [dr, dc] of DIAGONAL_OFFSETS) {
          const nr = r + dr;
          const nc = c + dc;
          if (isInBounds(nr, nc)) {
            adj[i]!.push(coord2index(nr, nc));
          }
        }
      }
    }
  }
  // Sort để output deterministic, dễ test/snapshot.
  for (const list of adj) {
    list.sort((a, b) => a - b);
  }
  return adj.map((list) => Object.freeze([...list])) as readonly (readonly number[])[];
}

/**
 * Mảng kề bất biến: ADJACENCY[i] = các index kề với i.
 * Tính chất:
 * - Đối xứng: j ∈ ADJACENCY[i] ⇔ i ∈ ADJACENCY[j].
 * - Không chứa chính nó.
 */
export const ADJACENCY: readonly (readonly number[])[] = buildAdjacency();
