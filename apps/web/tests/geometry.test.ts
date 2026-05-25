import { describe, it, expect } from 'vitest';
import { computeEdges, isDiagonalEdge, pointXY } from '../src/features/board/geometry.js';
import { coord2index } from '@co-ganh/engine';

describe('board geometry', () => {
  it('pointXY (0,0) ở góc trên trái padding', () => {
    const p = pointXY(coord2index(0, 0));
    expect(p.x).toBe(40);
    expect(p.y).toBe(40);
  });

  it('pointXY (4,4) ở góc dưới phải', () => {
    const p = pointXY(coord2index(4, 4));
    expect(p.x).toBe(460);
    expect(p.y).toBe(460);
  });

  it('computeEdges trả mảng không trùng (a < b)', () => {
    const edges = computeEdges();
    expect(edges.length).toBeGreaterThan(0);
    for (const e of edges) {
      expect(e.a).toBeLessThan(e.b);
    }
  });

  it('isDiagonalEdge: (0,0)-(1,1) là chéo', () => {
    expect(isDiagonalEdge(coord2index(0, 0), coord2index(1, 1))).toBe(true);
  });

  it('isDiagonalEdge: (0,0)-(0,1) không chéo', () => {
    expect(isDiagonalEdge(coord2index(0, 0), coord2index(0, 1))).toBe(false);
  });

  it('isDiagonalEdge: (0,0)-(1,0) không chéo', () => {
    expect(isDiagonalEdge(coord2index(0, 0), coord2index(1, 0))).toBe(false);
  });
});
