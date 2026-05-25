import { describe, it, expect } from 'vitest';
import { createPrng } from '../src/prng.js';

describe('Mulberry32 PRNG', () => {
  it('cùng seed → cùng chuỗi', () => {
    const a = createPrng(42);
    const b = createPrng(42);
    for (let i = 0; i < 100; i++) {
      expect(a.next()).toBe(b.next());
    }
  });

  it('next() trả [0, 1)', () => {
    const p = createPrng(1);
    for (let i = 0; i < 1000; i++) {
      const v = p.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('nextInt(n) trả [0, n)', () => {
    const p = createPrng(7);
    for (let i = 0; i < 1000; i++) {
      const v = p.nextInt(5);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(5);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it('pick() throw khi mảng rỗng', () => {
    const p = createPrng(0);
    expect(() => p.pick([])).toThrow();
  });

  it('pick() trả 1 phần tử của mảng', () => {
    const p = createPrng(0);
    const arr = [1, 2, 3, 4, 5] as const;
    for (let i = 0; i < 50; i++) {
      const v = p.pick(arr);
      expect(arr).toContain(v);
    }
  });
});
