/**
 * Sinh mã phòng 6 ký tự alphabet không gây nhầm lẫn
 * (bỏ I, O, 0, 1). Tổng 32 ký tự.
 * Tham chiếu: MULTIPLAYER.md mục 6.3.
 */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateRoomCode(rand: () => number = Math.random): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += ALPHABET[Math.floor(rand() * ALPHABET.length)];
  }
  return code;
}

export function isValidRoomCode(code: string): boolean {
  if (code.length !== 6) return false;
  for (const ch of code) {
    if (!ALPHABET.includes(ch)) return false;
  }
  return true;
}

export function generatePlayerToken(rand: () => number = Math.random): string {
  // 16 hex chars
  let s = '';
  for (let i = 0; i < 16; i++) {
    s += Math.floor(rand() * 16).toString(16);
  }
  return s;
}
