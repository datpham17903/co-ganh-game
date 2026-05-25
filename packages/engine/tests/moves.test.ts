import { describe, expect, it } from 'vitest';
import { coord2index } from '../src/board.js';
import { createInitialState } from '../src/game.js';
import { getAllLegalMoves, getLegalMoves } from '../src/moves.js';
import type { GameState } from '../src/types.js';

function emptyState(turn: 'B' | 'W' = 'B'): GameState {
  return {
    board: new Array(25).fill(null),
    turn,
    moveHistory: [],
    capturedHistory: [],
    positionHistory: [],
    status: 'playing',
    noProgressCount: 0,
  };
}

describe('getLegalMoves', () => {
  it('quân ở (0,0) [đầu ván] có thể đi tới (1,1) (chéo, ô trống)', () => {
    const state = createInitialState();
    const from = coord2index(0, 0);
    const moves = getLegalMoves(state, from);
    // (0,0) ĐEN — láng giềng: (0,1)=B, (1,0)=B, (1,1)=null. Chỉ đi được tới (1,1).
    expect(moves).toEqual([coord2index(1, 1)]);
  });

  it('quân ĐEN ở (1,0) [đầu ván] chỉ đi được tới (1,1) ((2,0)=W chặn)', () => {
    const state = createInitialState();
    const from = coord2index(1, 0);
    // (1,0) láng giềng: (0,0)=B, (1,1)=null, (2,0)=W. Chỉ đi được (1,1).
    expect(getLegalMoves(state, from)).toEqual([coord2index(1, 1)]);
  });

  it('quân ở (0,1) [đầu ván] đi được tới (1,1) (ô trống chéo? KHÔNG — (0,1) không chéo, là đường dọc)', () => {
    const state = createInitialState();
    const from = coord2index(0, 1);
    // (0,1) láng giềng: (0,0)=B, (0,2)=B, (1,1)=null. Chỉ đi được tới (1,1).
    expect(getLegalMoves(state, from)).toEqual([coord2index(1, 1)]);
  });

  it('không sinh nước đi cho ô trống', () => {
    const state = createInitialState();
    const empty = coord2index(2, 2);
    expect(getLegalMoves(state, empty)).toEqual([]);
  });

  it('index ngoài phạm vi → mảng rỗng', () => {
    const state = createInitialState();
    expect(getLegalMoves(state, -1)).toEqual([]);
    expect(getLegalMoves(state, 25)).toEqual([]);
    expect(getLegalMoves(state, 999)).toEqual([]);
  });

  it('quân không thể đi vào ô đã có quân khác', () => {
    const state = createInitialState();
    // Quân (0,0) có láng giềng (0,1)=B nhưng không thể đi vào.
    const moves = getLegalMoves(state, coord2index(0, 0));
    expect(moves).not.toContain(coord2index(0, 1));
    expect(moves).not.toContain(coord2index(1, 0));
  });
});

describe('getAllLegalMoves', () => {
  it('đầu ván, đen có ≥ 3 nước hợp lệ', () => {
    const state = createInitialState();
    const moves = getAllLegalMoves(state);
    expect(moves.length).toBeGreaterThanOrEqual(3);
    for (const m of moves) {
      expect(m.color).toBe('B');
    }
  });

  it('đầu ván, đen tổng cộng có 12 nước (tính tay theo layout)', () => {
    // (0,0)=1: (1,1)
    // (0,1)=1: (1,1)
    // (0,2)=3: (1,1) (1,2) (1,3)
    // (0,3)=1: (1,3)
    // (0,4)=1: (1,3)
    // (1,0)=1: (1,1) — (2,0) là W, chặn.
    // (1,4)=1: (1,3) — (2,4) là B, chặn.
    // (2,4)=3: (2,3), (1,3), (3,3) — chéo và ngang.
    // Tổng: 12.
    const state = createInitialState();
    const moves = getAllLegalMoves(state);
    expect(moves).toHaveLength(12);
  });

  it('đầu ván, getAllLegalMoves(state, "W") trả về 12 nước (đối xứng)', () => {
    const state = createInitialState();
    const wMoves = getAllLegalMoves(state, 'W');
    expect(wMoves).toHaveLength(12);
    for (const m of wMoves) {
      expect(m.color).toBe('W');
    }
  });

  it('khi status !== "playing", trả về mảng rỗng', () => {
    const state: GameState = {
      ...emptyState(),
      status: 'B_won',
    };
    expect(getAllLegalMoves(state)).toEqual([]);
  });

  it('default color = state.turn nếu không truyền', () => {
    const state = emptyState('W');
    state.board[coord2index(2, 2)] = 'W';
    const moves = getAllLegalMoves(state);
    for (const m of moves) {
      expect(m.color).toBe('W');
    }
  });
});
