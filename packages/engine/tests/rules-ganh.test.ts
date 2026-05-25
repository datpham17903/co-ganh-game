import { describe, expect, it } from 'vitest';
import { coord2index } from '../src/board.js';
import { applyMove } from '../src/game.js';
import { processGanh } from '../src/rules.js';
import type { Cell, GameState } from '../src/types.js';

function emptyBoard(): Cell[] {
  return new Array<Cell>(25).fill(null);
}

function makeState(board: Cell[], turn: 'B' | 'W' = 'B'): GameState {
  return {
    board,
    turn,
    moveHistory: [],
    capturedHistory: [],
    positionHistory: [],
    status: 'playing',
    noProgressCount: 0,
  };
}

describe('processGanh — 8 test bắt buộc (RULES.md 3.4)', () => {
  it('gánh-ngang: B đi vào (2,2), W ở (2,1) và (2,3) → cả 2 W bị gánh', () => {
    const board = emptyBoard();
    board[coord2index(2, 1)] = 'W';
    board[coord2index(2, 2)] = 'B'; // M
    board[coord2index(2, 3)] = 'W';
    const { board: next, captured } = processGanh(board, coord2index(2, 2), 'B');
    expect(next[coord2index(2, 1)]).toBe('B');
    expect(next[coord2index(2, 3)]).toBe('B');
    expect(captured.sort((a, b) => a - b)).toEqual(
      [coord2index(2, 1), coord2index(2, 3)].sort((a, b) => a - b),
    );
  });

  it('gánh-dọc: B đi vào (2,2), W ở (1,2) và (3,2) → cả 2 W bị gánh', () => {
    const board = emptyBoard();
    board[coord2index(1, 2)] = 'W';
    board[coord2index(2, 2)] = 'B'; // M
    board[coord2index(3, 2)] = 'W';
    const { board: next, captured } = processGanh(board, coord2index(2, 2), 'B');
    expect(next[coord2index(1, 2)]).toBe('B');
    expect(next[coord2index(3, 2)]).toBe('B');
    expect(captured).toHaveLength(2);
  });

  it('gánh-chéo: B đi vào (2,2) [có đường chéo], W ở (1,1) và (3,3) → cả 2 W bị gánh', () => {
    const board = emptyBoard();
    board[coord2index(1, 1)] = 'W';
    board[coord2index(2, 2)] = 'B'; // M
    board[coord2index(3, 3)] = 'W';
    const { board: next, captured } = processGanh(board, coord2index(2, 2), 'B');
    expect(next[coord2index(1, 1)]).toBe('B');
    expect(next[coord2index(3, 3)]).toBe('B');
    expect(captured).toHaveLength(2);
  });

  it('gánh-không-có-đường-chéo: B đi vào (2,1) [không chéo], W ở (1,0)+(3,2) → KHÔNG gánh chéo', () => {
    const board = emptyBoard();
    // (2,1) có (r+c)=3 → không có đường chéo.
    board[coord2index(1, 0)] = 'W';
    board[coord2index(2, 1)] = 'B'; // M
    board[coord2index(3, 2)] = 'W';
    const { board: next, captured } = processGanh(board, coord2index(2, 1), 'B');
    // KHÔNG gánh — cả 2 W giữ nguyên.
    expect(next[coord2index(1, 0)]).toBe('W');
    expect(next[coord2index(3, 2)]).toBe('W');
    expect(captured).toEqual([]);
  });

  it('gánh-đa: B vào (2,2), 4 cặp W trên 4 trục đều bị gánh đồng thời (8 quân W → 8 B)', () => {
    const board = emptyBoard();
    board[coord2index(2, 2)] = 'B'; // M
    // Ngang
    board[coord2index(2, 1)] = 'W';
    board[coord2index(2, 3)] = 'W';
    // Dọc
    board[coord2index(1, 2)] = 'W';
    board[coord2index(3, 2)] = 'W';
    // Chéo \
    board[coord2index(1, 1)] = 'W';
    board[coord2index(3, 3)] = 'W';
    // Chéo /
    board[coord2index(1, 3)] = 'W';
    board[coord2index(3, 1)] = 'W';

    const { board: next, captured } = processGanh(board, coord2index(2, 2), 'B');
    // Tất cả 8 W flip thành B.
    const wPositions = [
      [2, 1],
      [2, 3],
      [1, 2],
      [3, 2],
      [1, 1],
      [3, 3],
      [1, 3],
      [3, 1],
    ] as const;
    for (const [r, c] of wPositions) {
      expect(next[coord2index(r, c)]).toBe('B');
    }
    expect(captured).toHaveLength(8);
  });

  it('không-gánh-quân-mình: M là B, A và B đối xứng cùng là B → không gánh', () => {
    const board = emptyBoard();
    board[coord2index(2, 1)] = 'B';
    board[coord2index(2, 2)] = 'B'; // M
    board[coord2index(2, 3)] = 'B';
    const { board: next, captured } = processGanh(board, coord2index(2, 2), 'B');
    expect(next[coord2index(2, 1)]).toBe('B');
    expect(next[coord2index(2, 3)]).toBe('B');
    expect(captured).toEqual([]);
  });

  it('không-gánh-quân-đứng-yên: W đứng giữa B nhưng B không đi vào → W không bị gánh', () => {
    // Setup: W ở (2,2), B ở (2,1), (2,3). B đi nước khác (0,0)→(1,1) thay vì
    // đi vào (2,2). W ở (2,2) PHẢI giữ nguyên màu.
    const board = emptyBoard();
    board[coord2index(0, 0)] = 'B';
    board[coord2index(1, 1)] = null;
    board[coord2index(2, 1)] = 'B';
    board[coord2index(2, 2)] = 'W';
    board[coord2index(2, 3)] = 'B';
    // Cũng cần TRẮNG hợp lệ tồn tại để game không tự kết thúc; thêm 1 W ở góc xa.
    board[coord2index(4, 4)] = 'W';

    const state = makeState(board, 'B');
    const next = applyMove(state, {
      from: coord2index(0, 0),
      to: coord2index(1, 1),
      color: 'B',
    });
    // W ở (2,2) vẫn là W.
    expect(next.board[coord2index(2, 2)]).toBe('W');
    // (2,1) và (2,3) vẫn B.
    expect(next.board[coord2index(2, 1)]).toBe('B');
    expect(next.board[coord2index(2, 3)]).toBe('B');
  });

  it('không-phản-ứng-dây-chuyền: gánh ngang xong, các W đổi màu KHÔNG kích gánh dọc tiếp', () => {
    // M = (2,2). W ở (2,1) và (2,3) → bị gánh ngang khi B vào.
    // W ở (1,1) và (3,1): nếu chain reactions, B-mới ở (2,1) sẽ gánh tiếp 2 W này theo dọc.
    // Expected: KHÔNG chain — (1,1) và (3,1) GIỮ nguyên W.
    const board = emptyBoard();
    board[coord2index(1, 1)] = 'W';
    board[coord2index(2, 1)] = 'W';
    board[coord2index(2, 2)] = 'B'; // M
    board[coord2index(2, 3)] = 'W';
    board[coord2index(3, 1)] = 'W';

    const { board: next } = processGanh(board, coord2index(2, 2), 'B');

    // Trục từ M (2,2):
    //  - Ngang: A=(2,1)=W, B=(2,3)=W → cả hai flip thành B. ✓
    //  - Dọc: A=(1,2)=null, B=(3,2)=null → không flip.
    //  - Chéo \: A=(1,1)=W, B=(3,3)=null → KHÔNG flip vì chỉ 1 phía W.
    //  - Chéo /: A=(1,3)=null, B=(3,1)=W → KHÔNG flip vì chỉ 1 phía W.
    expect(next[coord2index(2, 1)]).toBe('B');
    expect(next[coord2index(2, 3)]).toBe('B');
    // (1,1) và (3,1) GIỮ NGUYÊN W (không chain qua quân mới flip).
    expect(next[coord2index(1, 1)]).toBe('W');
    expect(next[coord2index(3, 1)]).toBe('W');
  });
});

describe('processGanh — invariant', () => {
  it('không mutate board input', () => {
    const board = emptyBoard();
    board[coord2index(2, 1)] = 'W';
    board[coord2index(2, 2)] = 'B';
    board[coord2index(2, 3)] = 'W';
    const snapshot = [...board];
    processGanh(board, coord2index(2, 2), 'B');
    expect(board).toEqual(snapshot);
  });

  it('M ở góc (0,0): không có A,B đối xứng nào trong bàn → không gánh', () => {
    const board = emptyBoard();
    board[coord2index(0, 0)] = 'B';
    const { board: next, captured } = processGanh(board, coord2index(0, 0), 'B');
    expect(next).toEqual(board);
    expect(captured).toEqual([]);
  });
});
