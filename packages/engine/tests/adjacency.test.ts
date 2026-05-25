import { describe, expect, it } from 'vitest';
import { ADJACENCY } from '../src/adjacency.js';
import { coord2index, TOTAL_CELLS } from '../src/board.js';

describe('ADJACENCY', () => {
  it('có 25 phần tử', () => {
    expect(ADJACENCY).toHaveLength(TOTAL_CELLS);
  });

  it('không chứa chính nó', () => {
    for (let i = 0; i < TOTAL_CELLS; i++) {
      expect(ADJACENCY[i]).not.toContain(i);
    }
  });

  it('đối xứng: j ∈ ADJ[i] ⇔ i ∈ ADJ[j] (RULES.md 1.2)', () => {
    for (let i = 0; i < TOTAL_CELLS; i++) {
      for (const j of ADJACENCY[i] ?? []) {
        expect(ADJACENCY[j]).toContain(i);
      }
    }
  });

  it('điểm (0,0) [góc, có chéo] có 3 láng giềng: (0,1), (1,0), (1,1)', () => {
    const i = coord2index(0, 0);
    expect([...(ADJACENCY[i] ?? [])].sort((a, b) => a - b)).toEqual(
      [coord2index(0, 1), coord2index(1, 0), coord2index(1, 1)].sort((a, b) => a - b),
    );
  });

  it('điểm (4,4) [góc, có chéo] có 3 láng giềng', () => {
    const i = coord2index(4, 4);
    expect([...(ADJACENCY[i] ?? [])].sort((a, b) => a - b)).toEqual(
      [coord2index(3, 3), coord2index(3, 4), coord2index(4, 3)].sort((a, b) => a - b),
    );
  });

  it('điểm (2,2) [trung tâm, có chéo] có 8 láng giềng', () => {
    const i = coord2index(2, 2);
    expect(ADJACENCY[i]).toHaveLength(8);
  });

  it('điểm (1,1) [có chéo, ở trong bàn] có 8 láng giềng', () => {
    const i = coord2index(1, 1);
    expect(ADJACENCY[i]).toHaveLength(8);
  });

  it('điểm (1,0) [biên, KHÔNG có chéo] có 3 láng giềng (lên, xuống, phải)', () => {
    const i = coord2index(1, 0);
    expect([...(ADJACENCY[i] ?? [])].sort((a, b) => a - b)).toEqual(
      [coord2index(0, 0), coord2index(2, 0), coord2index(1, 1)].sort((a, b) => a - b),
    );
  });

  it('điểm (0,1) [biên trên, KHÔNG có chéo] có 3 láng giềng (trái, phải, xuống)', () => {
    const i = coord2index(0, 1);
    expect([...(ADJACENCY[i] ?? [])].sort((a, b) => a - b)).toEqual(
      [coord2index(0, 0), coord2index(0, 2), coord2index(1, 1)].sort((a, b) => a - b),
    );
  });

  it('điểm (2,1) [trong bàn, KHÔNG có chéo] có 4 láng giềng (lên, xuống, trái, phải)', () => {
    const i = coord2index(2, 1);
    expect([...(ADJACENCY[i] ?? [])].sort((a, b) => a - b)).toEqual(
      [coord2index(1, 1), coord2index(3, 1), coord2index(2, 0), coord2index(2, 2)].sort(
        (a, b) => a - b,
      ),
    );
  });

  it('điểm (3,3) [có chéo, trong bàn] có 8 láng giềng', () => {
    const i = coord2index(3, 3);
    expect(ADJACENCY[i]).toHaveLength(8);
  });

  it('không cho mutate (frozen)', () => {
    expect(() => {
      (ADJACENCY[0] as unknown as number[]).push(99);
    }).toThrow();
  });
});
