import { describe, expect, it } from 'vitest';
import { coord2index } from '../src/board.js';
import { applyMove } from '../src/game.js';
import { processVay } from '../src/rules.js';
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

describe('processVay — 5 test bắt buộc (RULES.md 4.4)', () => {
  it('vây-1-quân: 1 W đơn lẻ ở (2,2) bị 4 B kề (1,2),(3,2),(2,1),(2,3) bao quanh + chéo bị B → bị vây', () => {
    // (2,2) có chéo. Để bao kín, mọi láng giềng của W (gồm 4 ngang/dọc + 4 chéo) phải có B.
    const board = emptyBoard();
    board[coord2index(2, 2)] = 'W';
    board[coord2index(1, 2)] = 'B';
    board[coord2index(3, 2)] = 'B';
    board[coord2index(2, 1)] = 'B';
    board[coord2index(2, 3)] = 'B';
    board[coord2index(1, 1)] = 'B';
    board[coord2index(1, 3)] = 'B';
    board[coord2index(3, 1)] = 'B';
    board[coord2index(3, 3)] = 'B';

    const { board: next, captured } = processVay(board, 'B');
    expect(next[coord2index(2, 2)]).toBe('B');
    expect(captured).toEqual([coord2index(2, 2)]);
  });

  it('vây-nhóm: 2 W liên kết ở (0,0)-(0,1), không còn lối → bị vây', () => {
    // (0,0)=W, (0,1)=W. Láng giềng nhóm:
    //   (0,0): (0,1) trong nhóm, (1,0), (1,1) — phải lấp B.
    //   (0,1): (0,0) trong nhóm, (0,2), (1,1) — (1,1) lặp; thêm (1,2) là láng giềng vì (0,1) không có chéo.
    //          láng giềng (0,1): (0,0), (0,2), (1,1) [WAIT: (0,1) có (r+c)=1 lẻ → KHÔNG có chéo]
    //          → láng giềng: (0,0), (0,2), (1,1).
    const board = emptyBoard();
    board[coord2index(0, 0)] = 'W';
    board[coord2index(0, 1)] = 'W';
    board[coord2index(1, 0)] = 'B';
    board[coord2index(1, 1)] = 'B';
    board[coord2index(0, 2)] = 'B';

    const { board: next, captured } = processVay(board, 'B');
    expect(next[coord2index(0, 0)]).toBe('B');
    expect(next[coord2index(0, 1)]).toBe('B');
    expect(captured.sort((a, b) => a - b)).toEqual(
      [coord2index(0, 0), coord2index(0, 1)].sort((a, b) => a - b),
    );
  });

  it('vây-sau-gánh (qua applyMove): nước B vừa gánh, đồng thời tạo thế vây cho 1 W còn lại', () => {
    // Setup ngắn gọn: W ở (0,1) đơn lẻ, láng giềng (0,0),(0,2),(1,1).
    // Đặt B sẵn ở (0,0),(0,2). (1,1) trống. B đi từ (2,1) → (1,1).
    // Tới (1,1): không có gánh nào (vì (1,1) có chéo, nhưng các trục không đối xứng W-W).
    // Nhưng (1,1) lấp lối thoát cuối của W ở (0,1) → W bị VÂY.
    const board = emptyBoard();
    board[coord2index(0, 1)] = 'W';
    board[coord2index(0, 0)] = 'B';
    board[coord2index(0, 2)] = 'B';
    board[coord2index(2, 1)] = 'B'; // sẽ di chuyển
    // Cần thêm W còn lại để game không kết thúc do W=0.
    board[coord2index(4, 4)] = 'W';

    const state = makeState(board, 'B');
    const next = applyMove(state, {
      from: coord2index(2, 1),
      to: coord2index(1, 1),
      color: 'B',
    });

    // W ở (0,1) bị vây → flip thành B.
    expect(next.board[coord2index(0, 1)]).toBe('B');
    // capturedHistory có entry vay.
    const vayEntry = next.capturedHistory.find((c) => c.type === 'vay');
    expect(vayEntry).toBeDefined();
    expect(vayEntry?.positions).toContain(coord2index(0, 1));
  });

  it('không-vây-nếu-còn-lối: nhóm W còn 1 ô trống kề → KHÔNG vây', () => {
    const board = emptyBoard();
    board[coord2index(2, 2)] = 'W';
    // Bao gần hết, để (1,2) trống.
    board[coord2index(3, 2)] = 'B';
    board[coord2index(2, 1)] = 'B';
    board[coord2index(2, 3)] = 'B';
    board[coord2index(1, 1)] = 'B';
    board[coord2index(1, 3)] = 'B';
    board[coord2index(3, 1)] = 'B';
    board[coord2index(3, 3)] = 'B';
    // (1,2) vẫn null → còn lối.

    const { board: next, captured } = processVay(board, 'B');
    expect(next[coord2index(2, 2)]).toBe('W');
    expect(captured).toEqual([]);
  });

  it('không-vây-quân-mình: nhóm B bị bao kín không bị vây bởi B (chỉ kiểm tra nhóm đối phương)', () => {
    const board = emptyBoard();
    // B ở (0,0) bị kẹt giữa W nhưng processVay(_, 'W') KHÔNG xét B vì B là quân mình.
    board[coord2index(0, 0)] = 'B';
    board[coord2index(0, 1)] = 'W';
    board[coord2index(1, 0)] = 'W';
    board[coord2index(1, 1)] = 'W';

    const { board: next, captured } = processVay(board, 'B'); // B đang đi
    // Hàm chỉ xét nhóm đối phương = W. W ở 3 ô đó vẫn còn lối thoát rộng → không vây.
    expect(next[coord2index(0, 0)]).toBe('B');
    expect(captured).toEqual([]);
  });
});

describe('processVay — invariant', () => {
  it('không mutate board input', () => {
    const board = emptyBoard();
    board[coord2index(2, 2)] = 'W';
    board[coord2index(1, 2)] = 'B';
    board[coord2index(3, 2)] = 'B';
    board[coord2index(2, 1)] = 'B';
    board[coord2index(2, 3)] = 'B';
    board[coord2index(1, 1)] = 'B';
    board[coord2index(1, 3)] = 'B';
    board[coord2index(3, 1)] = 'B';
    board[coord2index(3, 3)] = 'B';
    const snapshot = [...board];
    processVay(board, 'B');
    expect(board).toEqual(snapshot);
  });

  it('không có quân đối phương → không thay đổi gì', () => {
    const board = emptyBoard();
    board[coord2index(0, 0)] = 'B';
    const { board: next, captured } = processVay(board, 'B');
    expect(next).toEqual(board);
    expect(captured).toEqual([]);
  });
});
