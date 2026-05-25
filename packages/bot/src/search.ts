import {
  applyMove,
  getAllLegalMoves,
  hashState,
  type Color,
  type GameState,
  type Move,
} from '@co-ganh/engine';

/**
 * Move ordering: gánh trước, vào trung tâm trước, còn lại sau.
 * Tăng tốc cắt tỉa alpha-beta.
 */
export function orderMoves(state: GameState, moves: readonly Move[]): Move[] {
  return [...moves].sort((a, b) => scoreMove(state, b) - scoreMove(state, a));
}

function scoreMove(state: GameState, m: Move): number {
  let s = 0;
  try {
    const next = applyMove(state, m);
    const captures = next.capturedHistory.filter((h) => h.byMove === next.moveHistory.length);
    for (const cap of captures) {
      s += cap.positions.length * (cap.type === 'ganh' ? 100 : 80);
    }
  } catch {
    return -1;
  }
  // Distance to center 2,2
  const r = Math.floor(m.to / 5);
  const c = m.to % 5;
  s -= Math.abs(r - 2) + Math.abs(c - 2);
  return s;
}

export interface SearchResult {
  bestMove: Move | null;
  score: number;
  nodes: number;
  depth: number;
}

export interface SearchOptions {
  depth: number;
  evalFn: (state: GameState, color: Color) => number;
  /** Optional deadline (Date.now()), search will exit ASAP after deadline. */
  deadline?: number;
  /** Optional transposition table (shared across iterative deepening). */
  tt?: Map<string, { depth: number; score: number; flag: 'exact' | 'lower' | 'upper' }>;
}

const INF = 1e9;

/**
 * Negamax với alpha-beta pruning.
 * Trả về điểm tốt nhất từ góc nhìn của bên đang đi.
 */
export function search(state: GameState, color: Color, opts: SearchOptions): SearchResult {
  let nodes = 0;

  function negamax(s: GameState, depth: number, alpha: number, beta: number): number {
    nodes++;

    if (opts.deadline !== undefined && Date.now() > opts.deadline) {
      throw new SearchTimeout();
    }

    if (s.status !== 'playing') {
      return opts.evalFn(s, color) * (s.turn === color ? 1 : -1);
    }
    if (depth === 0) {
      const sign = s.turn === color ? 1 : -1;
      return opts.evalFn(s, color) * sign;
    }

    let key = '';
    if (opts.tt) {
      key = hashState(s);
      const entry = opts.tt.get(key);
      if (entry && entry.depth >= depth) {
        if (entry.flag === 'exact') return entry.score;
        if (entry.flag === 'lower') alpha = Math.max(alpha, entry.score);
        else beta = Math.min(beta, entry.score);
        if (alpha >= beta) return entry.score;
      }
    }

    const moves = orderMoves(s, getAllLegalMoves(s));
    if (moves.length === 0) {
      return opts.evalFn(s, color) * (s.turn === color ? 1 : -1);
    }

    let best = -INF;
    const origAlpha = alpha;
    for (const m of moves) {
      let next: GameState;
      try {
        next = applyMove(s, m);
      } catch {
        continue;
      }
      const score = -negamax(next, depth - 1, -beta, -alpha);
      if (score > best) best = score;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }

    if (opts.tt && key) {
      const flag: 'exact' | 'lower' | 'upper' =
        best <= origAlpha ? 'upper' : best >= beta ? 'lower' : 'exact';
      opts.tt.set(key, { depth, score: best, flag });
    }
    return best;
  }

  const moves = orderMoves(state, getAllLegalMoves(state, color));
  if (moves.length === 0) {
    return { bestMove: null, score: 0, nodes, depth: opts.depth };
  }

  let bestMove: Move | null = null;
  let bestScore = -INF;
  let alpha = -INF;
  const beta = INF;

  for (const m of moves) {
    let next: GameState;
    try {
      next = applyMove(state, m);
    } catch {
      continue;
    }
    const score = -negamax(next, opts.depth - 1, -beta, -alpha);
    if (score > bestScore || bestMove === null) {
      bestScore = score;
      bestMove = m;
    }
    if (score > alpha) alpha = score;
  }
  return { bestMove, score: bestScore, nodes, depth: opts.depth };
}

export class SearchTimeout extends Error {
  constructor() {
    super('search timeout');
    this.name = 'SearchTimeout';
  }
}
