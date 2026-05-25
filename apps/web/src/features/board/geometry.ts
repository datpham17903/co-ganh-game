import { ADJACENCY, BOARD_SIZE, hasDiagonal, index2coord } from '@co-ganh/engine';

export const SVG_SIZE = 500;
export const SVG_PADDING = 40;
export const STEP = (SVG_SIZE - 2 * SVG_PADDING) / (BOARD_SIZE - 1);
export const PIECE_RADIUS = 22;
/** Vòng highlight nước đi hợp lệ — to để mobile dễ tap (tap target ~44px). */
export const HIGHLIGHT_RADIUS = 18;

/** Toạ độ pixel của 1 điểm theo index. */
export function pointXY(index: number): { x: number; y: number } {
  const [r, c] = index2coord(index);
  return {
    x: SVG_PADDING + c * STEP,
    y: SVG_PADDING + r * STEP,
  };
}

export interface Edge {
  a: number;
  b: number;
}

/**
 * Sinh tất cả edges duy nhất từ ADJACENCY. Chỉ giữ pair (a, b) với a < b
 * để không vẽ trùng.
 */
export function computeEdges(): readonly Edge[] {
  const edges: Edge[] = [];
  for (let i = 0; i < ADJACENCY.length; i++) {
    const neighbors = ADJACENCY[i];
    if (!neighbors) continue;
    for (const j of neighbors) {
      if (i < j) edges.push({ a: i, b: j });
    }
  }
  return edges;
}

/**
 * Phân biệt edge thẳng (ngang/dọc) và edge chéo để render khác style.
 */
export function isDiagonalEdge(a: number, b: number): boolean {
  const [ra, ca] = index2coord(a);
  const [rb, cb] = index2coord(b);
  if (ra === rb || ca === cb) return false;
  // Đường chéo: phải có hasDiagonal ở 1 trong 2 đầu (cả 2 đều có thực ra,
  // vì ADJACENCY tôn trọng luật chéo).
  return hasDiagonal(ra, ca) || hasDiagonal(rb, cb);
}
