import {
  applyMove,
  getAllLegalMoves,
  type Color,
  type GameState,
  type Move,
} from '@co-ganh/engine';
import { createPrng, type Prng } from './prng.js';

/**
 * Bot Easy (BOT.md mục 3): random hợp lệ + tránh tự sát rõ ràng + thỉnh
 * thoảng chọn nước có gánh.
 *
 * Tham số:
 * - randomness: 0..1, càng cao càng ngẫu nhiên (default 0.7).
 * - seed: number, để test reproducible.
 */
export function chooseMoveEasy(
  state: GameState,
  color: Color,
  opts: { randomness?: number; seed?: number } = {},
): Move {
  const prng: Prng = createPrng(opts.seed ?? Math.floor(Math.random() * 0xffffffff));
  const randomness = opts.randomness ?? 0.7;

  const moves = getAllLegalMoves(state, color);
  if (moves.length === 0) {
    throw new Error('No legal move (Easy)');
  }

  // Score mỗi nước: ước lượng material delta sau 1-ply đối phương greedy.
  const scored = moves.map((m) => ({ move: m, score: evaluateOnePly(state, m, color) }));

  // Tìm tập "không tự sát rõ ràng" (mất < 2 quân).
  const safeMoves = scored.filter((s) => s.score >= -1);
  const pool = safeMoves.length > 0 ? safeMoves : scored;

  const ganhMoves = pool.filter((s) => s.score >= 2);

  // 30% chọn nước có gánh nếu có
  if (ganhMoves.length > 0 && prng.next() < 0.3) {
    return prng.pick(ganhMoves).move;
  }

  // Else random theo randomness
  if (prng.next() < randomness) {
    return prng.pick(pool).move;
  }

  // Else chọn nước tốt nhất
  pool.sort((a, b) => b.score - a.score);
  return pool[0]!.move;
}

/**
 * Tính delta material sau khi `color` đi `move`,
 * giả định đối thủ chọn nước "ăn" nhiều nhất ở 1-ply tiếp theo.
 */
function evaluateOnePly(state: GameState, move: Move, color: Color): number {
  let next: GameState;
  try {
    next = applyMove(state, move);
  } catch {
    return -100;
  }
  const myAfterMove = countMy(next.board, color);
  // Đối thủ greedy: chọn nước tăng material nhiều nhất.
  const oppMoves = getAllLegalMoves(next);
  let worstOppMyDelta = 0;
  for (const om of oppMoves) {
    let after: GameState;
    try {
      after = applyMove(next, om);
    } catch {
      continue;
    }
    const myAfterOpp = countMy(after.board, color);
    const delta = myAfterOpp - myAfterMove;
    if (delta < worstOppMyDelta) worstOppMyDelta = delta;
  }
  const myInitial = countMy(state.board, color);
  return myAfterMove + worstOppMyDelta - myInitial;
}

function countMy(board: readonly (Color | null)[], color: Color): number {
  let n = 0;
  for (const c of board) if (c === color) n++;
  return n;
}
