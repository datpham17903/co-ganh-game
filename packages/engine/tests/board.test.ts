import { describe, expect, it } from 'vitest';
import {
  BOARD_SIZE,
  coord2index,
  createInitialBoard,
  hasDiagonal,
  index2coord,
  isInBounds,
  PIECE_COUNT,
  TOTAL_CELLS,
} from '../src/board.js';

describe('board: hằng số', () => {
  it('BOARD_SIZE = 5, TOTAL_CELLS = 25, PIECE_COUNT = 8', () => {
    expect(BOARD_SIZE).toBe(5);
    expect(TOTAL_CELLS).toBe(25);
    expect(PIECE_COUNT).toBe(8);
  });
});

describe('createInitialBoard', () => {
  const board = createInitialBoard();

  it('có đúng 25 phần tử', () => {
    expect(board).toHaveLength(TOTAL_CELLS);
  });

  it('có đúng 8 đen, 8 trắng, 9 trống (RULES.md 1.3)', () => {
    const counts = { B: 0, W: 0, empty: 0 };
    for (const c of board) {
      if (c === 'B') counts.B++;
      else if (c === 'W') counts.W++;
      else counts.empty++;
    }
    expect(counts.B).toBe(8);
    expect(counts.W).toBe(8);
    expect(counts.empty).toBe(9);
  });

  it('layout: hàng 0 toàn ĐEN, hàng 4 toàn TRẮNG', () => {
    for (let c = 0; c < BOARD_SIZE; c++) {
      expect(board[coord2index(0, c)]).toBe('B');
      expect(board[coord2index(4, c)]).toBe('W');
    }
  });

  it('layout: hàng 1 chỉ có ĐEN ở cột 0 và 4', () => {
    expect(board[coord2index(1, 0)]).toBe('B');
    expect(board[coord2index(1, 1)]).toBeNull();
    expect(board[coord2index(1, 2)]).toBeNull();
    expect(board[coord2index(1, 3)]).toBeNull();
    expect(board[coord2index(1, 4)]).toBe('B');
  });

  it('layout: hàng 2 — TRẮNG ở (2,0), ĐEN ở (2,4), giữa trống', () => {
    expect(board[coord2index(2, 0)]).toBe('W');
    expect(board[coord2index(2, 1)]).toBeNull();
    expect(board[coord2index(2, 2)]).toBeNull();
    expect(board[coord2index(2, 3)]).toBeNull();
    expect(board[coord2index(2, 4)]).toBe('B');
  });

  it('layout: hàng 3 chỉ có TRẮNG ở cột 0 và 4', () => {
    expect(board[coord2index(3, 0)]).toBe('W');
    expect(board[coord2index(3, 1)]).toBeNull();
    expect(board[coord2index(3, 2)]).toBeNull();
    expect(board[coord2index(3, 3)]).toBeNull();
    expect(board[coord2index(3, 4)]).toBe('W');
  });

  it('mỗi lần gọi tạo mảng mới (immutable)', () => {
    const a = createInitialBoard();
    const b = createInitialBoard();
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });
});

describe('index2coord / coord2index', () => {
  it('index2coord(0) = (0,0), index2coord(24) = (4,4)', () => {
    expect(index2coord(0)).toEqual([0, 0]);
    expect(index2coord(24)).toEqual([4, 4]);
  });

  it('coord2index(2, 3) = 13', () => {
    expect(coord2index(2, 3)).toBe(13);
  });

  it('round-trip với mọi index 0..24', () => {
    for (let i = 0; i < TOTAL_CELLS; i++) {
      const [r, c] = index2coord(i);
      expect(coord2index(r, c)).toBe(i);
    }
  });
});

describe('isInBounds', () => {
  it('chấp nhận điểm trong bàn', () => {
    expect(isInBounds(0, 0)).toBe(true);
    expect(isInBounds(4, 4)).toBe(true);
    expect(isInBounds(2, 2)).toBe(true);
  });

  it('từ chối điểm ngoài bàn', () => {
    expect(isInBounds(-1, 0)).toBe(false);
    expect(isInBounds(0, -1)).toBe(false);
    expect(isInBounds(5, 0)).toBe(false);
    expect(isInBounds(0, 5)).toBe(false);
  });
});

describe('hasDiagonal (RULES.md 1.2)', () => {
  it('các điểm có (r+c) chẵn → có chéo', () => {
    const expected: [number, number][] = [
      [0, 0],
      [0, 2],
      [0, 4],
      [1, 1],
      [1, 3],
      [2, 0],
      [2, 2],
      [2, 4],
      [3, 1],
      [3, 3],
      [4, 0],
      [4, 2],
      [4, 4],
    ];
    for (const [r, c] of expected) {
      expect(hasDiagonal(r, c)).toBe(true);
    }
  });

  it('các điểm có (r+c) lẻ → không có chéo', () => {
    const expected: [number, number][] = [
      [0, 1],
      [0, 3],
      [1, 0],
      [1, 2],
      [1, 4],
      [2, 1],
      [2, 3],
      [3, 0],
      [3, 2],
      [3, 4],
      [4, 1],
      [4, 3],
    ];
    for (const [r, c] of expected) {
      expect(hasDiagonal(r, c)).toBe(false);
    }
  });
});
