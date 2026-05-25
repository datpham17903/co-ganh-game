import { type Color, type GameState, type Move } from '@co-ganh/engine';
import { evaluate } from './eval.js';
import { search } from './search.js';
import { createPrng } from './prng.js';

/**
 * Bot Medium: minimax depth 3 + alpha-beta + 10% noise.
 */
export function chooseMoveMedium(
  state: GameState,
  color: Color,
  opts: { seed?: number; randomness?: number; depth?: number } = {},
): Move {
  const depth = opts.depth ?? 3;
  const result = search(state, color, { depth, evalFn: evaluate });
  if (!result.bestMove) throw new Error('No legal move (Medium)');

  // 10% chọn nước "gần tốt nhất" để giảm máy móc
  const randomness = opts.randomness ?? 0.1;
  if (randomness > 0 && opts.seed !== undefined) {
    const prng = createPrng(opts.seed);
    if (prng.next() < randomness) {
      // Search lần 2 với depth-1 và pick nước thứ 2 nếu có
      const r2 = search(state, color, { depth: Math.max(1, depth - 1), evalFn: evaluate });
      if (r2.bestMove) return r2.bestMove;
    }
  }
  return result.bestMove;
}
