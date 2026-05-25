import { describe, it, expect } from 'vitest';
import { generateRoomCode, isValidRoomCode, generatePlayerToken } from '../src/utils/codes.js';

describe('codes', () => {
  it('generateRoomCode trả 6 ký tự alphabet hợp lệ', () => {
    for (let i = 0; i < 100; i++) {
      const code = generateRoomCode();
      expect(code).toHaveLength(6);
      expect(isValidRoomCode(code)).toBe(true);
    }
  });

  it('không chứa I, O, 0, 1', () => {
    for (let i = 0; i < 200; i++) {
      const code = generateRoomCode();
      expect(code).not.toMatch(/[IO01]/);
    }
  });

  it('isValidRoomCode trả false với độ dài sai', () => {
    expect(isValidRoomCode('ABC12')).toBe(false);
    expect(isValidRoomCode('ABCDEFG')).toBe(false);
  });

  it('isValidRoomCode trả false với ký tự cấm', () => {
    expect(isValidRoomCode('ABCD0E')).toBe(false);
    expect(isValidRoomCode('ABCDOE')).toBe(false);
    expect(isValidRoomCode('abcdef')).toBe(false);
  });

  it('generatePlayerToken trả 16 ký tự hex', () => {
    for (let i = 0; i < 50; i++) {
      const t = generatePlayerToken();
      expect(t).toHaveLength(16);
      expect(t).toMatch(/^[0-9a-f]{16}$/);
    }
  });
});
