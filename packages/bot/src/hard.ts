import { type Color, type GameState, type Move } from '@co-ganh/engine';
import { evaluate } from './eval.js';
import { search, SearchTimeout } from './search.js';

/**
 * Bot Hard (BOT.md mục 5): iterative deepening + alpha-beta + transposition table.
 *
 * Search depth tăng từ 1, dừng khi hết deadline.
 */
export function chooseMoveHard(
  state: GameState,
  color: Color,
  opts: { maxThinkMs?: number; maxDepth?: number } = {},
): Move {
  const maxThinkMs = opts.maxThinkMs ?? 1500;
  const maxDepth = opts.maxDepth ?? 6;
  const deadline = Date.now() + maxThinkMs;
  const tt = new Map<string, { depth: number; score: number; flag: 'exact' | 'lower' | 'upper' }>();

  let bestMove: Move | null = null;
  for (let d = 1; d <= maxDepth; d++) {
    try {
      const r = search(state, color, { depth: d, evalFn: evaluate, deadline, tt });
      if (r.bestMove) bestMove = r.bestMove;
    } catch (e) {
      if (e instanceof SearchTimeout) break;
      throw e;
    }
    if (Date.now() > deadline) break;
  }

  if (!bestMove) {
    // Fallback: depth 1 không deadline
    const r = search(state, color, { depth: 1, evalFn: evaluate });
    if (r.bestMove) return r.bestMove;
    throw new Error('No legal move (Hard)');
  }
  return bestMove;
}
