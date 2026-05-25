/**
 * Self-play benchmark — chạy bot vs bot, in tỉ lệ thắng.
 * Yêu cầu BOT.md mục 7.2.
 */
import {
  applyMove,
  createInitialState,
  isGameOver,
  getWinner,
  type Color,
  type GameState,
  type Move,
} from '@co-ganh/engine';
import { chooseMoveSync } from '../src/index.js';
import type { BotConfig } from '../src/types.js';

interface MatchResult {
  wins: number;
  losses: number;
  draws: number;
}

function playGame(
  blackBot: (s: GameState, c: Color) => Move,
  whiteBot: (s: GameState, c: Color) => Move,
  maxMoves = 200,
): 'B' | 'W' | 'draw' {
  let state = createInitialState();
  let move = 0;
  while (!isGameOver(state) && move < maxMoves) {
    const bot = state.turn === 'B' ? blackBot : whiteBot;
    const m = bot(state, state.turn);
    state = applyMove(state, m);
    move++;
  }
  return getWinner(state) ?? 'draw';
}

function runMatch(perspective: BotConfig, opponent: BotConfig, games: number): MatchResult {
  let wins = 0,
    losses = 0,
    draws = 0;
  for (let i = 0; i < games; i++) {
    // Đổi màu mỗi ván để công bằng
    const isPerspectiveBlack = i % 2 === 0;
    const blackCfg = isPerspectiveBlack ? perspective : opponent;
    const whiteCfg = isPerspectiveBlack ? opponent : perspective;
    const seedB = i * 100 + 1;
    const seedW = i * 100 + 2;
    const blackBot = (s: GameState, c: Color) =>
      chooseMoveSync(s, c, { ...blackCfg, seed: seedB, maxThinkMs: 200 });
    const whiteBot = (s: GameState, c: Color) =>
      chooseMoveSync(s, c, { ...whiteCfg, seed: seedW, maxThinkMs: 200 });

    const winner = playGame(blackBot, whiteBot);
    if (winner === 'draw') draws++;
    else if ((isPerspectiveBlack && winner === 'B') || (!isPerspectiveBlack && winner === 'W')) {
      wins++;
    } else {
      losses++;
    }
  }
  return { wins, losses, draws };
}

function pct(r: MatchResult, games: number): string {
  return `${((r.wins / games) * 100).toFixed(1)}%`;
}

const N = Number(process.env.BENCH_GAMES ?? 10);
console.warn(`Self-play benchmark — ${N} games per match`);

const easyVsRandom = runMatch(
  { difficulty: 'easy', seed: 0 },
  { difficulty: 'easy', randomness: 1, seed: 0 },
  N,
);
console.warn('Easy vs Random:', easyVsRandom, pct(easyVsRandom, N));

const mediumVsEasy = runMatch({ difficulty: 'medium' }, { difficulty: 'easy', seed: 0 }, N);
console.warn('Medium vs Easy:', mediumVsEasy, pct(mediumVsEasy, N));

const hardVsMedium = runMatch({ difficulty: 'hard', maxThinkMs: 300 }, { difficulty: 'medium' }, N);
console.warn('Hard vs Medium:', hardVsMedium, pct(hardVsMedium, N));
