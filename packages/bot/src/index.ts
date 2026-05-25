import type { Color, GameState, Move } from '@co-ganh/engine';
import { chooseMoveEasy } from './easy.js';
import { chooseMoveMedium } from './medium.js';
import { chooseMoveHard } from './hard.js';
import type { BotConfig, BotDifficulty } from './types.js';

export type { BotConfig, BotDifficulty } from './types.js';
export { evaluate, INF } from './eval.js';
export { search, orderMoves, SearchTimeout } from './search.js';
export { createPrng } from './prng.js';
export { DEFAULT_WEIGHTS } from './eval-config.js';
export type { EvalWeights } from './eval-config.js';

/**
 * Public API (BOT.md mục 1). Dispatcher theo difficulty.
 */
export async function chooseMove(state: GameState, config: BotConfig): Promise<Move> {
  const color: Color = state.turn;
  const move = chooseMoveSync(state, color, config);
  return Promise.resolve(move);
}

export function chooseMoveSync(state: GameState, color: Color, config: BotConfig): Move {
  switch (config.difficulty) {
    case 'easy':
      return chooseMoveEasy(state, color, {
        randomness: config.randomness,
        seed: config.seed,
      });
    case 'medium':
      return chooseMoveMedium(state, color, {
        seed: config.seed,
        randomness: config.randomness,
      });
    case 'hard':
      return chooseMoveHard(state, color, { maxThinkMs: config.maxThinkMs });
    default:
      // exhaustive
      return assertNever(config.difficulty);
  }
}

function assertNever(_d: BotDifficulty): never {
  throw new Error('Unknown difficulty');
}
