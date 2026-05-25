import { describe, it, expect } from 'vitest';
import { applyMove, createInitialState, getAllLegalMoves } from '@co-ganh/engine';
import { chooseMove, chooseMoveSync } from '../src/index.js';

describe('chooseMove (dispatcher)', () => {
  it('easy: trả nước hợp lệ deterministic với seed', async () => {
    const state = createInitialState();
    const move = await chooseMove(state, { difficulty: 'easy', seed: 42 });
    const legal = getAllLegalMoves(state).map((m) => `${m.from}-${m.to}`);
    expect(legal).toContain(`${move.from}-${move.to}`);
  });

  it('easy: cùng seed → cùng nước', () => {
    const state = createInitialState();
    const m1 = chooseMoveSync(state, 'B', { difficulty: 'easy', seed: 7 });
    const m2 = chooseMoveSync(state, 'B', { difficulty: 'easy', seed: 7 });
    expect(m1).toEqual(m2);
  });

  it('medium: trả nước hợp lệ', () => {
    const state = createInitialState();
    const move = chooseMoveSync(state, 'B', { difficulty: 'medium' });
    expect(() => applyMove(state, move)).not.toThrow();
  });

  it('hard: trả nước hợp lệ trong < 2s', () => {
    const state = createInitialState();
    const t0 = Date.now();
    const move = chooseMoveSync(state, 'B', { difficulty: 'hard', maxThinkMs: 1500 });
    const elapsed = Date.now() - t0;
    expect(() => applyMove(state, move)).not.toThrow();
    expect(elapsed).toBeLessThan(2500);
  });

  it('mọi cấp độ luôn trả nước thuộc tập legal', () => {
    const state = createInitialState();
    const legal = getAllLegalMoves(state).map((m) => `${m.from}-${m.to}`);
    for (const diff of ['easy', 'medium', 'hard'] as const) {
      const m = chooseMoveSync(state, 'B', { difficulty: diff, seed: 1, maxThinkMs: 300 });
      expect(legal).toContain(`${m.from}-${m.to}`);
    }
  });
});
