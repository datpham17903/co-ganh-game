/**
 * Mulberry32 — PRNG nhỏ, seedable, deterministic.
 * Dùng cho test reproducible và bot easy randomness.
 *
 * Tham chiếu: https://en.wikipedia.org/wiki/PCG_(pseudorandom_number_generator)#Mulberry32
 */
export interface Prng {
  /** Trả số float trong [0, 1). */
  next(): number;
  /** Trả số nguyên trong [0, max). */
  nextInt(max: number): number;
  /** Lấy 1 phần tử ngẫu nhiên. */
  pick<T>(arr: readonly T[]): T;
}

export function createPrng(seed: number): Prng {
  let s = seed >>> 0;
  const next = (): number => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const nextInt = (max: number): number => Math.floor(next() * max);
  const pick = <T>(arr: readonly T[]): T => {
    if (arr.length === 0) throw new Error('pick from empty array');
    const item = arr[nextInt(arr.length)];
    if (item === undefined) throw new Error('pick out of range');
    return item;
  };
  return { next, nextInt, pick };
}
