/**
 * Hàm đánh giá thế cờ heuristic (BOT.md mục 2).
 *
 * Trả số dương nếu `color` đang lợi, âm nếu bất lợi. ±INF cho win/loss.
 */
import {
  ADJACENCY,
  BOARD_SIZE,
  TOTAL_CELLS,
  applyMove,
  coord2index,
  getAllLegalMoves,
  index2coord,
  type Cell,
  type Color,
  type GameState,
} from '@co-ganh/engine';
import { DEFAULT_WEIGHTS, type EvalWeights } from './eval-config.js';

const INF = 1e9;

const oppColor = (c: Color): Color => (c === 'B' ? 'W' : 'B');

function countPieces(board: readonly Cell[], color: Color): number {
  let n = 0;
  for (const c of board) if (c === color) n++;
  return n;
}

const CENTER_INDEX = coord2index(2, 2);
const CENTER_NEIGHBORS = ADJACENCY[CENTER_INDEX] ?? [];

function centerControl(state: GameState, color: Color, weights: EvalWeights): number {
  let s = 0;
  if (state.board[CENTER_INDEX] === color) s += weights.center;
  for (const idx of CENTER_NEIGHBORS) {
    if (state.board[idx] === color) s += weights.center / 2;
  }
  return s;
}

function edgeBonus(state: GameState, color: Color, weights: EvalWeights): number {
  let s = 0;
  for (let i = 0; i < TOTAL_CELLS; i++) {
    if (state.board[i] !== color) continue;
    const [r, c] = index2coord(i);
    if ((r === 0 || r === BOARD_SIZE - 1) && (c === 0 || c === BOARD_SIZE - 1)) {
      s += weights.edge;
    }
  }
  return s;
}

/**
 * Số lượt đi hợp lệ ước lượng (mobility). Không tính tới gánh để rẻ.
 */
function mobility(state: GameState, color: Color): number {
  return getAllLegalMoves(state, color).length;
}

/**
 * Đếm số quân địch có thể bị gánh nếu `color` đi 1 nước tốt nhất.
 */
function threats(state: GameState, color: Color): number {
  if (state.status !== 'playing') return 0;
  if (state.turn !== color) return 0;
  let best = 0;
  for (const move of getAllLegalMoves(state, color)) {
    try {
      const next = applyMove(state, move);
      const ganh = next.capturedHistory
        .filter((h) => h.byMove === next.moveHistory.length)
        .filter((h) => h.type === 'ganh')
        .reduce((sum, h) => sum + h.positions.length, 0);
      if (ganh > best) best = ganh;
    } catch {
      // skip
    }
  }
  return best;
}

export function evaluate(
  state: GameState,
  color: Color,
  weights: EvalWeights = DEFAULT_WEIGHTS,
): number {
  if (state.status === `${color}_won`) return weights.win;
  if (state.status === `${oppColor(color)}_won`) return -weights.win;
  if (state.status === 'draw') return 0;

  const my = countPieces(state.board, color);
  const opp = countPieces(state.board, oppColor(color));

  let score = (my - opp) * weights.material;
  score += (mobility(state, color) - mobility(state, oppColor(color))) * weights.mobility;
  score += centerControl(state, color, weights);
  score -= centerControl(state, oppColor(color), weights);
  score += edgeBonus(state, color, weights);
  score -= edgeBonus(state, oppColor(color), weights);

  // Threat tính ở góc nhìn người vừa được lượt
  if (state.turn === color) {
    score += threats(state, color) * weights.threat;
  } else {
    score -= threats(state, oppColor(color)) * weights.vulnerability;
  }
  return score;
}

export { INF };
